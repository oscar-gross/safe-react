import {
  postSafeGasEstimation,
  SafeTransactionEstimationRequest,
  SafeTransactionEstimation,
  Operation,
} from '@gnosis.pm/safe-react-gateway-sdk'
import { getWeb3 } from 'src/logic/wallets/getWeb3'
import { getInstance } from 'src/logic/contracts/safeContracts'

import { _getChainId } from 'src/config'
import { checksumAddress } from 'src/utils/checksumAddress'

type FetchSafeTxGasEstimationProps = {
  safeAddress: string
} & SafeTransactionEstimationRequest

export const fetchSafeTxGasEstimation = async ({
  safeAddress,
  ...body
}: FetchSafeTxGasEstimationProps): Promise<SafeTransactionEstimation> => {
  const chainId = _getChainId()
  if (parseInt(chainId) !== 2008 && parseInt(chainId) !== 2009)
    return await postSafeGasEstimation(_getChainId(), checksumAddress(safeAddress), body)
  const web3 = getWeb3()
  const instance = await getInstance(web3, chainId, safeAddress)
  const nonce = await instance.methods.nonce().call()
  const queueLoaded = localStorage?.getItem(`loadQueue_${chainId}_${safeAddress}`)
  const majorNonce =
    queueLoaded &&
    JSON.parse(queueLoaded)
      .map((a) => a?.transaction?.executionInfo?.nonce && a?.transaction?.executionInfo?.nonce)
      .sort(function (a, b) {
        return b - a
      })[0]

  return {
    currentNonce: parseInt(nonce),
    recommendedNonce: majorNonce ? parseInt(majorNonce) + 1 : parseInt(nonce),
    safeTxGas: '500000',
  }
}

export const getRecommendedNonce = async (safeAddress: string): Promise<number> => {
  const { recommendedNonce } = await fetchSafeTxGasEstimation({
    safeAddress,
    value: '0',
    operation: Operation.CALL,
    // Workaround: use a cancellation transaction to fetch only the recommendedNonce
    to: safeAddress,
    data: '0x',
  })
  return recommendedNonce
}
