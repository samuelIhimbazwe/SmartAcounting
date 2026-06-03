import type { ComponentType } from 'react'
import {
  Landmark,
  Package,
  ScanBarcode,
  ShieldCheck,
  Users,
} from 'lucide-react'
import type { NavGroupKey, NavItem } from './navConfig'

export type NavSectionEntry =
  | { kind: 'item'; itemId: string }
  | {
      kind: 'group'
      id: string
      labelKey: string
      searchLabel: string
      icon: ComponentType<{ className?: string; size?: number; strokeWidth?: number }>
      childIds: string[]
    }

export interface NavSection {
  group: NavGroupKey | null
  entries: NavSectionEntry[]
}

/** Sidebar structure (max 6 sections including unlabeled top). */
export const NAV_SECTIONS: NavSection[] = [
  {
    group: null,
    entries: [{ kind: 'item', itemId: '__dashboard__' }],
  },
  {
    group: 'nav.groupOperations',
    entries: [
      {
        kind: 'group',
        id: 'sales-pos',
        labelKey: 'nav.salesPos',
        searchLabel: 'Sales and POS',
        icon: ScanBarcode,
        childIds: [
          'actions-queue',
          'sales-analytics',
          'pos',
          'till',
          'pos-returns',
          'pos-history',
          'sales-order',
        ],
      },
      {
        kind: 'group',
        id: 'inventory-hub',
        labelKey: 'nav.inventoryHub',
        searchLabel: 'Inventory',
        icon: Package,
        childIds: ['retail', 'stock-transfers', 'shrinkage', 'price-lists'],
      },
      { kind: 'item', itemId: 'customers' },
      { kind: 'item', itemId: 'documents' },
      { kind: 'item', itemId: 'marketing-campaigns' },
      { kind: 'item', itemId: 'promotions' },
    ],
  },
  {
    group: 'nav.groupFinance',
    entries: [
      {
        kind: 'group',
        id: 'finance-hub',
        labelKey: 'nav.financeHub',
        searchLabel: 'Finance',
        icon: Landmark,
        childIds: [
          'invoice',
          'fx-rates',
          'credit-ledger',
          'supplier-bills',
          'journals',
          'payment-runs',
          'fixed-assets',
          'month-end-close',
          'bank-reconciliation',
          'sms-deliveries',
        ],
      },
      { kind: 'item', itemId: 'purchase-order' },
      {
        kind: 'group',
        id: 'hr-hub',
        labelKey: 'nav.hrPayrollHub',
        searchLabel: 'HR and payroll',
        icon: Users,
        childIds: ['hr-employees', 'hr-leave', 'hr-shifts', 'attendance', 'hr-payroll'],
      },
    ],
  },
  {
    group: 'nav.groupCompliance',
    entries: [
      {
        kind: 'group',
        id: 'rra-compliance',
        labelKey: 'nav.rraCompliance',
        searchLabel: 'RRA Compliance',
        icon: ShieldCheck,
        childIds: [
          'ebm-compliance',
          'rra-settings',
          'compliance-vat',
          'compliance-paye',
          'compliance-audit-log',
        ],
      },
    ],
  },
  {
    group: 'nav.groupSettings',
    entries: [
      { kind: 'item', itemId: 'admin-roles' },
      { kind: 'item', itemId: 'users-tenants' },
      { kind: 'item', itemId: 'workflow-rules' },
      { kind: 'item', itemId: 'settings' },
    ],
  },
]

export function itemById(items: NavItem[], id: string): NavItem | undefined {
  return items.find((item) => item.id === id)
}

type VisibleGroup = {
  kind: 'group'
  id: string
  labelKey: string
  icon: ComponentType<{ className?: string }>
  children: NavItem[]
}

type VisibleEntry = { kind: 'item'; item: NavItem | null } | VisibleGroup

export function resolveVisibleSections(
  items: NavItem[],
  sections: NavSection[],
): Array<{ group: NavGroupKey | null; entries: VisibleEntry[] }> {
  const visible = new Set(items.map((i) => i.id))

  return sections
    .map((section) => {
      const entries = section.entries
        .map((entry) => {
          if (entry.kind === 'item') {
            if (entry.itemId === '__dashboard__') {
              return { kind: 'item' as const, item: null }
            }
            const item = itemById(items, entry.itemId)
            if (!item || !visible.has(item.id)) {
              return null
            }
            return { kind: 'item' as const, item }
          }
          const children = entry.childIds
            .map((id) => itemById(items, id))
            .filter((child): child is NavItem => !!child && visible.has(child.id))
          if (children.length === 0) {
            return null
          }
          return {
            kind: 'group' as const,
            id: entry.id,
            labelKey: entry.labelKey,
            icon: entry.icon,
            children,
          }
        })
        .filter((entry): entry is VisibleEntry => entry != null)

      if (entries.length === 0) {
        return null
      }
      return { group: section.group, entries }
    })
    .filter((section): section is { group: NavGroupKey | null; entries: VisibleEntry[] } => section != null)
}
