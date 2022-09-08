import { makeStyles } from '@material-ui/core/styles'
import { useEffect, useState } from 'react'
import { styles } from './style'
import SelectField from 'src/components/forms/SelectField'
import MenuItem from '@material-ui/core/MenuItem'
import AddressInput from 'src/components/forms/AddressInput'

import Field from 'src/components/forms/Field'
import GnoForm from 'src/components/forms/GnoForm'
import {
  composeValidators,
  required,
  validAddressBookName,
  addressIsNotCurrentSafe,
  uniqueAddress,
} from 'src/components/forms/validator'
import Block from 'src/components/layout/Block'
import Col from 'src/components/layout/Col'
import Hairline from 'src/components/layout/Hairline'
import Paragraph from 'src/components/layout/Paragraph'
import Row from 'src/components/layout/Row'
import { Modal } from 'src/components/Modal'
import { ModalHeader } from 'src/routes/safe/components/Balances/SendModal/screens/ModalHeader'
import { getStepTitle } from 'src/routes/safe/components/Balances/SendModal/utils'

const useStyles = makeStyles(styles)

export const MethodSwapOwner = ({
  props: { handleState, onClose, onSubmit, values, onClickBack },
}): React.ReactElement => {
  const classes = useStyles()
  const ownerDoesntExist = uniqueAddress(values.owners)
  const ownerAddressIsNotSafeAddress = addressIsNotCurrentSafe(values.safeAddress)
  const [disabledSubmitForm] = useState<boolean>(true)

  useEffect(() => {
    handleState(values.threshold, 'newThreshold')
  }, [])

  return (
    <>
      <ModalHeader onClose={onClose} title="Search pending transaction" subTitle={getStepTitle(2, 3)} />
      <Hairline />
      <GnoForm
        initialValues={{
          ownerRemoved: values.ownerRemoved,
          ownerAddress: values.ownerAdded,
        }}
        onSubmit={onSubmit}
        isSubmitDisabled={disabledSubmitForm}
      >
        {() => {
          return (
            <>
              <Block className={classes.formContainer}>
                <Row margin="md">
                  <Paragraph>Get a pending transaction by entering the following data:</Paragraph>
                </Row>
                <Row align="center" className={classes.inputRow} margin="xl">
                  <Col xs={8}>
                    <Field
                      label={<h4 style={{ padding: 0, margin: 0 }}>&nbsp;&nbsp;Owner to be removed*</h4>}
                      data-testid="threshold-select-input"
                      name="ownerRemoved"
                      onChange={({ target: { value } }) => handleState(value, 'ownerRemoved')}
                      render={(props) => (
                        <SelectField {...props}>
                          {values.owners.map((x, i) => (
                            <MenuItem key={i} value={x}>
                              {x}
                            </MenuItem>
                          ))}
                        </SelectField>
                      )}
                      validate={composeValidators(required, validAddressBookName)}
                    />
                  </Col>
                </Row>
                <Row margin="md">
                  <Col xs={8}>
                    <AddressInput
                      fieldMutator={(value) => handleState(value, 'ownerAdded')}
                      name="ownerAddress"
                      placeholder="Owner address*"
                      testId="add-owner-address-testid"
                      text="Owner to be added*"
                      validators={[ownerDoesntExist, ownerAddressIsNotSafeAddress]}
                    />
                  </Col>
                </Row>
              </Block>
              <Hairline />
              <Row align="center" className={classes.buttonRow}>
                <Modal.Footer.Buttons
                  cancelButtonProps={{ onClick: onClickBack, text: 'Back' }}
                  confirmButtonProps={{
                    type: 'submit',
                    text: 'Next',
                    testId: 'add-owner-next-btn',
                  }}
                />
              </Row>
            </>
          )
        }}
      </GnoForm>
    </>
  )
}
