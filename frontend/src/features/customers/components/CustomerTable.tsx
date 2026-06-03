import { User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  customerCreditUsed,
  customerLoyaltyPoints,
  type CustomerSummary,
} from '../../../shared/api/customers'
import {
  EmptyState,
  ListCard,
  ListCardStack,
  formatTableCurrency,
  formatTableDate,
  statusToBadgeVariant,
} from '../../../components/ui'

export interface CustomerTableProps {
  rows: CustomerSummary[]
  canWrite?: boolean
  onEdit: (customer: CustomerSummary) => void
  onSendReminder: (customer: CustomerSummary) => void
}

function creditBadge(row: CustomerSummary) {
  if (row.level === 'EXCEEDED') {
    return { label: 'Over limit', variant: 'error' as const }
  }
  if (Number(row.creditBalance ?? 0) > 0) {
    return { label: 'On credit', variant: 'warning' as const }
  }
  return { label: 'Good standing', variant: statusToBadgeVariant('ACTIVE') }
}

export function CustomerTable({ rows, canWrite = true, onEdit, onSendReminder }: CustomerTableProps) {
  const navigate = useNavigate()

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No customers match your search and filters"
        description="Try clearing filters or add a new customer."
      />
    )
  }

  return (
    <ListCardStack>
      {rows.map(row => {
        const dateParts = formatTableDate(row.lastPurchaseAt)
        const secondary = [row.phone, row.email].filter(Boolean).join(' · ') || 'No contact details'
        return (
          <ListCard
            key={row.id}
            icon={User}
            primary={row.name}
            secondary={secondary}
            metric={
              <>
                <span>{formatTableCurrency(customerCreditUsed(row))}</span>
                <span>{customerLoyaltyPoints(row)} pts</span>
                {row.lastPurchaseAt ? (
                  <span title={dateParts.title}>{dateParts.display}</span>
                ) : null}
              </>
            }
            badge={creditBadge(row)}
            onClick={() => navigate(`/customers/${row.id}`)}
            menuActions={[
              {
                label: 'Edit',
                disabled: !canWrite,
                onClick: () => onEdit(row),
              },
              {
                label: 'Send reminder',
                disabled: !row.phone,
                onClick: () => onSendReminder(row),
              },
            ]}
          />
        )
      })}
    </ListCardStack>
  )
}
