import { Transaction, TransactionReceipt, Log, EventLog } from 'web3-core'
import { getWeb3ReadOnly } from 'src/logic/wallets/getWeb3'
import { sameAddress } from 'src/logic/wallets/ethAddresses'
import { sameString } from 'src/utils/strings'
import { CodedException, Errors } from 'src/logic/exceptions/CodedException'
import { hexToNumber } from 'web3-utils'
import { providerAsync } from '../utils/modules'

type TxMonitorProps = {
  sender: string
  hash: string
  data: string
  nonce?: number
  gasPrice?: string
}

type TxReceipt = {
  blockHash: string
  blockNumber: string
  contractAddress?: string
  cumulativeGasUsed: string
  from: string
  gasUsed: string
  status: string
  to: string
  transactionHash: string
  transactionIndex: string
  effectiveGasPrice?: string
  logs: Log[]
  logsBloom: string
  events?: {
    [eventName: string]: EventLog
  }
}

type TxMonitorOptions = {
  delay?: number
  maxRetries?: number
}

const MAX_RETRIES = 5
const DEFAULT_DELAY = 5000

async function findSpeedupTx({ sender, hash, nonce, data }: TxMonitorProps): Promise<Transaction | undefined> {
  const web3 = getWeb3ReadOnly()
  const latestBlock = await web3.eth.getBlock('latest', true)

  const replacementTransaction = latestBlock.transactions.find((transaction) => {
    // TODO: use gasPrice, timestamp or another better way to differentiate
    return (
      sameAddress(transaction.from, sender) &&
      transaction.nonce === nonce &&
      !sameString(transaction.hash, hash) &&
      // if `data` differs, then it's a replacement tx, not a speedup
      sameString(transaction.input, data)
    )
  })

  return replacementTransaction
}

/**
 * Recursively inspects a pending tx. Until it's found, and returns the mined tx receipt
 *
 * @param {object} txParams
 * @param {string} txParams.sender
 * @param {string} txParams.hash
 * @param {string} txParams.data
 * @param {number | undefined} txParams.nonce
 * @param {string | undefined} txParams.gasPrice
 * @param {object} options
 * @param {number} options.delay
 * @returns {Promise<TransactionReceipt>}
 */

export const txMonitor = (
  { sender, hash, data, nonce, gasPrice }: TxMonitorProps,
  options?: TxMonitorOptions,
  tries = 0,
): Promise<TransactionReceipt> => {
  // const web3 = getWeb3ReadOnly()
  return new Promise<TransactionReceipt>((resolve, reject) => {
    const { maxRetries = MAX_RETRIES } = options || {}
    if (tries > maxRetries) {
      reject(new CodedException(Errors._805, 'max retries reached'))
      return
    }

    const monitorFn = async (): Promise<unknown> => {
      // Case 1: this block is accessed for the first time, no nonce
      if (nonce == null || gasPrice == null) {
        let params: TxMonitorProps = { sender, hash, data }
        try {
          // Find the nonce for the current tx
          // const transaction = await web3.eth.getTransaction(hash)
          const transaction = await providerAsync({
            hash,
            tries,
            method: 'eth_getTransactionByHash',
          })
            .then((res) => res)
            .catch((e) => e)

          if (transaction) {
            params = {
              ...params,
              nonce: hexToNumber(transaction.nonce),
              gasPrice: `${hexToNumber(transaction.gasPrice)}`,
            }
          }
        } catch (e) {
          // ignore error
        }
        return txMonitor(params, options, tries + 1)
          .then(resolve)
          .catch(reject)
      }

      // Case 2: the nonce exists, try to get the receipt for the original tx
      try {
        // const firstTxReceipt = await web3.eth.getTransactionReceipt(hash)
        const firstTxReceipt: TxReceipt = await providerAsync({
          hash,
          tries,
          method: 'eth_getTransactionReceipt',
        })
          .then((res) => res)
          .catch((e) => e)

        if (firstTxReceipt) {
          const firstTxReceiptParsed = Object.assign({
            ...firstTxReceipt,
            status: firstTxReceipt.status ? (hexToNumber(firstTxReceipt.status) === 1 ? true : false) : true,
            blockNumber: hexToNumber(firstTxReceipt?.blockNumber),
            cumulativeGasUsed: hexToNumber(firstTxReceipt?.cumulativeGasUsed),

            gasUsed: hexToNumber(firstTxReceipt?.gasUsed),
            transactionIndex: hexToNumber(firstTxReceipt?.transactionIndex),
          })
          firstTxReceipt?.effectiveGasPrice &&
            Object.assign(firstTxReceiptParsed, { effectiveGasPrice: hexToNumber(firstTxReceipt?.effectiveGasPrice) })

          return resolve(firstTxReceiptParsed)
        }
      } catch (e) {
        // proceed to case 3
      }

      // Case 3: original tx not found, try to find a sped-up tx
      try {
        const replacementTx = await findSpeedupTx({ sender, hash, nonce, data })

        if (replacementTx) {
          // const replacementReceipt = await web3.eth.getTransactionReceipt(replacementTx.hash)
          const replacementReceipt: TxReceipt = await providerAsync({
            hash: replacementTx.hash,
            tries,
            method: 'eth_getTransactionReceipt',
          })
            .then((res) => res)
            .catch((e) => e)

          // goal achieved
          if (replacementReceipt) {
            const replacementReceiptParsed = Object.assign({
              ...replacementReceipt,
              status: replacementReceipt.status ? (hexToNumber(replacementReceipt.status) === 1 ? true : false) : true,
              blockNumber: hexToNumber(replacementReceipt?.blockNumber),
              cumulativeGasUsed: hexToNumber(replacementReceipt?.cumulativeGasUsed),
              gasUsed: hexToNumber(replacementReceipt?.gasUsed),
              transactionIndex: hexToNumber(replacementReceipt?.transactionIndex),
            })
            replacementReceipt?.effectiveGasPrice &&
              Object.assign(replacementReceiptParsed, {
                effectiveGasPrice: hexToNumber(replacementReceipt?.effectiveGasPrice),
              })

            return resolve(replacementReceiptParsed)
          }

          // tx exists but no receipt yet, it's pending
          return txMonitor(
            {
              sender,
              nonce,
              hash: replacementTx.hash,
              data: replacementTx.input,
              gasPrice: replacementTx.gasPrice,
            },
            options,
            tries + 1,
          )
            .then(resolve)
            .catch(reject)
        }
      } catch (e) {
        // ignore error
      }

      // Neither the original nor a replacement transactions were found, try again
      txMonitor({ sender, hash, data, nonce, gasPrice }, options, tries + 1)
        .then(resolve)
        .catch(reject)
    }

    setTimeout(monitorFn, options?.delay ?? DEFAULT_DELAY)
  })
}
