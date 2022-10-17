import { makeStyles } from '@material-ui/core/styles'
import { useState } from 'react'
import { styles } from './style'
import SelectField from 'src/components/forms/SelectField'
import MenuItem from '@material-ui/core/MenuItem'

import AddressInput from 'src/components/forms/AddressInput'
import Field from 'src/components/forms/Field'
import GnoForm from 'src/components/forms/GnoForm'
import {
  addressIsNotCurrentSafe,
  composeValidators,
  required,
  uniqueAddress,
  mustBeInteger,
  minValue,
  maxValue,
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

export const MethodSendNFT = ({
  props: { handleState, onClose, onSubmit, values, onClickBack },
}): React.ReactElement => {
  const classes = useStyles()
  const ownerDoesntExist = uniqueAddress(values.owners)
  const ownerAddressIsNotSafeAddress = addressIsNotCurrentSafe(values.safeAddress)
  const [disabledSubmitForm] = useState<boolean>(true)
  const numOptions = values.owners ? values.owners.length + 1 : 0
  return (
    <>
      <ModalHeader onClose={onClose} title="Search pending transaction" subTitle={getStepTitle(2, 3)} />
      <Hairline />
      <GnoForm
        initialValues={{
          ownerAddress: values.ownerAdded,
          threshold: values.newThreshold.toString(),
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
                <Row margin="md">
                  <Col xs={8}>
                    <AddressInput
                      fieldMutator={(value) => handleState(value, 'ownerAdded')}
                      name="ownerAddress"
                      placeholder="Owner address*"
                      testId="add-owner-address-testid"
                      text="Owner that was added*"
                      validators={[ownerDoesntExist, ownerAddressIsNotSafeAddress]}
                    />
                  </Col>
                </Row>
                <Row align="center" className={classes.inputRow} margin="xl">
                  <Col xs={2}>
                    <Field
                      data-testid="threshold-select-input"
                      name="threshold"
                      onChange={({ target: { value } }) => handleState(value, 'newThreshold')}
                      render={(props) => (
                        <>
                          <SelectField {...props} disableError>
                            {[...Array(Number(numOptions))].map((x, index) => (
                              <MenuItem key={index} value={`${index + 1}`}>
                                {index + 1}
                              </MenuItem>
                            ))}
                          </SelectField>
                          {props.meta.error && props.meta.touched && (
                            <Paragraph className={classes.errorText} color="error" noMargin>
                              {props.meta.error}
                            </Paragraph>
                          )}
                        </>
                      )}
                      validate={composeValidators(required, mustBeInteger, minValue(1), maxValue(numOptions))}
                    />
                  </Col>
                  <Col xs={10}>
                    <Paragraph className={classes.ownersText} color="primary" noMargin size="lg">
                      out of {numOptions} owner(s)
                    </Paragraph>
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