import { z } from 'zod'

const baseSchema = z.object({
  documentNumber: z.string().min(3, 'Document number must be at least 3 characters'),
  partnerName: z.string().min(2, 'Counterparty name is required'),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  currency: z.string().length(3, 'Currency must be a 3-letter code'),
  dueDate: z.string().min(1, 'Due date is required'),
  notes: z.string().max(400, 'Notes must be less than 400 characters').optional(),
})

export const invoiceSchema = baseSchema.extend({
  taxRate: z.coerce.number().min(0, 'Tax rate cannot be negative').max(100, 'Tax rate cannot exceed 100'),
})

export const purchaseOrderSchema = baseSchema.extend({
  costCenter: z.string().min(2, 'Cost center is required'),
})

export const salesOrderSchema = baseSchema.extend({
  expectedCloseDate: z.string().min(1, 'Expected close date is required'),
})

export type InvoiceInput = z.infer<typeof invoiceSchema>
export type PurchaseOrderInput = z.infer<typeof purchaseOrderSchema>
export type SalesOrderInput = z.infer<typeof salesOrderSchema>
