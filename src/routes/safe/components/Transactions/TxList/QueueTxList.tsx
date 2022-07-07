import { Icon, Link, Text } from '@gnosis.pm/safe-react-components'
import { Fragment, ReactElement, useContext, useState } from 'react'
import { useSelector } from 'react-redux'
import { Button, Tooltip } from '@gnosis.pm/safe-react-components'
import Row from 'src/components/layout/Row'
import { useStyles } from './SearchQueueModal/style'
import { Transaction, TransactionDetails } from 'src/logic/safe/store/models/types/gateway.d'
import { sameString } from 'src/utils/strings'
import { currentSafeNonce } from 'src/logic/safe/store/selectors'
import styled from 'styled-components'
import { md, sm } from 'src/theme/variables'
import {
  DisclaimerContainer,
  GroupedTransactions,
  GroupedTransactionsCard,
  SubTitle,
  StyledTransactions,
  StyledTransactionsGroup,
  AlignItemsWithMargin,
} from './styled'
import { TxHoverProvider } from './TxHoverProvider'
import { TxLocationContext } from './TxLocationProvider'
import { TxQueueRow } from './TxQueueRow'
import { TxsInfiniteScrollContext } from './TxsInfiniteScroll'
import { TxActionProvider } from './TxActionProvider'
import { ActionModal } from './ActionModal'
import { SearchQueueModal } from './SearchQueueModal'

const TreeView = ({ firstElement }: { firstElement: boolean }): ReactElement => {
  return <p className="tree-lines">{firstElement ? <span className="first-node" /> : null}</p>
}

const Disclaimer = ({ nonce }: { nonce: string }): ReactElement => {
  return (
    <DisclaimerContainer className="disclaimer-container">
      <Text size="xl" className="nonce">
        {nonce}
      </Text>
      <AlignItemsWithMargin className="disclaimer">
        <Text as="span" size="xl">
          These transactions conflict as they use the same nonce. Executing one will automatically replace the other(s).{' '}
        </Text>
        <Link
          href="https://help.gnosis-safe.io/en/articles/4730252-why-are-transactions-with-the-same-nonce-conflicting-with-each-other"
          target="_blank"
          rel="noreferrer"
          title="Why are transactions with the same nonce conflicting with each other?"
        >
          <AlignItemsWithMargin>
            <Text size="xl" as="span" color="primary">
              Learn more
            </Text>
            <Icon size="sm" type="externalLink" color="primary" />
          </AlignItemsWithMargin>
        </Link>
      </AlignItemsWithMargin>
    </DisclaimerContainer>
  )
}

type QueueTransactionProps = {
  nonce: string
  transactions: Transaction[]
}

const QueueTransaction = ({ nonce, transactions }: QueueTransactionProps): ReactElement => {
  const [nrChildrenExpanded, setNrChildrenExpanded] = useState(0)

  const handleChildExpand = (expand: number) => {
    setNrChildrenExpanded((val) => val + expand)
  }

  if (transactions.length === 1) {
    return <TxQueueRow transaction={transactions[0]} />
  }

  return (
    <GroupedTransactionsCard expanded={!!nrChildrenExpanded}>
      <TxHoverProvider>
        <Disclaimer nonce={nonce} />
        <GroupedTransactions>
          {transactions.map((transaction, index) => (
            <Fragment key={`${nonce}-${transaction.id}`}>
              <TreeView firstElement={!index} />
              <TxQueueRow isGrouped transaction={transaction} onChildExpand={handleChildExpand} />
            </Fragment>
          ))}
        </GroupedTransactions>
      </TxHoverProvider>
    </GroupedTransactionsCard>
  )
}

type QueueTxListProps = {
  transactions: TransactionDetails['transactions']
}

export const QueueTxList = ({ transactions }: QueueTxListProps): ReactElement => {
  const { txLocation } = useContext(TxLocationContext)
  const nonce = useSelector(currentSafeNonce)
  const { lastItemId, setLastItemId } = useContext(TxsInfiniteScrollContext)
  if (transactions.length) {
    const [, lastTransactionsGroup] = transactions[transactions.length - 1]
    const lastTransaction = lastTransactionsGroup[lastTransactionsGroup.length - 1]

    if (txLocation === 'queued.queued' && !sameString(lastItemId, lastTransaction.id)) {
      setLastItemId(lastTransaction.id)
    }
  }

  const title =
    txLocation === 'queued.next'
      ? 'NEXT TRANSACTION'
      : `QUEUE - Transaction with nonce ${nonce} needs to be executed first`

  return (
    <TxActionProvider>
      <StyledTransactionsGroup>
        <SubTitle size="lg">{title}</SubTitle>
        <StyledTransactions>
          <ButtonOpenModalSearch />
          {transactions.map(([nonce, txs]) => (
            <QueueTransaction key={nonce} nonce={nonce} transactions={txs} />
          ))}
        </StyledTransactions>
      </StyledTransactionsGroup>
      <ActionModal />
    </TxActionProvider>
  )
}

const ButtonOpenModalSearch = (): ReactElement => {
  const classes = useStyles()
  const [modalsStatus, setModalStatus] = useState(false)
  return (
    <>
      <Row align="end" className={classes.buttonRow} grow>
        <ButtonWrapper>
          <Tooltip title={'Search pending transactions'} placement="top">
            <div>
              <Button size="md" color="primary" centerRipple onClick={() => setModalStatus(true)} className="primary">
                {'Search pending transactions'}
              </Button>
            </div>
          </Tooltip>
        </ButtonWrapper>
      </Row>
      <SearchQueueModal isOpen={modalsStatus} onClose={() => setModalStatus(false)} />
    </>
  )
}

const ButtonWrapper = styled.span`
  align-self: flex-end;
  margin-right: ${sm};
  margin-top: -51px;
  margin-bottom: ${md};
  z-index: 0;
`
