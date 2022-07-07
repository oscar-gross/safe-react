import { MultisigTransactionRequest, proposeTransaction, TransactionDetails } from '@gnosis.pm/safe-react-gateway-sdk'

import { GnosisSafe } from 'src/types/contracts/gnosis_safe.d'
import { _getChainId } from 'src/config'
import { ReactElement } from 'react'
import { getCurrentSafeVersion } from '../utils/safeVersion'
import { checksumAddress } from 'src/utils/checksumAddress'
import { TxArgs } from '../store/models/types/transaction'
import { generateSafeTxHash } from '../store/actions/transactions/utils/transactionHelpers'
import { getPreValidatedSignatures } from '../safeTxSigner'
import { getSafeSDK } from 'src/logic/wallets/getWeb3'
import { getGnosisSafeInstanceAt } from 'src/logic/contracts/safeContracts'
// import useSafeAddress from 'src/logic/currentSession/hooks/useSafeAddress'
// import { useSelector } from 'react-redux'
// import { currentSafeCurrentVersion } from 'src/logic/safe/store/selectors'
// import { userAccountSelector } from 'src/logic/wallets/store/selectors'
// import { currentChainId } from 'src/logic/config/store/selectors'

type ProposeTxBody = Omit<MultisigTransactionRequest, 'safeTxHash'> & {
  safeInstance: GnosisSafe
  data: string | number[]
}

const calculateBodyFrom = async ({
  safeInstance,
  to,
  value,
  data,
  operation,
  nonce,
  safeTxGas,
  baseGas,
  gasPrice,
  gasToken,
  refundReceiver,
  sender,
  origin,
  signature,
}: ProposeTxBody): Promise<MultisigTransactionRequest> => {
  const safeTxHash = await safeInstance.methods
    .getTransactionHash(to, value, data, operation, safeTxGas, baseGas, gasPrice, gasToken, refundReceiver || '', nonce)
    .call()
  return {
    to: checksumAddress(to),
    value,
    data,
    operation,
    nonce: nonce.toString(),
    safeTxGas: safeTxGas.toString(),
    baseGas: baseGas.toString(),
    gasPrice,
    gasToken,
    refundReceiver,
    safeTxHash,
    sender: checksumAddress(sender),
    origin,
    signature,
  }
}

type SaveTxToHistoryTypes = TxArgs & { origin?: string | null; signature?: string; values?: any }

export const saveTxToHistory = async ({
  baseGas,
  data,
  gasPrice,
  gasToken,
  nonce,
  operation,
  origin,
  refundReceiver,
  safeInstance,
  safeTxGas,
  sender,
  signature,
  to,
  valueInWei,
  values,
}: SaveTxToHistoryTypes): Promise<TransactionDetails> => {
  const chainId = _getChainId()
  const safeAddress = checksumAddress(safeInstance.options.address)

  const body = await calculateBodyFrom({
    safeInstance,
    to,
    value: valueInWei,
    data,
    operation,
    nonce: nonce.toString(),
    safeTxGas,
    baseGas,
    gasPrice,
    gasToken,
    refundReceiver,
    sender,
    origin: origin ? origin : null,
    signature,
  })
  let txDetails
  if (parseInt(chainId) !== 2008 && parseInt(chainId) !== 2009) {
    txDetails = await proposeTransaction(_getChainId(), safeAddress, body)
  } else {
    const safeTxHash = await safeInstance.methods
      .getTransactionHash(
        to,
        valueInWei,
        data,
        operation,
        safeTxGas,
        baseGas,
        gasPrice,
        gasToken,
        refundReceiver || '',
        nonce,
      )
      .call()

    const threshold = await safeInstance.methods.getThreshold().call()
    const owners = await safeInstance.methods.getOwners().call()

    const transLoaded =
      localStorage.getItem(`loadTransaction_${chainId}`) &&
      JSON.parse(localStorage.getItem(`loadTransaction__${chainId}`) as string)
    const transactionFound =
      transLoaded &&
      transLoaded.lenght > 0 &&
      transLoaded.find((t) => t.txId == `multisig_${safeAddress}_${safeTxHash}`)

    const verifySigsLocal = (transactionFound, owner) => {
      return transactionFound && transactionFound.detailedExecutionInfo.confirmations.lenght > 0
        ? transactionFound.detailedExecutionInfo.confirmations
            .map((sig) => sig.signer.value === owner && sig.signature)
            .find((trueSig) => trueSig)
        : ''
    }
    console.log('saveTxToHistory', safeAddress, safeTxHash)

    const sigs: Array<Record<string, unknown>> = []
    owners.map((owner) => {
      sigs.push({
        owner: owner,
        sig:
          owner === sender
            ? signature
              ? `0x${signature}`
              : verifySigsLocal(transactionFound, owner)
            : verifySigsLocal(transactionFound, owner),
      })
    })

    const val = {
      ownerTransaction: sender,
      threshold: String(threshold),
      newThreshold: String(values?.newThreshold) || String(threshold),
      nonceTransaction: nonce,
      ownerAdded: values?.ownerAdded || undefined,
      ownerRemoved: values?.ownerRemoved || undefined,
      method: values?.method || '',
      sigs,
      data,
      type: values?.type || '',
      recipient: values?.to,
      amount: values.valueInWei,
      token: 'NATIVE_COIN',
    }
    console.log('saveTxToHistoryValue', val)

    txDetails = await saveTxLocal({ values: val })
  }
  console.log('saveTxToHistoryEnd', txDetails)

  return txDetails
}

export const saveTxLocal = async ({ values }): Promise<ReactElement> => {
  // const safeVersion = useSelector(currentSafeCurrentVersion)
  // const currentOwner = useSelector(userAccountSelector)
  // const chainId = useSelector(currentChainId)
  // const { safeAddress } = useSafeAddress()
  const safeVersion = await getCurrentSafeVersion(values.safeInstance)
  const currentOwner = values.ownerTransaction
  const chainId = _getChainId()
  const safeAddress = values.safeAddress

  const sdk = await getSafeSDK(currentOwner, safeAddress, safeVersion)
  const parameters: Array<Record<string, unknown>> = []
  let data
  const settingsInfo = { type: values.type }
  const missingSigners: Array<Record<string, unknown>> = []
  const signers: Array<Record<string, unknown>> = []
  const confirmations: Array<Record<string, unknown>> = []

  values.sigs.map((sig) => {
    !sig.sig && missingSigners.push({ value: sig.owner })
    signers.push({ value: sig.owner })
    sig.sig &&
      confirmations.push({
        signer: {
          value: sig.owner,
        },
        signature: `0x${sig.sig}`,
        submittedAt: 1656797410454,
      })
  })

  const executionInfo = {
    type: 'MULTISIG',
    nonce: parseInt(values.nonceTransaction),
    confirmationsRequired: parseInt(values.threshold),
    confirmationsSubmitted: values.sigs.filter((sig) => sig.sig).length,
    missingSigners,
  }

  if (values.ownerRemoved && values.ownerAdded) {
    data = await sdk.ownerManager.encodeSwapOwnerData(values.ownerRemoved, values.ownerAdded)
    parameters.push(
      {
        name: 'prevOwner',
        type: 'address',
        value: '0x0000000000000000000000000000000000000001',
      },
      {
        name: 'oldOwner',
        type: 'address',
        value: values.ownerRemoved,
      },
      {
        name: 'newOwner',
        type: 'address',
        value: values.ownerAdded,
      },
    )
    Object.assign(settingsInfo, { oldOwner: { value: values.ownerRemoved }, newOwner: { value: values.ownerAdded } })
  } else if (!values.ownerRemoved && !values.ownerAdded) {
    data = await sdk.ownerManager.encodeChangeThresholdData(parseInt(values.newThreshold))
    parameters.push({
      name: '_threshold',
      type: 'uint256',
      value: values.newThreshold,
    })
    Object.assign(settingsInfo, { threshold: parseInt(values.newThreshold) })
  } else if (!values.ownerRemoved && values.ownerAdded) {
    data = await sdk.ownerManager.encodeAddOwnerWithThresholdData(values.ownerAdded, parseInt(values.newThreshold))
    parameters.push(
      {
        name: 'owner',
        type: 'address',
        value: values.ownerAdded,
      },
      {
        name: '_threshold',
        type: 'uint256',
        value: values.newThreshold,
      },
    )
    Object.assign(settingsInfo, { owner: { value: values.ownerAdded }, threshold: parseInt(values.newThreshold) })
  } else if (values.ownerRemoved && !values.ownerAdded) {
    data = await sdk.ownerManager.encodeRemoveOwnerData(values.ownerRemoved, parseInt(values.newThreshold))
    parameters.push(
      {
        name: 'prevOwner',
        type: 'address',
        value: '0x0000000000000000000000000000000000000001',
      },
      {
        name: 'owner',
        type: 'address',
        value: values.ownerRemoved,
      },
      {
        name: '_threshold',
        type: 'uint256',
        value: values.newThreshold,
      },
    )
    Object.assign(settingsInfo, { owner: { value: values.ownerRemoved }, threshold: parseInt(values.newThreshold) })
  }

  const sigs = getPreValidatedSignatures(currentOwner)

  const safeTxHash = await generateSafeTxHash(safeAddress, safeVersion, {
    baseGas: '0',
    data,
    gasPrice: '0',
    gasToken: '0x0000000000000000000000000000000000000000',
    nonce: parseInt(values.nonceTransaction),
    operation: 0,
    refundReceiver: '0x0000000000000000000000000000000000000000',
    safeInstance: getGnosisSafeInstanceAt(safeAddress, safeVersion),
    safeTxGas: '0',
    sender: currentOwner,
    sigs,
    to: safeAddress,
    valueInWei: '0',
  })

  const transaction = {
    safeAddress: safeAddress,
    txId: `multisig_${safeAddress}_${safeTxHash}`,
    executedAt: null,
    txStatus: 'AWAITING_CONFIRMATIONS',
    txInfo: {
      type: 'SettingsChange',
      dataDecoded: {
        method: values.method,
        parameters,
      },
      settingsInfo,
    },
    txData: {
      hexData: data,
      dataDecoded: {
        method: values.method,
        parameters,
      },
      to: {
        value: safeAddress,
      },
      value: '0',
      operation: 0,
    },
    detailedExecutionInfo: {
      type: 'MULTISIG',
      submittedAt: 1656796493734,
      nonce: parseInt(values.nonceTransaction),
      safeTxGas: '0',
      baseGas: '0',
      gasPrice: '0',
      gasToken: '0x0000000000000000000000000000000000000000',
      refundReceiver: {
        value: '0x0000000000000000000000000000000000000000',
      },
      safeTxHash,
      executor: null,
      signers,
      confirmationsRequired: parseInt(values.threshold),
      confirmations,
    },
    txHash: null,
  }

  const queue = {
    type: 'TRANSACTION',
    transaction: {
      id: transaction.txId,
      timestamp: 1656292800534,
      txStatus: 'AWAITING_CONFIRMATIONS',
      txInfo: {
        type: 'SettingsChange',
        dataDecoded: {
          method: values.method,
          parameters,
        },
        settingsInfo,
      },
      executionInfo,
    },
    conflictType: 'None',
  }

  auxSetLocal(transaction, 'Transaction', chainId)
  auxSetLocal(queue, 'Queue', chainId)
  return transaction as any
}

const auxSetLocal = (newValue: any, str: string, chainId: string): void => {
  let newList: Array<Record<string, unknown>> = []
  const transLoaded =
    localStorage.getItem(`load${str}_${chainId}`) && JSON.parse(localStorage.getItem(`load${str}_${chainId}`) as string)
  newList = transLoaded && transLoaded.lenght > 0 && transLoaded.filter((t) => t.txId !== newValue.txId)
  newList.push(newValue)
  localStorage.setItem(`load${str}_${chainId}`, JSON.stringify(newList))
}
