import { makeStyles } from '@material-ui/core/styles'
import { useState, useEffect, useCallback } from 'react'
import { styles } from './style'
import SelectField from 'src/components/forms/SelectField'
import MenuItem from '@material-ui/core/MenuItem'
import MuiTextField from '@material-ui/core/TextField'
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

export const SignatureForm = ({ handleState, onClose, onSubmit, values, onClickBack }): React.ReactElement => {
  const classes = useStyles()
  const [disabledSubmitForm] = useState<boolean>(true)
  const [initialSigs, setInitialSigs] = useState<any>()
  const [error, setError] = useState<any>(false)

  const firstLoad = useCallback(() => {
    const initialSigs = { threshold: values.nonceTransaction.toString() || '0' }
    values.sigs.map((owsig, i) => {
      initialSigs[`signature${i}`] = owsig.sig
    })
    setInitialSigs(initialSigs)
  }, [values?.nonceTransaction, values.sigs])

  useEffect(() => {
    firstLoad()
  }, [firstLoad])

  const handleSigs = (sig, i) => {
    !sig ? setError(true) : setError(false)
    setInitialSigs({ ...initialSigs, [`signature${i}`]: sig })
    const sigs = values.sigs
    sigs.map((signature, index) => index === i && (signature.sig = sig))
    handleState(sigs, 'sigs')
  }

  return (
    <>
      <ModalHeader onClose={onClose} title="Search pending transaction" subTitle={getStepTitle(3, 3)} />
      <Hairline />
      <GnoForm
        initialValues={{ ...initialSigs, threshold: values.nonceTransaction.toString() || '0' }}
        onSubmit={onSubmit}
        isSubmitDisabled={disabledSubmitForm}
      >
        {() => {
          return (
            <>
              <Block className={classes.formContainer}>
                <Row margin="md">
                  <Paragraph>
                    <strong>Current Nonce: {values.currentNonce}</strong>
                  </Paragraph>
                </Row>
                <Row align="center" className={classes.inputRow} margin="xl">
                  <Col xs={3} style={{ marginRight: '10px' }}>
                    <Paragraph className={classes.ownersText} color="primary" noMargin size="lg">
                      Nonce number of transaction:
                    </Paragraph>
                  </Col>
                  <Col xs={3}>
                    <Field
                      data-testid="threshold-select-input"
                      name="threshold"
                      onChange={({ target: { value } }) => handleState(value, 'nonceTransaction')}
                      render={(props) => (
                        <SelectField {...props}>
                          {[...Array(20)].map((x, index) => (
                            <MenuItem key={index} value={`${parseInt(values.currentNonce) - 1 + index}`}>
                              {parseInt(values.currentNonce) - 1 + index}
                            </MenuItem>
                          ))}
                        </SelectField>
                      )}
                      validate={composeValidators(
                        required,
                        mustBeInteger,
                        minValue(values.currentNonce - 1),
                        maxValue(values.currentNonce + 20),
                      )}
                    />
                  </Col>
                </Row>
                {values.threshold > 1 && (
                  <>
                    <Row margin="md">
                      <Paragraph>If other owners have already added their signatures, fill them in below:</Paragraph>
                    </Row>
                    {values.sigs.map((owsig, i) => (
                      <>
                        {owsig.owner !== values.currentOwner && (
                          <Row margin="md" key={i}>
                            <Col xs={11}>
                              <MuiTextField
                                error={i === 0 && error ? true : false}
                                helperText={i === 0 && error ? 'required' : ''}
                                name={`signature${i}`}
                                label={`Signature of owner ${owsig.owner}*`}
                                onChange={({ target: { value } }) => handleSigs(value, i)}
                                variant="outlined"
                              />
                            </Col>
                          </Row>
                        )}{' '}
                      </>
                    ))}
                  </>
                )}
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
