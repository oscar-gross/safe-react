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

  try {
    const aa = await getTransactionHistory(
      chainId,
      checksumAddress(safeAddress),
      historyPointers[chainId][safeAddress].next,
    )
    const { results, next, previous } = aa
    historyPointers[chainId][safeAddress] = { next, previous }

    return { values: results, next: historyPointers[chainId][safeAddress].next }
  } catch (e) {
    throw new CodedException(Errors._602, e.message)
  }
}

export const loadHistoryTransactions = async (safeAddress: string): Promise<HistoryGatewayResponse['results']> => {
  const chainId = _getChainId()
  let res
  try {
    // https://safe-client.gnosis.io/v1/chains/4/safes/0x351c79Ee22710933A3c8229B5A42F8423A2083B3/transactions/history
    if (parseInt(chainId) !== 2008 && parseInt(chainId) !== 2009)
      res = await getTransactionHistory(chainId, checksumAddress(safeAddress))
    else
      res = {
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
              id: 'creation_0xa21c4C3F18f16AFB938760fcAc7b43B696333376',
              timestamp: 1653511108000,
              txStatus: 'SUCCESS',
              txInfo: {
                type: 'Creation',
                creator: {
                  value: '0x32Bc07182D7D797C54873219F3F80e0084c606c4',
                },
                transactionHash: '0x11d190dd40432040b1ae97929bf2f37d383b5cd2ff10318d8dee48341959588d',
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

  try {
    const aa = await getTransactionQueue(
      chainId,
      checksumAddress(safeAddress),
      queuedPointers[chainId][safeAddress].next,
    )
    const { results, next, previous } = aa
    queuedPointers[chainId][safeAddress] = { next, previous }

    return { values: results, next: queuedPointers[chainId][safeAddress].next }
  } catch (e) {
    throw new CodedException(Errors._603, e.message)
  }
}

export const loadQueuedTransactions = async (safeAddress: string): Promise<QueuedGatewayResponse['results']> => {
  const chainId = _getChainId()
  let res
  //  if (parseInt(chainId) !== 2008 && parseInt(chainId) !== 2009)
  //     res = await getTransactionQueue(chainId, checksumAddress(safeAddress))
  //   else {
  //     let results: Array<Object> = [{ type: 'LABEL', label: 'Next' }]
  //     // results.push(data)
  //     res = { next: null, previous: null, results }
  //   }
  try {
    if (parseInt(chainId) !== 2008 && parseInt(chainId) !== 2009)
      res = await getTransactionQueue(chainId, checksumAddress(safeAddress))
    else {
      const results = localStorage.getItem(`loadQueue${chainId}`)
        ? (JSON.parse(localStorage.getItem(`loadQueue${chainId}`) as string) as TransactionListItem[])
        : ([] as TransactionListItem[])

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

    return results as TransactionListItem[]
  } catch (e) {
    throw new CodedException(Errors._603, e.message)
  }
}
