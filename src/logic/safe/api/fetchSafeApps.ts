import { getSafeApps, SafeAppData } from '@gnosis.pm/safe-react-gateway-sdk'

import { _getChainId } from 'src/config'

export const fetchSafeAppsList = async (): Promise<SafeAppData[]> => {
  const chainId = _getChainId()
  if (parseInt(chainId) !== 2008 && parseInt(chainId) !== 2009)
    return await getSafeApps(_getChainId(), {
      client_url: window.location.origin,
    })
  console.log('getSafeApps')
  return []
}
