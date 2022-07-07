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

  const promise: Promise<TransactionDetails> =
    cache[cacheKey] || (parseInt(chainId) !== 2008 && parseInt(chainId) !== 2009)
      ? getTransactionDetails(chainId, txId)
      : (async () => {
          const transactions = localStorage.getItem(`loadTransaction_${chainId}`)
            ? JSON.parse(localStorage.getItem(`loadTransaction_${chainId}`) as string)
            : {}
          return (await (transactions && transactions.lenght > 0))
            ? transactions.find((t) => t.txId === txId)
            : {
                code: 1337,
                message: '{"detail":"Not found."}',
              }
        })()

  // Save the promise into cache
  cache[cacheKey] = promise
  // Clear cache when promise finishes
  promise.catch(() => null).then(() => delete cache[cacheKey])
  return promise
}
