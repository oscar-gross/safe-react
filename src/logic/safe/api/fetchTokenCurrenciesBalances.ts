import { getBalances, SafeBalanceResponse, TokenInfo, TokenType } from '@gnosis.pm/safe-react-gateway-sdk'
import { _getChainId } from 'src/config'
import { checksumAddress } from 'src/utils/checksumAddress'

export type TokenBalance = {
  tokenInfo: TokenInfo
  balance: string
  fiatBalance: string
  fiatConversion: string
}

type FetchTokenCurrenciesBalancesProps = {
  safeAddress: string
  selectedCurrency: string
  excludeSpamTokens?: boolean
  trustedTokens?: boolean
}

export const fetchTokenCurrenciesBalances = async ({
  safeAddress,
  selectedCurrency,
  excludeSpamTokens = true,
  trustedTokens = false,
}: FetchTokenCurrenciesBalancesProps): Promise<SafeBalanceResponse> => {
  const address = checksumAddress(safeAddress)
  const chainId = parseInt(_getChainId())

  // https://safe-client.staging.gnosisdev.com/v1/chains/4/safes/0x351c79Ee22710933A3c8229B5A42F8423A2083B3/balances/USD
  if (chainId !== 2008 && chainId !== 2009)
    return getBalances(_getChainId(), address, selectedCurrency, {
      exclude_spam: excludeSpamTokens,
      trusted: trustedTokens,
    })

  const result = {
    fiatTotal: '0',
    items: [
      {
        tokenInfo: {
          type: 'NATIVE_TOKEN' as TokenType,
          address: '0x0000000000000000000000000000000000000000',
          decimals: 18,
          symbol: 'CWN',
          name: 'CloudWalk Native Token',
          logoUri: null,
        },
        balance: '0',
        fiatBalance: '0.00000',
        fiatConversion: '0.00000',
      },
    ],
  }

  // console.log('getBalances', result, address, selectedCurrency, {
  //   exclude_spam: excludeSpamTokens,
  //   trusted: trustedTokens,
  // })
  return result
}
