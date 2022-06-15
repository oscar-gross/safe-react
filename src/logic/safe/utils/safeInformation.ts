import {
  getSafeInfo as fetchSafeInfo,
  // SafeInfo,
  AddressEx,
} from '@gnosis.pm/safe-react-gateway-sdk'
import { getWeb3 } from 'src/logic/wallets/getWeb3'

import { Errors, CodedException } from 'src/logic/exceptions/CodedException'
import { _getChainId } from 'src/config'
import { getInstance } from 'src/logic/contracts/safeContracts'
const GATEWAY_ERROR = /1337|42/

export type SafeInfo = {
  address: AddressEx
  chainId: string
  nonce: number
  threshold: number
  owners: AddressEx[]
  implementation: AddressEx
  modules: AddressEx[] | null
  guard: AddressEx | null
  fallbackHandler: AddressEx
  version: string
  collectiblesTag: string
  txQueuedTag: string
  txHistoryTag: string
}

export const getSafeInfo = async (safeAddress: string): Promise<SafeInfo> => {
  try {
    const chainId = _getChainId()
    if (parseInt(chainId) !== 2008 && parseInt(chainId) !== 2009) return await fetchSafeInfo(chainId, safeAddress)

    const web3 = getWeb3()
    const instance = await getInstance(web3, chainId, safeAddress)

    const ownersList = await instance.methods.getOwners().call()
    const threshold = await instance.methods.getThreshold().call()
    const nonce = await instance.methods.nonce().call()
    const ownersTemp: any = []
    ownersList.forEach((owner) => ownersTemp.push({ value: owner, name: null, logoUri: null }))
    const owners: AddressEx[] = ownersTemp

    return {
      address: { value: safeAddress, name: null, logoUri: null },
      chainId,
      nonce: parseInt(nonce),
      threshold: parseInt(threshold),
      owners,
      implementation: {
        value: '0x9c5ba02C7CCd1F11346E43785202711cE1DCc130',
        name: null,
        logoUri: null,
      },
      modules: null,
      fallbackHandler: {
        value: '0x4f1d7d8B79f11dCc5Ed7f70E7F1D475088f27aaf',
        name: null,
        logoUri: null,
      },
      guard: null,
      version: '1.3.0',
      collectiblesTag: '1654535562',
      txQueuedTag: '1654535562',
      txHistoryTag: '1654114243',
    }
  } catch (e) {
    const safeNotFound = GATEWAY_ERROR.test(e.message)
    throw new CodedException(safeNotFound ? Errors._605 : Errors._613, e.message)
  }
}
