import Modal from 'src/components/Modal'
import { useDispatch } from 'react-redux'
import { Dispatch } from 'src/logic/safe/store/actions/types'

import { SignatureChangeForm } from './SignatureChangeForm'

import { updateSigsQueue } from 'src/logic/safe/transactions'

export type ObjectSigs = {
  owner: string
  sig: string
}

export const AddSigModal = ({ isOpen, onClose, txDetails, currentNonce, currentOwner }): React.ReactElement => {
  const dispatch = useDispatch<Dispatch>()

  const signatureReview = async (values) => {
    await updateSigsQueue(values, txDetails, dispatch)
    onClose()
  }

  return (
    <Modal
      description="Search pending transaction"
      handleClose={onClose}
      open={isOpen}
      paperClassName="bigger-modal-window"
      title="Search pending transaction"
    >
      <SignatureChangeForm
        txDetails={txDetails}
        currentOwner={currentOwner}
        currentNonce={currentNonce}
        onClose={onClose}
        onSubmit={signatureReview}
      />
    </Modal>
  )
}
