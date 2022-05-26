import { backOff, IBackOffOptions } from 'exponential-backoff'

import { NOTIFICATIONS } from 'src/logic/notifications'
import enqueueSnackbar from 'src/logic/notifications/store/actions/enqueueSnackbar'
import { store } from 'src/store'
import { removePendingTransaction } from 'src/logic/safe/store/actions/pendingTransactions'
import { pendingTxIdsByChain } from 'src/logic/safe/store/selectors/pendingTransactions'
import { didTxRevert } from 'src/logic/safe/store/actions/transactions/utils/transactionHelpers'
// import { providerAsync } from '../utils/modules'
import { hexToNumber } from 'web3-utils'
import { getWeb3 } from 'src/logic/wallets/getWeb3'

const _isTxMined = async (blockNumber: number, txHash: string): Promise<boolean> => {
  const MAX_WAITING_BLOCK = blockNumber + 50

  const web3 = getWeb3()
  const receipt = await web3.eth.getTransactionReceipt(txHash)
  // const receipt = await providerAsync({
  //   hash: txHash,
  //   tries: 1,
  //   method: 'eth_getTransactionReceipt',
  // }).then((res) => res).catch(e => e)
  if (receipt) {
    return !didTxRevert(receipt)
  }
  // const latestBlockNumber = await providerAsync({
  //   hash: null,
  //   tries: 1,
  //   method: 'eth_blockNumber',
  // }).then((res) => res).catch(e => e)

  if ((await web3.eth.getBlockNumber()) <= MAX_WAITING_BLOCK) {
    // if (hexToNumber(latestBlockNumber) <= MAX_WAITING_BLOCK) {
    // backOff retries
    throw new Error('Pending transaction not found')
  }

  return false
}

// Progressively after 10s, 20s, 40s, 80s, 160s, 320s - total of 6.5 minutes
const INITIAL_TIMEOUT = 10_000
const TIMEOUT_MULTIPLIER = 2
const MAX_ATTEMPTS = 6

const monitorTx = async (
  sessionBlockNumber: number,
  txId: string,
  txHash: string,
  options: Partial<IBackOffOptions> = {
    startingDelay: INITIAL_TIMEOUT,
    timeMultiple: TIMEOUT_MULTIPLIER,
    numOfAttempts: MAX_ATTEMPTS,
  },
): Promise<void> => {
  return backOff(() => PendingTxMonitor._isTxMined(sessionBlockNumber, txHash), options)
    .then((isMined) => {
      if (!isMined) {
        store.dispatch(removePendingTransaction({ id: txId }))
      }
      // If successfully mined the transaction will be removed by the automatic polling
    })
    .catch(() => {
      // Unsuccessfully mined (threw in last backOff attempt)
      store.dispatch(removePendingTransaction({ id: txId }))
      store.dispatch(enqueueSnackbar(NOTIFICATIONS.TX_PENDING_FAILED_MSG))
    })
}

const monitorAllTxs = async (): Promise<void> => {
  const pendingTxsOnChain = pendingTxIdsByChain(store.getState())
  const pendingTxs = Object.entries(pendingTxsOnChain || {})

  // Don't check pending transactions if there are none
  if (pendingTxs.length === 0) {
    return
  }

  const web3 = getWeb3()
  try {
    const sessionBlockNumber = await web3.eth.getBlockNumber()
    // const sessionBlockNumber = await providerAsync({
    //   hash: null,
    //   tries: 1,
    //   method: 'eth_blockNumber',
    // }).then((res) => res).catch(e => e)

    await Promise.all(
      pendingTxs.map(([txId, { txHash, block = hexToNumber(sessionBlockNumber) }]) => {
        return PendingTxMonitor.monitorTx(block, txId, txHash)
      }),
    )
  } catch {
    // Ignore
  }
}

export const PendingTxMonitor = { _isTxMined, monitorTx, monitorAllTxs }
