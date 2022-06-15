import { getCollectibles, SafeCollectibleResponse } from '@gnosis.pm/safe-react-gateway-sdk'
import { _getChainId } from 'src/config'
import { checksumAddress } from 'src/utils/checksumAddress'

export const fetchSafeCollectibles = async (safeAddress: string): Promise<SafeCollectibleResponse[]> => {
  const chainId = _getChainId()
  if (parseInt(chainId) !== 2008 && parseInt(chainId) !== 2009)
    return await getCollectibles(chainId, checksumAddress(safeAddress))
  return []
}
