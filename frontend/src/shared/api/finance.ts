import { apiClient } from './client'
import type { AxiosResponse } from 'axios'

export type InvoiceLedgerRow = {
  invoiceId: string
  customerId?: string
  customerName: string
  amount: string
  appliedAmount: string
  outstandingAmount: string
  currencyCode: string
  dueDate: string
  status: string
  createdAt: string
  overdue: boolean
}

export async function financeListInvoices(params?: {
  status?: string
  customerName?: string
}): Promise<InvoiceLedgerRow[]> {
  const { data } = await apiClient.get<InvoiceLedgerRow[]>('/api/v1/finance/invoices', {
    params: {
      ...(params?.status ? { status: params.status } : {}),
      ...(params?.customerName ? { customerName: params.customerName } : {}),
    },
  })
  return data
}

export async function accountingCreatePayment(payload: {
  direction: 'INCOMING' | 'OUTGOING'
  counterparty: string
  amount: string
  currencyCode: string
}): Promise<{ paymentId: string }> {
  const { data } = await apiClient.post<{ paymentId: string }>(
    '/api/v1/accounting/payments',
    payload,
    {
      headers: { 'Idempotency-Key': crypto.randomUUID() },
    },
  )
  return data
}

export async function accountingApplyPayment(payload: {
  paymentId: string
  targetType: 'INVOICE' | 'SUPPLIER_BILL'
  targetId: string
  appliedAmount: string
}): Promise<{ applicationId: string }> {
  const { data } = await apiClient.post<{ applicationId: string }>(
    '/api/v1/accounting/payments/apply',
    payload,
    {
      headers: { 'Idempotency-Key': crypto.randomUUID() },
    },
  )
  return data
}

export type PaymentApplicationRow = {
  applicationId: string
  paymentId: string
  appliedAmount: string
  createdAt: string
  currencyCode?: string
  counterparty?: string
  paymentStatus?: string
}

export async function accountingListPaymentApplications(params: {
  targetType: 'INVOICE' | 'SUPPLIER_BILL'
  targetId: string
}): Promise<PaymentApplicationRow[]> {
  const { data } = await apiClient.get<PaymentApplicationRow[]>(
    '/api/v1/accounting/payments/applications',
    { params },
  )
  return data
}

export type NotificationSmsDeliveryRow = {
  id: string
  tenantId: string
  notificationEventId: string
  eventType: string
  recipientPhone: string
  status: 'SENT' | 'FAILED' | 'DRY_RUN' | string
  responseCode?: number
  errorMessage?: string
  createdAt: string
}

export async function notificationsSmsDeliveries(params?: {
  eventId?: string
  page?: number
  size?: number
}): Promise<NotificationSmsDeliveryRow[]> {
  const { data } = await apiClient.get<NotificationSmsDeliveryRow[]>(
    '/api/v1/notifications/sms-deliveries',
    {
      params: {
        ...(params?.eventId ? { eventId: params.eventId } : {}),
        ...(params?.page !== undefined ? { page: params.page } : {}),
        ...(params?.size !== undefined ? { size: params.size } : {}),
      },
    },
  )
  return data
}

export async function notificationsSmsDeliveriesCsv(params?: {
  eventId?: string
  status?: string
  phone?: string
  limit?: number
}): Promise<AxiosResponse<Blob>> {
  return apiClient.get('/api/v1/notifications/sms-deliveries/export', {
    params: {
      ...(params?.eventId ? { eventId: params.eventId } : {}),
      ...(params?.status ? { status: params.status } : {}),
      ...(params?.phone ? { phone: params.phone } : {}),
      ...(params?.limit !== undefined ? { limit: params.limit } : {}),
    },
    responseType: 'blob',
  })
}
