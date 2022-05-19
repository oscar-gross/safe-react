import { ReactElement, useState } from 'react'
import { FieldValues, Path, useController, UseFormReturn } from 'react-hook-form'
import { useSelector } from 'react-redux'
import Autocomplete from '@material-ui/lab/Autocomplete/Autocomplete'
import TextField from '@material-ui/core/TextField/TextField'
import InputAdornment from '@material-ui/core/InputAdornment/InputAdornment'
import CircularProgress from '@material-ui/core/CircularProgress/CircularProgress'

import { currentNetworkAddressBook } from 'src/logic/addressBook/store/selectors'
import { isValidEnsName, isValidCryptoDomainName } from 'src/logic/wallets/ethAddresses'
import { getAddressFromDomain } from 'src/logic/wallets/getWeb3'
import { isValidAddress, isValidPrefixedAddress } from 'src/utils/isValidAddress'
import { parsePrefixedAddress } from 'src/utils/prefixedAddress'
import { formatInputValue, getFilterHelperText } from 'src/routes/safe/components/Transactions/TxList/Filter/utils'
import { checksumAddress } from 'src/utils/checksumAddress'

type Props<T> = {
  name: Path<T>
  hiddenName: Path<T>
  methods: UseFormReturn<T>
  label: string
}

const RHFAddressSearchField = <T extends FieldValues>({
  name,
  hiddenName,
  methods: { control, register },
  label,
  ...props
}: Props<T>): ReactElement => {
  const addressBookOnChain = useSelector(currentNetworkAddressBook)

  const [isResolving, setIsResolving] = useState<boolean>(false)

  // Field that holds the address value
  const { field, fieldState } = useController<T>({
    name,
    control,
    rules: {
      validate: (address) => {
        if (address && !isValidAddress(address) && !isValidPrefixedAddress(address)) {
          return `Invalid ${label.toLowerCase()}. Please enter an address book entry, ENS domain, or valid address.`
        }
      },
    },
  })

  // Field that holds the input value
  const { field: hiddenField } = useController({
    name: hiddenName,
    control,
  })

  // On autocomplete selection/text input find address from address book/resolve ENS domain
  const onInputChange = async (newValue: string) => {
    hiddenField.onChange(newValue)

    const addressBookEntry = addressBookOnChain.find(({ name }) => name === newValue)
    if (addressBookEntry) {
      field.onChange(addressBookEntry.address)
      return
    }

    if (isValidEnsName(newValue) || isValidCryptoDomainName(newValue)) {
      let resolvedAddress: string | undefined
      setIsResolving(true)
      try {
        resolvedAddress = await getAddressFromDomain(newValue)
      } catch {}
      setIsResolving(false)

      if (resolvedAddress) {
        const checksummedAddress = checksumAddress(resolvedAddress)
        field.onChange(checksummedAddress)
        return
      }
    }

    if (isValidAddress(newValue) || isValidPrefixedAddress(newValue)) {
      const { address } = parsePrefixedAddress(newValue)
      const checksummedAddress = checksumAddress(address)
      field.onChange(checksummedAddress)
      return
    }

    field.onChange(newValue)
  }

  return (
    <>
      <input type="hidden" {...register(hiddenName)} />
      <Autocomplete
        freeSolo
        options={addressBookOnChain}
        getOptionLabel={({ name }) => name}
        onInputChange={(_, value) => onInputChange(value)}
        renderInput={({ inputProps, InputProps, ...params }) => (
          <TextField
            innerRef={field.ref}
            {...params}
            {...props}
            label={label}
            name={name}
            variant="outlined"
            error={!!fieldState.error}
            helperText={getFilterHelperText(field.value, fieldState.error)}
            inputProps={{
              ...inputProps,
              value: formatInputValue(hiddenField.value),
              readOnly: isResolving,
            }}
            InputProps={{
              ...InputProps,
              endAdornment: isResolving ? (
                <InputAdornment position="start">
                  <CircularProgress size="16px" />
                </InputAdornment>
              ) : (
                InputProps.endAdornment
              ),
            }}
          />
        )}
      />
    </>
  )
}

export default RHFAddressSearchField