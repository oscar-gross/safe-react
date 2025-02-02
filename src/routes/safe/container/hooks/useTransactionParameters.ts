import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { toWei } from 'web3-utils'

import { getUserNonce } from 'src/logic/wallets/ethTransactions'
import { userAccountSelector } from 'src/logic/wallets/store/selectors'
import { ParametersStatus } from 'src/routes/safe/components/Transactions/helpers/utils'
import { getRecommendedNonce } from 'src/logic/safe/api/fetchSafeTxGasEstimation'
import { Errors, logError } from 'src/logic/exceptions/CodedException'
import useSafeAddress from 'src/logic/currentSession/hooks/useSafeAddress'

export type TxParameters = {
  safeNonce?: string
  setSafeNonce: (safeNonce?: string) => void
  safeTxGas?: string
  setSafeTxGas: (gas?: string) => void
  ethNonce?: string
  setEthNonce: (ethNonce?: string) => void
  ethGasLimit?: string
  setEthGasLimit: (ethGasLimit?: string) => void
  ethGasPrice?: string
  setEthGasPrice: (ethGasPrice?: string) => void
  ethMaxPrioFee?: string
  setEthMaxPrioFee: (maxPrioFee?: string) => void
  ethGasPriceInGWei?: string
  ethMaxPrioFeeInGWei?: string
}

type Props = {
  parametersStatus?: ParametersStatus
  initialSafeNonce?: string
  initialSafeTxGas?: string
  initialEthGasLimit?: string
  initialEthGasPrice?: string
  initialEthMaxPrioFee?: string
}

export const useTransactionParameters = (props?: Props): TxParameters => {
  const connectedWalletAddress = useSelector(userAccountSelector)
  const { safeAddress } = useSafeAddress()

  const [safeNonce, setSafeNonce] = useState<string | undefined>(props?.initialSafeNonce)
  const [safeTxGas, setSafeTxGas] = useState<string | undefined>(props?.initialSafeTxGas)

  const [ethNonce, setEthNonce] = useState<string | undefined>()
  const [ethGasLimit, setEthGasLimit] = useState<string | undefined>(props?.initialEthGasLimit)
  const [ethGasPrice, setEthGasPrice] = useState<string | undefined>(props?.initialEthGasPrice)
  const [ethGasPriceInGWei, setEthGasPriceInGWei] = useState<string>()
  const [ethMaxPrioFee, setEthMaxPrioFee] = useState<string>()
  const [ethMaxPrioFeeInGWei, setEthMaxPrioFeeInGWei] = useState<string>()

  useEffect(() => {
    const getNonce = async () => {
      const res = await getUserNonce(connectedWalletAddress)
      setEthNonce(res.toString())
    }

    if (connectedWalletAddress) {
      getNonce()
    }
  }, [connectedWalletAddress])

  useEffect(() => {
    if (!ethGasPrice) {
      setEthGasPriceInGWei(undefined)
      return
    }
    setEthGasPriceInGWei(toWei(ethGasPrice, 'Gwei'))
  }, [ethGasPrice])

  useEffect(() => {
    if (!ethMaxPrioFee) {
      setEthMaxPrioFee(undefined)
      return
    }
    setEthMaxPrioFeeInGWei(toWei(ethMaxPrioFee, 'Gwei'))
  }, [ethMaxPrioFee])

  useEffect(() => {
    const getSafeNonce = async () => {
      if (safeAddress) {
        try {
          const recommendedNonce = (await getRecommendedNonce(safeAddress)).toString()
          setSafeNonce(recommendedNonce)
        } catch (e) {
          logError(Errors._616, e.message)
        }
      }
    }

    if (!safeNonce) {
      getSafeNonce()
    }
  }, [safeAddress, safeNonce])

  return {
    safeNonce,
    setSafeNonce,
    safeTxGas,
    setSafeTxGas,
    ethNonce,
    setEthNonce,
    ethGasLimit,
    setEthGasLimit,
    ethGasPrice,
    setEthGasPrice,
    ethMaxPrioFee,
    setEthMaxPrioFee,
    ethGasPriceInGWei,
    ethMaxPrioFeeInGWei,
  }
}
