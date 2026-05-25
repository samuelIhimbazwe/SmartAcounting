import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Bell, FileText, Landmark, MapPin, Megaphone, Package, Play, Search, ShoppingBag, Tag, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { getRecommendedActions } from '../../api/actions'
import { listBankAccounts } from '../../api/bank'
import { rolesWithAnomalies } from '../../api/dashboardRoleConfig'
import { getDashboardAnomalies } from '../../api/dashboards'
import { financeListInvoices } from '../../api/finance'
import { financeListSupplierBills } from '../../api/financeExtended'
import { listLocations } from '../../api/locations'
import { listCampaigns, listPromotions, listSegments } from '../../api/marketing'
import { listPosSales } from '../../api/posSales'
import { listPaymentRuns, listFixedAssets, listWorkflowRules } from '../../api/productionFinance'
import { listPurchaseOrders } from '../../api/procurement'
import { retailListProducts } from '../../api/retail'
import { listTenantRoles } from '../../api/tenantRoles'
import { listTenantUsers } from '../../api/userTenant'
import { accessibleDashboardRoles } from '../../security/roleAccess'
import { useAuthStore } from '../../stores/authStore'
import { useAlertStore } from '../../stores/alertStore'
import type { Role } from '../../types/roles'
import {
  filterNavItems,
  ROLE_DASHBOARD_ICON,
  ROLE_DASHBOARD_LABEL,
  roleDashboardPath,
} from './navConfig'

interface SearchEntry {
  id: string
  label: string
  to: string
  group: string
  icon: React.ComponentType<{ className?: string }>
  searchText: string
  description?: string
  state?: Record<string, unknown>
}

interface GlobalSearchProps {
  role: Role
}

function normalizeSearchText(...parts: Array<string | number | null | undefined>) {
  return parts
    .filter((part): part is string | number => part !== null && part !== undefined && `${part}`.trim().length > 0)
    .join(' ')
    .toLowerCase()
}

function matchesSearch(searchText: string, query: string) {
  const terms = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
  if (!terms.length) {
    return true
  }
  return terms.every((term) => searchText.includes(term))
}

function scoreSearch(entry: SearchEntry, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) {
    return 0
  }
  const label = entry.label.toLowerCase()
  if (label === q) {
    return 0
  }
  if (label.startsWith(q)) {
    return 1
  }
  const labelIndex = label.indexOf(q)
  if (labelIndex >= 0) {
    return 10 + labelIndex
  }
  const searchIndex = entry.searchText.indexOf(q)
  if (searchIndex >= 0) {
    return 100 + searchIndex
  }
  return 1000
}

function scopeAllowed(allowedScopes: Set<string>, ...scopes: string[]) {
  return allowedScopes.size === 0 || scopes.some((scope) => allowedScopes.has(scope))
}

async function safeLoad<T>(loader: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await loader()
  } catch {
    return fallback
  }
}

function shortCode(value: string) {
  return value.slice(0, 8).toUpperCase()
}

export function GlobalSearch({ role }: GlobalSearchProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const tenantId = useAuthStore((s) => s.tenantId)
  const permissions = useAuthStore((s) => s.permissions)
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const effectiveRoleProfile = useAuthStore((s) => s.effectiveRoleProfile)
  const currentAlerts = useAlertStore((state) => state.alerts)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const normalizedQuery = query.trim().toLowerCase()
  const allowedSearchScopes = useMemo(() => new Set(effectiveRoleProfile.searchScopes), [effectiveRoleProfile.searchScopes])
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const searchFrom = useMemo(() => {
    const date = new Date()
    date.setDate(date.getDate() - 120)
    return date.toISOString().slice(0, 10)
  }, [])

  const canSearchInvoices = hasPermission('FINANCE_READ') && scopeAllowed(allowedSearchScopes, 'credit-ledger')
  const canSearchSupplierBills = hasPermission('FINANCE_READ') && scopeAllowed(allowedSearchScopes, 'supplier-bills')
  const canSearchBankAccounts = hasPermission('FINANCE_READ') && scopeAllowed(allowedSearchScopes, 'bank-reconciliation')
  const canSearchPaymentRuns = hasPermission('FINANCE_READ') && scopeAllowed(allowedSearchScopes, 'payment-runs')
  const canSearchFixedAssets = hasPermission('FINANCE_READ') && scopeAllowed(allowedSearchScopes, 'fixed-assets')
  const canSearchPurchaseOrders = hasPermission('PROCUREMENT_READ') && scopeAllowed(allowedSearchScopes, 'purchase-order')
  const canSearchPosSales =
    (hasPermission('POS_ACCESS') || hasPermission('ANALYTICS_OWN')) && scopeAllowed(allowedSearchScopes, 'pos-history', 'pos')
  const canSearchRetail = hasPermission('INVENTORY_READ') && scopeAllowed(allowedSearchScopes, 'retail')
  const canSearchMarketingCampaigns = hasPermission('ANALYTICS_ALL') && scopeAllowed(allowedSearchScopes, 'marketing-campaigns')
  const canSearchPromotions = hasPermission('ANALYTICS_ALL') && scopeAllowed(allowedSearchScopes, 'promotions')
  const canSearchWorkflowRules = hasPermission('ROLE_MANAGE') && scopeAllowed(allowedSearchScopes, 'workflow-rules')
  const canSearchRoles = hasPermission('ROLE_MANAGE') && scopeAllowed(allowedSearchScopes, 'admin-roles')
  const canSearchUsers =
    Boolean(tenantId) &&
    (hasPermission('USER_MANAGE') || hasPermission('TENANT_CONFIG') || hasPermission('ROLE_MANAGE')) &&
    scopeAllowed(allowedSearchScopes, 'users-tenants')

  const anomaliesQuery = useQuery({
    queryKey: ['global-search-anomalies', role],
    queryFn: () => getDashboardAnomalies(role),
    enabled: open && rolesWithAnomalies.includes(role),
    staleTime: 60_000,
  })

  const actionsQuery = useQuery({
    queryKey: ['global-search-actions', role],
    queryFn: () => getRecommendedActions(role),
    enabled: open,
    staleTime: 60_000,
  })

  const recordsQuery = useQuery({
    queryKey: ['global-search-records', role, tenantId ?? 'no-tenant', normalizedQuery],
    enabled: open && normalizedQuery.length >= 2,
    staleTime: 30_000,
    queryFn: async (): Promise<SearchEntry[]> => {
      const [
        invoices,
        supplierBills,
        bankAccounts,
        purchaseOrders,
        campaigns,
        promotions,
        segments,
        posSales,
        products,
        locations,
        paymentRuns,
        fixedAssets,
        workflowRules,
        tenantRoles,
        tenantUsers,
      ] = await Promise.all([
        canSearchInvoices ? safeLoad(() => financeListInvoices({ customerName: normalizedQuery }), []) : Promise.resolve([]),
        canSearchSupplierBills ? safeLoad(() => financeListSupplierBills({ supplierName: normalizedQuery }), []) : Promise.resolve([]),
        canSearchBankAccounts ? safeLoad(() => listBankAccounts(), []) : Promise.resolve([]),
        canSearchPurchaseOrders ? safeLoad(() => listPurchaseOrders(undefined, 0, 25), []) : Promise.resolve([]),
        canSearchMarketingCampaigns ? safeLoad(() => listCampaigns(0, 25), []) : Promise.resolve([]),
        canSearchPromotions ? safeLoad(() => listPromotions(0, 25), []) : Promise.resolve([]),
        canSearchMarketingCampaigns ? safeLoad(() => listSegments(), []) : Promise.resolve([]),
        canSearchPosSales
          ? safeLoad(() => listPosSales({ from: searchFrom, to: today, search: normalizedQuery, page: 0, size: 12 }), { rows: [], total: 0 })
          : Promise.resolve({ rows: [], total: 0 }),
        canSearchRetail ? safeLoad(() => retailListProducts(), []) : Promise.resolve([]),
        canSearchRetail ? safeLoad(() => listLocations(), []) : Promise.resolve([]),
        canSearchPaymentRuns ? safeLoad(() => listPaymentRuns(), []) : Promise.resolve([]),
        canSearchFixedAssets ? safeLoad(() => listFixedAssets(0, 25), { content: [] }) : Promise.resolve({ content: [] }),
        canSearchWorkflowRules ? safeLoad(() => listWorkflowRules(), []) : Promise.resolve([]),
        canSearchRoles ? safeLoad(() => listTenantRoles(), []) : Promise.resolve([]),
        canSearchUsers && tenantId
          ? safeLoad(() => listTenantUsers(tenantId, { page: 0, size: 20, query: normalizedQuery }), { rows: [], total: 0 })
          : Promise.resolve({ rows: [], total: 0 }),
      ])

      const list: SearchEntry[] = []

      for (const invoice of invoices.slice(0, 8)) {
        list.push({
          id: `invoice-${invoice.invoiceId}`,
          label: `${invoice.customerName} • Invoice ${shortCode(invoice.invoiceId)}`,
          description: `${invoice.status} · ${invoice.currencyCode} ${invoice.outstandingAmount}`,
          to: invoice.customerId ? `/finance/customers/${invoice.customerId}` : '/finance/credit-ledger',
          group: 'Invoices',
          icon: FileText,
          searchText: normalizeSearchText(
            invoice.customerName,
            invoice.invoiceId,
            invoice.status,
            invoice.currencyCode,
            invoice.amount,
            invoice.outstandingAmount,
            'invoice customer finance',
          ),
        })
      }

      for (const bill of supplierBills.slice(0, 8)) {
        list.push({
          id: `supplier-bill-${bill.supplierBillId}`,
          label: `${bill.supplierName} • Bill ${bill.reference || shortCode(bill.supplierBillId)}`,
          description: `${bill.status} · ${bill.currencyCode} ${bill.outstandingAmount}`,
          to: bill.supplierId ? `/finance/suppliers/${bill.supplierId}` : '/finance/supplier-bills',
          group: 'Supplier bills',
          icon: FileText,
          searchText: normalizeSearchText(
            bill.supplierName,
            bill.reference,
            bill.supplierBillId,
            bill.status,
            bill.currencyCode,
            bill.amount,
            'supplier bill finance',
          ),
        })
      }

      for (const sale of posSales.rows.slice(0, 10)) {
        list.push({
          id: `pos-sale-${sale.salesOrderId}`,
          label: `${sale.receiptNumber} • ${sale.customerName}`,
          description: `${sale.status} · ${sale.currencyCode} ${sale.totalAmount}`,
          to: `/pos/receipts/${sale.salesOrderId}/print`,
          group: 'Sales',
          icon: ShoppingBag,
          searchText: normalizeSearchText(
            sale.receiptNumber,
            sale.customerName,
            sale.salesOrderId,
            sale.cashierId,
            sale.status,
            sale.tender,
            'sale receipt pos history',
          ),
        })
      }

      for (const product of products.filter((item) => matchesSearch(normalizeSearchText(item.name, item.sku, item.productId), normalizedQuery)).slice(0, 8)) {
        list.push({
          id: `product-${product.productId}`,
          label: product.name,
          description: product.sku ? `SKU ${product.sku}` : 'Retail product',
          to: '/retail',
          group: 'Products',
          icon: Package,
          searchText: normalizeSearchText(product.name, product.sku, product.unit, product.productId, 'product retail inventory'),
        })
      }

      for (const location of locations.filter((item) => matchesSearch(normalizeSearchText(item.name, item.locationCode, item.id), normalizedQuery)).slice(0, 8)) {
        list.push({
          id: `location-${location.id}`,
          label: location.name,
          description: location.locationCode ? `Location ${location.locationCode}` : 'Business location',
          to: '/retail',
          group: 'Locations',
          icon: MapPin,
          searchText: normalizeSearchText(location.name, location.locationCode, location.currencyDefault, location.id, 'location inventory retail'),
        })
      }

      for (const account of bankAccounts.filter((item) => matchesSearch(normalizeSearchText(item.accountName, item.accountNumber, item.bankName, item.id), normalizedQuery)).slice(0, 8)) {
        list.push({
          id: `bank-${account.id}`,
          label: account.accountName,
          description: `${account.bankName} · ${account.accountNumber}`,
          to: '/finance/bank-accounts',
          group: 'Bank accounts',
          icon: Landmark,
          searchText: normalizeSearchText(
            account.accountName,
            account.accountNumber,
            account.bankName,
            account.currencyCode,
            account.id,
            'bank account reconciliation finance',
          ),
        })
      }

      for (const po of purchaseOrders.filter((item) => matchesSearch(normalizeSearchText(item.poNumber, item.supplierName, item.id), normalizedQuery)).slice(0, 8)) {
        list.push({
          id: `po-${po.id}`,
          label: `${po.poNumber} • ${po.supplierName}`,
          description: `${po.status} · ${po.currencyCode} ${po.totalAmount}`,
          to: '/procurement/purchase-orders',
          group: 'Purchase orders',
          icon: FileText,
          searchText: normalizeSearchText(po.poNumber, po.supplierName, po.status, po.id, 'purchase order procurement'),
        })
      }

      for (const campaign of campaigns.filter((item) => matchesSearch(normalizeSearchText(item.name, item.channel, item.status, item.id), normalizedQuery)).slice(0, 8)) {
        list.push({
          id: `campaign-${campaign.id}`,
          label: campaign.name,
          description: `${campaign.channel ?? 'Campaign'}${campaign.status ? ` · ${campaign.status}` : ''}`,
          to: '/marketing/campaigns',
          group: 'Campaigns',
          icon: Megaphone,
          searchText: normalizeSearchText(campaign.name, campaign.channel, campaign.status, campaign.id, 'marketing campaign'),
        })
      }

      for (const promotion of promotions.filter((item) => matchesSearch(normalizeSearchText(item.name, item.code, item.status, item.id), normalizedQuery)).slice(0, 8)) {
        list.push({
          id: `promotion-${promotion.id}`,
          label: promotion.name,
          description: `${promotion.code ?? 'Promotion'}${promotion.status ? ` · ${promotion.status}` : ''}`,
          to: '/marketing/promotions',
          group: 'Promotions',
          icon: Tag,
          searchText: normalizeSearchText(promotion.name, promotion.code, promotion.status, promotion.discountType, promotion.id, 'promotion marketing'),
        })
      }

      for (const segment of segments.filter((item) => matchesSearch(normalizeSearchText(item.segment, item.customerCount), normalizedQuery)).slice(0, 8)) {
        list.push({
          id: `segment-${segment.segment}`,
          label: segment.segment,
          description: `${segment.customerCount} customers`,
          to: '/marketing/campaigns',
          group: 'Segments',
          icon: Users,
          searchText: normalizeSearchText(segment.segment, segment.customerCount, 'segment marketing customer'),
        })
      }

      for (const run of paymentRuns.filter((item) => matchesSearch(normalizeSearchText(item.id, item.status, item.notes), normalizedQuery)).slice(0, 8)) {
        list.push({
          id: `payment-run-${run.id}`,
          label: `Payment run ${shortCode(run.id)}`,
          description: `${run.status} · ${run.currencyCode} ${run.totalAmount}`,
          to: '/finance/payment-runs',
          group: 'Payment runs',
          icon: Landmark,
          searchText: normalizeSearchText(run.id, run.status, run.notes, run.runDate, 'payment run finance'),
        })
      }

      for (const asset of fixedAssets.content.filter((item) => matchesSearch(normalizeSearchText(item.assetName, item.category, item.id), normalizedQuery)).slice(0, 8)) {
        list.push({
          id: `asset-${asset.id}`,
          label: asset.assetName,
          description: `${asset.category} · ${asset.status}`,
          to: '/finance/assets',
          group: 'Fixed assets',
          icon: Package,
          searchText: normalizeSearchText(asset.assetName, asset.category, asset.status, asset.id, 'fixed asset finance'),
        })
      }

      for (const rule of workflowRules.filter((item) => matchesSearch(normalizeSearchText(item.name, item.triggerEvent, item.id), normalizedQuery)).slice(0, 8)) {
        list.push({
          id: `workflow-rule-${rule.id}`,
          label: rule.name,
          description: `${rule.triggerEvent}${rule.active ? ' · Active' : ' · Inactive'}`,
          to: '/admin/workflow-rules',
          group: 'Workflow rules',
          icon: FileText,
          searchText: normalizeSearchText(rule.name, rule.triggerEvent, rule.id, rule.conditionsJson, rule.actionsJson, 'workflow rule automation'),
        })
      }

      for (const tenantRole of tenantRoles.filter((item) => matchesSearch(normalizeSearchText(item.name, item.description, item.id), normalizedQuery)).slice(0, 8)) {
        list.push({
          id: `tenant-role-${tenantRole.id}`,
          label: tenantRole.name,
          description: tenantRole.description ?? 'Tenant role',
          to: '/admin/roles',
          group: 'Roles',
          icon: Users,
          searchText: normalizeSearchText(tenantRole.name, tenantRole.description, tenantRole.id, 'role permission team admin'),
        })
      }

      for (const user of tenantUsers.rows.slice(0, 8)) {
        list.push({
          id: `tenant-user-${user.id}`,
          label: user.name,
          description: `${user.email} · ${user.roleName ?? user.role}`,
          to: '/admin/users-tenants',
          group: 'Users',
          icon: Users,
          searchText: normalizeSearchText(user.name, user.email, user.roleName, user.role, user.status, user.id, 'user team tenant'),
        })
      }

      return list
    },
  })

  const entries = useMemo(() => {
    const list: SearchEntry[] = []
    for (const r of accessibleDashboardRoles(role, permissions, effectiveRoleProfile)) {
      if (!scopeAllowed(allowedSearchScopes, `dashboard:${r}`)) {
        continue
      }
      list.push({
        id: `dash-${r}`,
        label: ROLE_DASHBOARD_LABEL[r],
        to: roleDashboardPath(r),
        group: t('nav.groupOverview'),
        icon: ROLE_DASHBOARD_ICON[r],
        searchText: `${ROLE_DASHBOARD_LABEL[r]} dashboard ${r} ${roleDashboardPath(r)}`.toLowerCase(),
      })
    }
    for (const item of filterNavItems(hasPermission, effectiveRoleProfile.navItemIds)) {
      if (!scopeAllowed(allowedSearchScopes, item.id)) {
        continue
      }
      list.push({
        id: item.id,
        label: t(item.labelKey),
        to: item.to,
        group: t(item.group),
        icon: item.icon,
        searchText: `${t(item.labelKey)} ${item.searchLabel} ${item.group} ${item.id} ${item.to}`.toLowerCase(),
      })
    }
    for (const alert of currentAlerts) {
      list.push({
        id: `alert-${alert.id}`,
        label: alert.title,
        to: `/alerts/${alert.id}`,
        group: 'Alerts',
        icon: Bell,
        searchText: `${alert.title} ${alert.message} ${alert.severity} alert`.toLowerCase(),
        state: { alert },
      })
    }
    for (const anomaly of anomaliesQuery.data ?? []) {
      list.push({
        id: `anomaly-${anomaly.id}`,
        label: anomaly.title,
        to: `/anomalies/${anomaly.id}`,
        group: 'Anomalies',
        icon: AlertTriangle,
        searchText: `${anomaly.title} ${anomaly.details} ${anomaly.severity} anomaly`.toLowerCase(),
        state: { anomaly },
      })
    }
    for (const action of actionsQuery.data ?? []) {
      if (!action.targetRoute) {
        continue
      }
      list.push({
        id: `action-${action.id}`,
        label: action.title,
        to: action.targetRoute,
        group: 'Actions',
        icon: Play,
        searchText: `${action.title} ${action.description} ${action.priority} ${action.type} action ${action.targetRoute}`.toLowerCase(),
      })
    }
    if (normalizedQuery.length >= 2) {
      list.push(...(recordsQuery.data ?? []))
    }
    return list
  }, [role, permissions, effectiveRoleProfile, hasPermission, t, currentAlerts, anomaliesQuery.data, actionsQuery.data, recordsQuery.data, allowedSearchScopes, normalizedQuery.length])

  const filtered = useMemo(() => {
    const q = normalizedQuery
    if (!q) {
      return entries.slice(0, 12)
    }
    return [...entries]
      .filter((entry) => matchesSearch(entry.searchText, q))
      .sort((left, right) => scoreSearch(left, q) - scoreSearch(right, q))
      .slice(0, 24)
  }, [entries, normalizedQuery])

  const openPalette = useCallback(() => {
    setOpen(true)
    setQuery('')
    setActiveIndex(0)
  }, [])

  const closePalette = useCallback(() => {
    setOpen(false)
    setQuery('')
  }, [])

  const goTo = useCallback(
    (entry: SearchEntry) => {
      navigate(entry.to, entry.state ? { state: entry.state } : undefined)
      closePalette()
    },
    [navigate, closePalette],
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        openPalette()
        return
      }
      if (!open) {
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        closePalette()
        return
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, Math.max(0, filtered.length - 1)))
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
        return
      }
      if (event.key === 'Enter' && filtered[activeIndex]) {
        event.preventDefault()
        goTo(filtered[activeIndex])
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, filtered, activeIndex, openPalette, closePalette, goTo])

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
    }
  }, [open])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  return (
    <>
      <button
        type="button"
        className="topbar__icon-btn"
        onClick={openPalette}
        aria-label={t('globalSearch.open')}
        title={t('globalSearch.openHint')}
      >
        <Search className="h-4 w-4" />
      </button>

      {open
        ? createPortal(
            <div
              className="command-palette-backdrop"
              role="presentation"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  closePalette()
                }
              }}
            >
              <div className="command-palette" role="dialog" aria-modal="true" aria-label={t('globalSearch.title')}>
                <div className="command-palette__input-wrap">
                  <Search className="h-5 w-5 shrink-0 text-[var(--color-brand-700)]" aria-hidden />
                  <input
                    ref={inputRef}
                    className="command-palette__input"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t('globalSearch.placeholder')}
                    aria-label={t('globalSearch.placeholder')}
                  />
                  <kbd className="command-palette__hint">Esc</kbd>
                </div>
                <ul className="command-palette__list" role="listbox">
                  {filtered.length === 0 ? (
                    <li className="command-palette__empty">{t('nav.searchEmpty')}</li>
                  ) : (
                    filtered.map((entry, index) => {
                      const Icon = entry.icon
                      return (
                        <li key={entry.id} role="option" aria-selected={index === activeIndex}>
                          <button
                            type="button"
                            className="command-palette__item"
                            data-active={index === activeIndex ? 'true' : 'false'}
                            onClick={() => goTo(entry)}
                            onMouseEnter={() => setActiveIndex(index)}
                          >
                            <Icon className="command-palette__item-icon h-4 w-4" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate">{entry.label}</span>
                              {entry.description ? (
                                <span className="block truncate text-xs text-[var(--text-muted)]">{entry.description}</span>
                              ) : null}
                            </span>
                            <span className="command-palette__item-meta">{entry.group}</span>
                          </button>
                        </li>
                      )
                    })
                  )}
                </ul>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
