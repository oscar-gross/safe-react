import { getBalances, SafeBalanceResponse, TokenInfo, TokenType } from '@gnosis.pm/safe-react-gateway-sdk'
import { _getChainId } from 'src/config'
import { checksumAddress } from 'src/utils/checksumAddress'
import { parseCallApiCW } from 'src/config'
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

  if (chainId !== 2008 && chainId !== 2009) {
    return await getBalances(_getChainId(), address, selectedCurrency, {
      exclude_spam: excludeSpamTokens,
      trusted: trustedTokens,
    })
  }
  // https://explorer.testnet.cloudwalk.io/api?module=account&action=tokenlist&address=0x0d54bB74Ab05301f7D0967341E8d430Be09152c4
  const { result } = await parseCallApiCW({ address })

  const items: Array<any> = []

  if (result.length > 0) {
    result.map((res) => {
      items.push({
        tokenInfo: {
          type:
            res.contractAddress == '0x0000000000000000000000000000000000000000'
              ? ('NATIVE_TOKEN' as TokenType)
              : ('ERC20' as TokenType),
          address: res.contractAddress,
          decimals: parseInt(res.decimals),
          symbol: res.symbol,
          name: res.name,
          logoUri: null,
        },
        balance: res.balance,
        fiatBalance: String(Number(res.balance) / Math.pow(10, parseInt(res.decimals))),
        fiatConversion: '1',
      })
    })
  } else
    items.push({
      tokenInfo: {
        type: 'ERC20' as TokenType,
        address: '0xC6d1eFd908ef6B69dA0749600F553923C465c812',
        decimals: 18,
        symbol: 'BRLC',
        name: 'BRL Coin',
        logoUri: null,
      },
      balance: '0',
      fiatBalance: '0',
      fiatConversion: '1',
    })

  return {
    fiatTotal: String(items.map((item) => parseFloat(item.fiatBalance)).reduce((i, j) => i + j)),
    items,
  }
}
