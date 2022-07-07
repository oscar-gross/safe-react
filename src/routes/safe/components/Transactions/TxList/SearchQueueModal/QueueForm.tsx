import { makeStyles } from '@material-ui/core/styles'
import { Mutator } from 'final-form'
import { useState } from 'react'
import { styles } from './style'
import SelectField from 'src/components/forms/SelectField'
import MenuItem from '@material-ui/core/MenuItem'
import { ObjectSigs } from './'
import Field from 'src/components/forms/Field'
import GnoForm from 'src/components/forms/GnoForm'
import { composeValidators, required, validAddressBookName } from 'src/components/forms/validator'
import Block from 'src/components/layout/Block'
import Col from 'src/components/layout/Col'
import Hairline from 'src/components/layout/Hairline'
import Paragraph from 'src/components/layout/Paragraph'
import Row from 'src/components/layout/Row'
import { Modal } from 'src/components/Modal'
import { ModalHeader } from 'src/routes/safe/components/Balances/SendModal/screens/ModalHeader'
import { getStepTitle } from 'src/routes/safe/components/Balances/SendModal/utils'

export const ADD_OWNER_NAME_INPUT_TEST_ID = 'add-owner-name-input'
export const ADD_OWNER_ADDRESS_INPUT_TEST_ID = 'add-owner-address-testid'
export const ADD_OWNER_NEXT_BTN_TEST_ID = 'add-owner-next-btn'

const formMutators: Record<
  string,
  Mutator<{ setOwnerAddress: { address: string }; setOwnerName: { name: string } }>
> = {
  setOwnerAddress: (args, state, utils) => {
    utils.changeValue(state, 'ownerAddress', () => args[0])
  },
  setOwnerName: (args, state, utils) => {
    utils.changeValue(state, 'ownerName', () => args[0])
  },
}

const useStyles = makeStyles(styles)

export const QueueForm = ({ handleState, onClose, onSubmit, values, methods, handleMethod }): React.ReactElement => {
  const classes = useStyles()
  const [disabledSubmitForm] = useState<boolean>(true)

  const handleSubmit = (values) => {
    const sigs: Array<ObjectSigs> = []
    sigs.push({ owner: values.ownerTransaction, sig: '' })
    values.owners.map((owner) => {
      owner !== values.ownerTransaction && sigs.push({ owner: owner, sig: '' })
    })
    handleState(sigs, 'sigs')
    onSubmit(values)
  }

  return (
    <>
      <ModalHeader onClose={onClose} title="Search pending transaction" subTitle={getStepTitle(1, 3)} />
      <Hairline />
      <GnoForm
        formMutators={formMutators}
        initialValues={{
          owners: values.owners,
          threshold: values.newThreshold.toString(),
          ownerTransaction: values.ownerTransaction,
          method: values.labelMethod,
        }}
        onSubmit={handleSubmit}
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
                      label={<h4 style={{ padding: 0, margin: 0 }}>&nbsp;&nbsp;Type of transaction</h4>}
                      data-testid="method-select-input"
                      name="method"
                      onChange={({ target: { value } }) => handleMethod(value)}
                      render={(props) => (
                        <SelectField {...props}>
                          {methods.map((x, i) => (
                            <MenuItem key={i} value={x.label}>
                              {x.label}
                            </MenuItem>
                          ))}
                        </SelectField>
                      )}
                      validate={composeValidators(required, validAddressBookName)}
                    />
                  </Col>
                </Row>
                <Row align="center" className={classes.inputRow} margin="xl">
                  <Col xs={8}>
                    <Field
                      label={<h4 style={{ padding: 0, margin: 0 }}>&nbsp;&nbsp; Owner who add the transaction*</h4>}
                      data-testid="threshold-select-input"
                      name="ownerTransaction"
                      onChange={({ target: { value } }) => handleState(value, 'ownerTransaction')}
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
              </Block>
              <Hairline />
              <Row align="center" className={classes.buttonRow}>
                <Modal.Footer.Buttons
                  cancelButtonProps={{ onClick: onClose, text: 'Cancel' }}
                  confirmButtonProps={{
                    type: 'submit',
                    text: 'Next',
                    testId: ADD_OWNER_NEXT_BTN_TEST_ID,
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
