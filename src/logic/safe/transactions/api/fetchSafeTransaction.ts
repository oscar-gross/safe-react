import { getTransactionDetails, TransactionDetails } from '@gnosis.pm/safe-react-gateway-sdk'

import { _getChainId } from 'src/config'

// Cache the request promise to avoid simulateneous requests
// It's cleared as soon as the promise is resolved
const cache = {}

/**
 * @param {string} txId safeTxHash or transaction id from client-gateway
 */
export const fetchSafeTransaction = async (txId: string): Promise<TransactionDetails> => {
  const chainId = _getChainId()
  const cacheKey = `${chainId}_${txId}`
  let promise: Promise<TransactionDetails>
  if (parseInt(chainId) !== 2008 && parseInt(chainId) !== 2009) {
    promise = cache[cacheKey] || getTransactionDetails(chainId, txId)
  } else {
    promise = (async () => {
      const transaction = JSON.parse(localStorage.getItem(`loadTransaction_${chainId}`) as string)
      if (transaction) {
        return transaction?.find((t) => t.txId === txId) ? await transaction.find((t) => t.txId === txId) : await {}
      }
      return {}
    })()
  }
  // cache[cacheKey] || (parseInt(chainId) !== 2008 && parseInt(chainId) !== 2009)
  //   ? getTransactionDetails(chainId, txId)
  //   :
  console.log('promise', promise)
  // Save the promise into cache
  cache[cacheKey] = promise
  // Clear cache when promise finishes
  promise.catch(() => null).then(() => delete cache[cacheKey])
  return promise
}
