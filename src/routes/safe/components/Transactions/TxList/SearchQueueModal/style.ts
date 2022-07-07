import { createStyles, makeStyles } from '@material-ui/core'
import { boldFont, border, lg, md, sm } from 'src/theme/variables'

export const styles = createStyles({
  formContainer: {
    padding: `${md} ${lg}`,
    minHeight: '340px',
  },
  buttonRow: {
    height: '84px',
    justifyContent: 'center',
    gap: '16px',
  },
  modalContent: {
    padding: `${md} ${lg}`,
  },
  ownersText: {
    marginLeft: sm,
  },
  inputRow: {
    position: 'relative',
  },
  headingText: {
    fontSize: md,
  },
  errorText: {
    position: 'absolute',
    bottom: '-25px',
  },
})

export const useStyles = makeStyles(
  createStyles({
    actionButton: {
      fontWeight: boldFont,
      marginRight: sm,
    },
    buttonRow: {
      padding: '60px',
      left: 0,
      bottom: 0,
      boxSizing: 'border-box',
      width: '100%',
      justifyContent: 'center',
      borderTop: `2px solid ${border}`,
      blockSize: 'fit-content',
    },
  }),
)
