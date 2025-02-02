import { Dispatch } from 'redux'
import { Action } from 'redux-actions'
import WalletConnectProvider from '@walletconnect/web3-provider'

import { store as reduxStore } from 'src/store'
import { enhanceSnackbarForAction, NOTIFICATIONS } from 'src/logic/notifications'
import enqueueSnackbar from 'src/logic/notifications/store/actions/enqueueSnackbar'
import { PROVIDER_ACTIONS } from 'src/logic/wallets/store/actions'
import { ProviderPayloads } from 'src/logic/wallets/store/reducer'
import { providerSelector } from '../selectors'
import { trackEvent } from 'src/utils/googleTagManager'
import { WALLET_EVENTS } from 'src/utils/events/wallet'
import { instantiateSafeContracts } from 'src/logic/contracts/safeContracts'
import { resetWeb3, setWeb3 } from 'src/logic/wallets/getWeb3'
import onboard, { removeLastUsedProvider, saveLastUsedProvider } from 'src/logic/wallets/onboard'
import { checksumAddress } from 'src/utils/checksumAddress'
import { shouldSwitchNetwork } from 'src/logic/wallets/utils/network'

const UNKNOWN_PEER = 'Unknown'

const providerMiddleware =
  (store: ReturnType<typeof reduxStore>) =>
  (next: Dispatch) =>
  async (action: Action<ProviderPayloads>): Promise<Action<ProviderPayloads>> => {
    const handledAction = next(action)

    const isProviderAction = [
      PROVIDER_ACTIONS.WALLET_NAME,
      PROVIDER_ACTIONS.ACCOUNT,
      PROVIDER_ACTIONS.NETWORK,
    ].includes(action.type as PROVIDER_ACTIONS)

    // Prevent other dispatches from triggering this middleware
    if (!isProviderAction) {
      return handledAction
    }

    const state = store.getState()
    const { name, account, network, loaded, available } = providerSelector(state)

    // No wallet is connected via onboard, reset provider
    if (!name && !account && !network) {
      resetWeb3()
      removeLastUsedProvider()
    }

    // Wallet 'partially' connected: only a subset of onboard subscription(s) have fired
    if (!name || !account || !network) {
      return handledAction
    }

    // @TODO: `loaded` flag that is/was always set to true - should be moved to wallet connection catch
    // Wallet, account and network did not successfully load
    if (!loaded) {
      store.dispatch(enqueueSnackbar(enhanceSnackbarForAction(NOTIFICATIONS.CONNECT_WALLET_ERROR_MSG)))
      return handledAction
    }

    if (!available) {
      store.dispatch(enqueueSnackbar(enhanceSnackbarForAction(NOTIFICATIONS.UNLOCK_WALLET_MSG)))
      return handledAction
    }

    const { wallet, address } = onboard().getState()

    if (name === wallet.name) {
      saveLastUsedProvider(name)
    }

    // Instantiate web3/contract
    if (wallet.provider) {
      setWeb3(wallet.provider)
      instantiateSafeContracts(true)
    }

    // Only track when store/UI is in sync with onboard
    if (account === checksumAddress(address) && !shouldSwitchNetwork(wallet)) {
      trackEvent({ ...WALLET_EVENTS.CONNECT, label: name })
      // Track WalletConnect peer wallet
      if (name.toUpperCase() === 'WALLETCONNECT') {
        trackEvent({
          ...WALLET_EVENTS.WALLET_CONNECT,
          label: (wallet.provider as InstanceType<typeof WalletConnectProvider>)?.wc?.peerMeta?.name || UNKNOWN_PEER,
        })
      }
    }

    return handledAction
  }

export default providerMiddleware
