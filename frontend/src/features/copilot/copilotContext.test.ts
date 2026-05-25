import { describe, expect, it } from 'vitest'
import { resolveCopilotContext } from './copilotContext'

describe('resolveCopilotContext', () => {
  it('maps invoice route to invoice workspace context', () => {
    const context = resolveCopilotContext({
      pathname: '/transactions/invoice',
      role: 'CFO',
      dateRange: { from: '2026-05-01', to: '2026-05-25', preset: 'MTD' },
    })

    expect(context.sectionKey).toBe('invoice')
    expect(context.sectionLabel).toBe('Invoice workspace')
    expect(context.allowedActionTypes).toContain('CREATE_INVOICE')
    expect(context.suggestedPrompts?.[0]).toContain('invoice')
  })

  it('extracts entity id for customer finance records', () => {
    const context = resolveCopilotContext({
      pathname: '/finance/customers/3f38d0bd-978a-453d-b525-995581899f3e',
      role: 'ACCOUNTING',
    })

    expect(context.sectionKey).toBe('finance-customer-record')
    expect(context.entityType).toBe('customer')
    expect(context.entityId).toBe('3f38d0bd-978a-453d-b525-995581899f3e')
  })

  it('falls back to a generic workspace context', () => {
    const context = resolveCopilotContext({
      pathname: '/unknown-page',
      role: 'CEO',
    })

    expect(context.sectionKey).toBe('workspace')
    expect(context.suggestedPrompts?.length).toBeGreaterThan(0)
  })
})
