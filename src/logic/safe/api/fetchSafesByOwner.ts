import { getOwnedSafes } from '@gnosis.pm/safe-react-gateway-sdk'

import { _getChainId } from 'src/config'
import { checksumAddress } from 'src/utils/checksumAddress'

export const fetchSafesByOwner = async (ownerAddress: string): Promise<string[]> => {
  const chainId = _getChainId()
  if (parseInt(chainId) !== 2008 && parseInt(chainId) !== 2009)
    return getOwnedSafes(_getChainId(), checksumAddress(ownerAddress)).then(({ safes }) => safes)
  return []
}
