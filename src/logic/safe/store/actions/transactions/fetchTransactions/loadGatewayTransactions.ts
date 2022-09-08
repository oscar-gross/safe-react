import { getTransactionHistory, getTransactionQueue } from '@gnosis.pm/safe-react-gateway-sdk'
import { _getChainId } from 'src/config'
import { HistoryGatewayResponse, QueuedGatewayResponse } from 'src/logic/safe/store/models/types/gateway.d'
import { checksumAddress } from 'src/utils/checksumAddress'
import { Errors, CodedException } from 'src/logic/exceptions/CodedException'
import { TransactionListItem } from '@gnosis.pm/safe-react-gateway-sdk'
/*************/
/*  HISTORY  */
/*************/
const historyPointers: { [chainId: string]: { [safeAddress: string]: { next?: string; previous?: string } } } = {}

/**
 * Fetch next page if there is a next pointer for the safeAddress.
 * If the fetch was success, updates the pointers.
 * @param {string} safeAddress
 */
export const loadPagedHistoryTransactions = async (
  safeAddress: string,
): Promise<{ values: HistoryGatewayResponse['results']; next?: string } | undefined> => {
  const chainId = _getChainId()
  // if `historyPointers[safeAddress] is `undefined` it means `loadHistoryTransactions` wasn't called
  // if `historyPointers[safeAddress].next is `null`, it means it reached the last page in gateway-client
  if (!historyPointers[chainId][safeAddress]?.next) {
    throw new CodedException(Errors._608)
  }
  console.log('loadPagedHistoryTransactions')

  try {
    let res
    if (parseInt(chainId) !== 2008 && parseInt(chainId) !== 2009)
      res = await getTransactionHistory(
        chainId,
        checksumAddress(safeAddress),
        historyPointers[chainId][safeAddress].next,
      )
    else res = transactionCreated

    const { results, next, previous } = res
    historyPointers[chainId][safeAddress] = { next, previous }

    return { values: results, next: historyPointers[chainId][safeAddress].next }
  } catch (e) {
    throw new CodedException(Errors._602, e.message)
  }
}

export const loadHistoryTransactions = async (safeAddress: string): Promise<HistoryGatewayResponse['results']> => {
  const chainId = _getChainId()
  console.log('loadHistoryTransactions')
  let res
  try {
    // https://safe-client.gnosis.io/v1/chains/4/safes/0x351c79Ee22710933A3c8229B5A42F8423A2083B3/transactions/history
    if (parseInt(chainId) !== 2008 && parseInt(chainId) !== 2009)
      res = await getTransactionHistory(chainId, checksumAddress(safeAddress))
    else res = transactionCreated

    const { results, next, previous } = res

    if (!historyPointers[chainId]) {
      historyPointers[chainId] = {}
    }

    if (!historyPointers[chainId][safeAddress]) {
      historyPointers[chainId][safeAddress] = { next, previous }
    }

    return results
  } catch (e) {
    throw new CodedException(Errors._602, e.message)
  }
}

const transactionCreated = {
  next: null,
  previous: null,
  results: [
    {
      type: 'DATE_LABEL',
      timestamp: 1653436800000,
    },
    {
      type: 'TRANSACTION',
      transaction: {
        id: 'creation_0x9422Ed1495c14C0FECC5B79231570889Ad300aD2',
        timestamp: 1653511108000,
        txStatus: 'SUCCESS',
        txInfo: {
          type: 'Creation',
          creator: {
            value: '0x32Bc07182D7D797C54873219F3F80e0084c606c4',
          },
          transactionHash: '0x742688394c6ac1209bfd39766f5385e1267e278eb2f682dd73812174733a0565',
          implementation: {
            value: '0x9c5ba02C7CCd1F11346E43785202711cE1DCc130',
          },
          factory: {
            value: '0x23cCC7463468e3C56A4CE37Afab577EB3dd0e3CB',
          },
        },
      },
      conflictType: 'None',
    },
  ],
}

/************/
/*  QUEUED  */
/************/
const queuedPointers: { [chainId: string]: { [safeAddress: string]: { next?: string; previous?: string } } } = {}

/**
 * Fetch next page if there is a next pointer for the safeAddress.
 * If the fetch was success, updates the pointers.
 * @param {string} safeAddress
 */
export const loadPagedQueuedTransactions = async (
  safeAddress: string,
): Promise<{ values: QueuedGatewayResponse['results']; next?: string } | undefined> => {
  const chainId = _getChainId()
  // if `queuedPointers[safeAddress] is `undefined` it means `loadHistoryTransactions` wasn't called
  // if `queuedPointers[safeAddress].next is `null`, it means it reached the last page in gateway-client
  if (!queuedPointers[safeAddress]?.next) {
    throw new CodedException(Errors._608)
  }
  console.log('loadPagedQueuedTransactions', queuedPointers)
  try {
    let res
    if (parseInt(chainId) !== 2008 && parseInt(chainId) !== 2009)
      res = await getTransactionQueue(chainId, checksumAddress(safeAddress), queuedPointers[chainId][safeAddress].next)
    else {
      const results = localStorage.getItem(`loadQueue_${chainId}_${safeAddress}`)
        ? JSON.parse(localStorage.getItem(`loadQueue_${chainId}_${safeAddress}`) as string).filter()
        : []
      results.unshift({
        type: 'LABEL',
        label: 'Next',
      })
      res = {
        next: 'null',
        previous: 'null',
        results,
      }
    }
    const { results, next, previous } = res
    queuedPointers[chainId][safeAddress] = { next, previous }
    console.log('loadPagedQueuedTransactions2', queuedPointers)

    return { values: results, next: queuedPointers[chainId][safeAddress].next }
  } catch (e) {
    throw new CodedException(Errors._603, e.message)
  }
}

export const loadQueuedTransactions = async (safeAddress: string): Promise<QueuedGatewayResponse['results']> => {
  const chainId = _getChainId()
  let res
  console.log('loadQueuedTransactions')

  try {
    if (parseInt(chainId) !== 2008 && parseInt(chainId) !== 2009)
      res = await getTransactionQueue(chainId, checksumAddress(safeAddress))
    else {
      const results = localStorage.getItem(`loadQueue_${chainId}_${safeAddress}`)
        ? JSON.parse(localStorage.getItem(`loadQueue_${chainId}_${safeAddress}`) as string)
        : []
      results.unshift({
        type: 'LABEL',
        label: 'Next',
      })
      res = {
        next: 'null',
        previous: 'null',
        results,
      }
    }

    const { results, next, previous } = res
    if (!queuedPointers[chainId]) {
      queuedPointers[chainId] = {}
    }

    if (!queuedPointers[chainId][safeAddress] || queuedPointers[chainId][safeAddress].next === null) {
      queuedPointers[chainId][safeAddress] = { next, previous }
    }
    console.log('loadQueuedTransactions', queuedPointers, results)

    return results as TransactionListItem[]
  } catch (e) {
    throw new CodedException(Errors._603, e.message)
  }
}
