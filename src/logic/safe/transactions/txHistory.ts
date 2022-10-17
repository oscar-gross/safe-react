import { MultisigTransactionRequest, proposeTransaction, TransactionDetails } from '@gnosis.pm/safe-react-gateway-sdk'
import { Dispatch } from 'redux'
import { parseCallApiCW } from 'src/config'
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
import fetchTransactions from '../store/actions/transactions/fetchTransactions'

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

type SaveTxToHistoryTypes = TxArgs & { origin?: string | null; signature?: string; values?: any; dispatch: Dispatch }

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
  dispatch,
}: SaveTxToHistoryTypes): Promise<TransactionDetails> => {
  const chainId = _getChainId()
  const safeAddress = checksumAddress(safeInstance.options.address)
  // const { values } = txProps
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
    const queueStored = verifyQueueStored({ txId: `multisig_${safeAddress}_${body.safeTxHash}`, chainId, safeAddress })
    if (queueStored)
      txDetails = await processTransactionQueue({ queueStored, sender, signature, chainId, dispatch, txHash: null })
    else {
      const safeVersion = await getCurrentSafeVersion(safeInstance)
      const threshold = await safeInstance.methods.getThreshold().call()
      const owners = await safeInstance.methods.getOwners().call()

      const transLoaded =
        localStorage.getItem(`loadTransaction_${chainId}`) &&
        JSON.parse(localStorage.getItem(`loadTransaction_${chainId}`) as string)
      const transactionFound =
        transLoaded &&
        transLoaded.length > 0 &&
        transLoaded.find((t) => t.txId == `multisig_${safeAddress}_${body.safeTxHash}`)

      const verifySigsLocal = (transactionFound, owner) => {
        return transactionFound && transactionFound.detailedExecutionInfo.confirmations.length > 0
          ? transactionFound.detailedExecutionInfo.confirmations
              .map((sig) => sig.signer.value === owner && sig.signature)
              .find((trueSig) => trueSig)
          : ''
      }

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
        safeAddress,
        safeVersion,
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
        amount: values?.valueInWei,
        token: 'NATIVE_COIN',
      }

      txDetails = await saveTxLocal({ values: val, dispatch })
    }
  }
  return txDetails
}

export const saveTxLocal = async ({ values, dispatch }): Promise<ReactElement> => {
  const currentOwner = values.ownerTransaction
  const chainId = _getChainId()
  const sdk = await getSafeSDK(currentOwner, values.safeAddress, values.safeVersion)
  const parameters: Array<Record<string, unknown>> = []
  let data
  const settingsInfo = { type: values.type }
  const { confirmations, missingSigners, signers } = sigsInfo(values.sigs)


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
  const safeTxHash = await generateSafeTxHash(values.safeAddress, values.safeVersion, {
    baseGas: '0',
    data,
    gasPrice: '0',
    gasToken: '0x0000000000000000000000000000000000000000',
    nonce: parseInt(values.nonceTransaction),
    operation: 0,
    refundReceiver: '0x0000000000000000000000000000000000000000',
    safeInstance: getGnosisSafeInstanceAt(values.safeAddress, values.safeVersion),
    safeTxGas: '0',
    sender: currentOwner,
    sigs,
    to: values.safeAddress,
    valueInWei: '0',
  })

  const transaction = {
    safeAddress: values.safeAddress,
    txId: `multisig_${values.safeAddress}_${safeTxHash}`,
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
        value: values.safeAddress,
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
  await auxSetLocal({ transaction, queue, chainId })
  dispatch(fetchTransactions(chainId, values.safeAddress))

  return transaction as any
}

export const getHistoryParsed = async ({ txHash }) => {
  const txInfo = await parseCallApiCW({ txHash }) //axios.get(`https://explorer.testnet.cloudwalk.io/api?module=transaction&action=gettxinfo&txhash=${txHash}`)
  const aa = {
    type: 'TRANSACTION',
    transaction: {
      // id: 'multisig_0x0F7e657e287E35e921885980370bd44aDbf2dd59_0xa798ed07acc8476028ecac012db2db2965e634744f96764d1bae3126ca04c5a3',
      timestamp: 1658166445000,
      txStatus: 'SUCCESS',
      txInfo: {
        type: 'SettingsChange',
        dataDecoded: {
          method: 'removeOwner',
          parameters: [
            {
              name: 'prevOwner',
              type: 'address',
              value: '0x0000000000000000000000000000000000000001',
            },
            {
              name: 'owner',
              type: 'address',
              value: '0xF05E609bEd053e54d1B0A9c1eAE18B3C806ac4a7',
            },
            {
              name: '_threshold',
              type: 'uint256',
              value: '2',
            },
          ],
        },
        settingsInfo: {
          type: 'REMOVE_OWNER',
          owner: {
            value: '0xF05E609bEd053e54d1B0A9c1eAE18B3C806ac4a7',
          },
          threshold: 2,
        },
      },
      executionInfo: {
        type: 'MULTISIG',
        nonce: 13,
        confirmationsRequired: 3,
        confirmationsSubmitted: 3,
      },
    },
    conflictType: 'None',
  }
}

export const filterTxHistory = async ({ address }) => {
  const txInfo = await parseCallApiCW({ address })
  // const txInfo = await axios.get(`https://explorer.testnet.cloudwalk.io/api?module=account&action=txlist&address=${address}`)
  const txs = txInfo?.result && txInfo?.result.tx
  const arr: any = []
  if (txs && txs.length > 0) {
    txs.map((tx) => {
      let history
      if (tx.input.includes('694e80c30000')) {
        history.method = 'changeThreshold'
        history.type = 'CHANGE_THRESHOLD'
      } else if (tx.input.includes('e318b52b0000')) {
        history.method = 'swapOwner'
        history.type = 'SWAP_OWNER'
      } else if (tx.input.includes('0d582f130000')) {
        history.method = 'addOwnerWithThreshold'
        history.type = 'ADD_OWNER'
      } else if (tx.input.includes('f8dc5dd90000')) {
        history.method = 'removeOwner'
        history.type = 'REMOVE_OWNER'
      }
      // //Send funds
      //       else if (tx.input.includes('')) {
      //         history.method = "OUTGOING"
      //         history.type = "Transfer"
      //       }
      // // Send NFT
      //       else if (tx.input.includes('')) {
      //         history.method = "OUTGOINGNFT"
      //         history.type = "Transfer"
      //       }
      history.nonce = Number(tx.nonce)
      history.txStatus = tx?.isError === '0' ? 'SUCCESS' : 'ERROR'
      history.hash = tx.hash
      arr.push(history)
    })
    return arr
  } else {
    return []
  }
}

const processTransactionQueue = async ({ queueStored, sender, signature, chainId, dispatch, txHash }) => {
  const verifySigsLocal = (transaction, owner) => {
    return transaction.detailedExecutionInfo.confirmations.length > 0
      ? transaction.detailedExecutionInfo.confirmations
          .map((sig) => sig.signer.value === owner && sig.signature)
          .find((trueSig) => trueSig)
      : ''
  }

  const transactionFound = verifyTransactionStored({ txId: queueStored.transaction?.id, chainId })
  const owners = transactionFound.detailedExecutionInfo.signers.map((signer) => signer.value)

  const sigs: Array<Record<string, unknown>> = []
  owners.map((owner) => {
    sigs.push({
      owner: owner,
      sig:
        owner === sender
          ? signature
            ? signature
            : verifySigsLocal(transactionFound, owner)
          : verifySigsLocal(transactionFound, owner),
    })
  })

  const { confirmations, missingSigners } = sigsInfo(sigs)

  const transaction = {
    ...transactionFound,
    detailedExecutionInfo: {
      ...transactionFound.detailedExecutionInfo,
      confirmations,
    },
  }
  const queue = {
    ...queueStored,
    transaction: {
      ...queueStored.transaction,
      executionInfo: {
        ...queueStored.transaction.executionInfo,
        missingSigners,
        confirmationsSubmitted: sigs.filter((sig) => sig.sig).length,
      },
    },
  }

  await auxSetLocal({ transaction, queue, chainId })

  dispatch(fetchTransactions(chainId, transactionFound.safeAddress))
  return transaction as any
}

const sigsInfo = (sigs) => {
  const confirmations: Array<Record<string, unknown>> = []
  const missingSigners: Array<Record<string, unknown>> = []
  const signers: Array<Record<string, unknown>> = []

  sigs.map((sig) => {
    !sig.sig && missingSigners.push({ value: sig.owner })
    signers.push({ value: sig.owner })
    sig.sig &&
      confirmations.push({
        signer: {
          value: sig.owner,
        },
        signature: sig.sig.length > 130 ? sig.sig : `0x${sig.sig}`,
        submittedAt: 1656797410454,
      })
  })
  return { confirmations, missingSigners, signers }
}

export const updateSigsQueue = async (values, txDetails, dispatch) => {
  const chainId = _getChainId()

  const { confirmations, missingSigners } = sigsInfo(values.sigs)
  const queueStored = verifyQueueStored({ txId: txDetails.txId, chainId, safeAddress: txDetails.safeAddress })
  const transaction = {
    ...txDetails,
    detailedExecutionInfo: {
      ...txDetails.detailedExecutionInfo,
      confirmations,
      nonce: parseInt(values.nonceTransaction),
    },
  }
  const queue = queueStored && {
    ...queueStored,
    transaction: {
      ...queueStored.transaction,
      executionInfo: {
        ...queueStored.transaction.executionInfo,
        nonce: parseInt(values.nonceTransaction),
        missingSigners,
        confirmationsSubmitted: values.sigs.filter((sig) => sig.sig).length,
      },
    },
  }
  await auxSetLocal({ transaction, queue, chainId })
  dispatch(fetchTransactions(chainId, txDetails.safeAddress))
}

export const cleanQueue = async ({ txId, safeAddress }) => {
  const chainId = _getChainId()
  const queueLocal = verifyQueueStored({
    txId,
    chainId,
    safeAddress,
    returnOthers: true,
  })
  const transactionLocal = verifyTransactionStored({
    txId,
    chainId,
    returnOthers: true,
  })
  localStorage.setItem(
    `loadTransaction_${chainId}`,
    JSON.stringify(transactionLocal && transactionLocal?.others ? transactionLocal.others : []) as string,
  )
  localStorage.setItem(
    `loadQueue_${chainId}_${safeAddress}`,
    JSON.stringify(queueLocal && queueLocal?.others ? queueLocal.others : []) as string,
  )
}

const verifyQueueStored = ({ txId, chainId, safeAddress, returnOthers = false }) => {
  const queueLocal = localStorage.getItem(`loadQueue_${chainId}_${safeAddress}`) as string
  return queueLocal
    ? JSON.parse(queueLocal)?.length > 0
      ? returnOthers
        ? {
            others: JSON.parse(queueLocal).filter((q) => q?.transaction?.id !== txId),
            same: JSON.parse(queueLocal).find((q) => q?.transaction?.id === txId),
          }
        : JSON.parse(queueLocal).find((q) => q?.transaction?.id === txId)
      : null
    : null
}
const verifyTransactionStored = ({ txId, chainId, returnOthers = false }) => {
  const transactionLocal = localStorage.getItem(`loadTransaction_${chainId}`) as string
  return transactionLocal
    ? JSON.parse(transactionLocal)?.length > 0
      ? returnOthers
        ? {
            others: JSON.parse(transactionLocal).filter((t) => t?.txId !== txId),
            same: JSON.parse(transactionLocal).find((t) => t?.txId === txId),
          }
        : JSON.parse(transactionLocal).find((t) => t?.txId === txId)
      : null
    : null
}

const auxSetLocal = async ({ transaction, queue, chainId }): Promise<void> => {
  const queueLocal = verifyQueueStored({
    txId: transaction?.txId,
    chainId,
    safeAddress: transaction.safeAddress,
    returnOthers: true,
  })
  const transactionLocal = verifyTransactionStored({
    txId: transaction?.txId,
    chainId,
    returnOthers: true,
  })
  const listQueue = queueLocal ? [...queueLocal.others, queue] : [queue]
  const listTransaction = transactionLocal ? [...transactionLocal.others, transaction] : [transaction]

  localStorage.setItem(`loadQueue_${chainId}_${transaction.safeAddress}`, JSON.stringify(listQueue) as string)
  localStorage.setItem(`loadTransaction_${chainId}`, JSON.stringify(listTransaction) as string)
}
