import { useEffect, useState, useCallback } from 'react'
import { useSelector } from 'react-redux'

import Modal from 'src/components/Modal'
import { getGnosisSafeInstanceAt } from 'src/logic/contracts/safeContracts'
import { QueueForm } from './QueueForm'
import { SignatureForm } from './SignatureForm'
import { MethodAddOwner } from './MethodAddOwner'
import { MethodRemoveOwner } from './MethodRemoveOwner'
import { MethodChangeThreshold } from './MethodChangeThreshold'
import { MethodSwapOwner } from './MethodSwapOwner'
import { MethodSendFunds } from './MethodSendFunds'
import { MethodSendNFT } from './MethodSendNFT'
import useSafeAddress from 'src/logic/currentSession/hooks/useSafeAddress'
import { userAccountSelector } from 'src/logic/wallets/store/selectors'
import { currentSafeCurrentVersion } from 'src/logic/safe/store/selectors'
import { saveTxLocal } from 'src/logic/safe/transactions'

export type ObjectSigs = {
  owner: string
  sig: string
}
type ValuesTypes = {
  ownerTransaction: string
  owners: Array<string>
  threshold: string
  newThreshold: string
  safeTxHash: string
  currentNonce: string
  nonceTransaction: string
  ownerAdded: string
  currentOwner: string
  ownerRemoved: string
  method: string
  sigs: Array<ObjectSigs>
  data: string
  status: string
  type: string
  labelMethod: string
  safeAddress: string
  recipient: string
  amount: string
  token: string
}
type Props = {
  isOpen: boolean
  onClose: () => void
}
type TypeMethods2 = {
  label: string
  method: string
  type: string
}
type TypeMethods = Array<TypeMethods2>

const methods: TypeMethods = [
  { label: 'Add new owner', method: 'addOwnerWithThreshold', type: 'ADD_OWNER' },
  { label: 'Remove owner', method: 'removeOwner', type: 'REMOVE_OWNER' },
  { label: 'Swap owner', method: 'swapOwner', type: 'SWAP_OWNER' },
  { label: 'Change threshold', method: 'changeThreshold', type: 'CHANGE_THRESHOLD' },
  { label: 'Send funds', method: 'OUTGOING', type: 'Transfer' },
  { label: 'Send NFT', method: 'OUTGOINGNFT', type: 'Transfer' },
]

export const SearchQueueModal = ({ isOpen, onClose }: Props): React.ReactElement => {
  const { safeAddress } = useSafeAddress()
  const safeVersion = useSelector(currentSafeCurrentVersion)
  const currentOwner = useSelector(userAccountSelector)
  const [activeScreen, setActiveScreen] = useState('selectTypeOwner')

  const [values, setValues] = useState<ValuesTypes>({
    ownerTransaction: '',
    owners: [],
    threshold: '',
    newThreshold: '',
    safeTxHash: '',
    currentNonce: '',
    nonceTransaction: '',
    currentOwner: '',
    ownerAdded: '',
    ownerRemoved: '',
    method: '',
    sigs: [
      {
        owner: '',
        sig: '',
      },
    ],
    data: '',
    status: '',
    type: '',
    labelMethod: '',
    safeAddress: safeAddress,
    recipient: '',
    amount: '',
    token: '',
  })

  const getDataSafe = useCallback(async () => {
    const safeInstance = getGnosisSafeInstanceAt(safeAddress, safeVersion)
    const owners = await safeInstance.methods.getOwners().call()
    const threshold = await safeInstance.methods.getThreshold().call()
    const currentNonce = await safeInstance.methods.nonce().call()
    setValues({ ...values, owners, currentNonce, threshold, currentOwner })
    setActiveScreen('selectTypeOwner')
  }, [currentOwner, safeAddress, safeVersion, values])

  useEffect(() => {
    getDataSafe()
  }, [isOpen, getDataSafe])

  const handleState = (value: string, param: string) => {
    setValues({ ...values, [param]: value })
  }

  const handleMethod = (value: string) => {
    const methodChoose = methods.find((method) => method.label === value)
    setValues({
      ...values,
      labelMethod: value,
      method: methodChoose?.method as string,
      type: methodChoose?.type as string,
    })
  }

  const onClickBack = () => {
    setActiveScreen('selectTypeOwner')
  }

  const signatureReview = async () => {
    await saveTxLocal({ values })
    onClose()
  }

  const props = {
    onClose,
    handleState,
    values,
    onClickBack,
    onSubmit: () => setActiveScreen('signatureReview'),
  }
  return (
    <Modal
      description="Search pending transaction"
      handleClose={onClose}
      open={isOpen}
      paperClassName="bigger-modal-window"
      title="Search pending transaction"
    >
      <>
        {activeScreen === 'selectTypeOwner' && (
          <QueueForm
            onClose={onClose}
            onSubmit={() => setActiveScreen(values.method)}
            handleState={handleState}
            values={values}
            methods={methods}
            handleMethod={handleMethod}
          />
        )}
        {activeScreen === 'addOwnerWithThreshold' && <MethodAddOwner props={props} />}
        {activeScreen === 'removeOwner' && <MethodRemoveOwner props={props} />}
        {activeScreen === 'swapOwner' && <MethodSwapOwner props={props} />}
        {activeScreen === 'changeThreshold' && <MethodChangeThreshold props={props} />}
        {activeScreen === 'OUTGOING' && <MethodSendFunds props={props} />}
        {activeScreen === 'OUTGOINGNFT' && <MethodSendNFT props={props} />}
        {activeScreen === 'signatureReview' && (
          <SignatureForm
            onClickBack={() => setActiveScreen(values.method)}
            onClose={onClose}
            onSubmit={signatureReview}
            handleState={handleState}
            values={values}
          />
        )}
      </>
    </Modal>
  )
}
