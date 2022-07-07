import { makeStyles } from '@material-ui/core/styles'
import { useState } from 'react'
import { styles } from './style'
import SelectField from 'src/components/forms/SelectField'
import MenuItem from '@material-ui/core/MenuItem'

import Field from 'src/components/forms/Field'
import GnoForm from 'src/components/forms/GnoForm'
import { composeValidators, required, mustBeInteger, minValue, maxValue } from 'src/components/forms/validator'
import Block from 'src/components/layout/Block'
import Col from 'src/components/layout/Col'
import Hairline from 'src/components/layout/Hairline'
import Paragraph from 'src/components/layout/Paragraph'
import Row from 'src/components/layout/Row'
import { Modal } from 'src/components/Modal'
import { ModalHeader } from 'src/routes/safe/components/Balances/SendModal/screens/ModalHeader'
import { getStepTitle } from 'src/routes/safe/components/Balances/SendModal/utils'

const useStyles = makeStyles(styles)

export const MethodChangeThreshold = ({
  props: { handleState, onClose, onSubmit, values, onClickBack },
}): React.ReactElement => {
  const classes = useStyles()
  const [disabledSubmitForm] = useState<boolean>(true)
  const numOptions = values.owners ? values.owners.length : 0
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
                <Row align="center" className={classes.inputRow} margin="xl">
                  <Col xs={4}>
                    <Field
                      data-testid="threshold-select-input"
                      name="threshold"
                      onChange={({ target: { value } }) => handleState(value, 'newThreshold')}
                      label={<h4 style={{ padding: 0, margin: 0 }}>&nbsp;&nbsp; Chosen threshold*</h4>}
                      render={(props) => (
                        <SelectField {...props}>
                          {[...Array(Number(numOptions))].map((x, index) => (
                            <MenuItem key={index} value={`${index + 1}`}>
                              {index + 1}
                            </MenuItem>
                          ))}
                        </SelectField>
                      )}
                      validate={composeValidators(required, mustBeInteger, minValue(1), maxValue(numOptions))}
                    />
                  </Col>
                  <Col xs={4}>
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
