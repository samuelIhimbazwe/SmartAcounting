import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Loader2, Printer, RefreshCw, X } from 'lucide-react'
import { deliverPosReceipt } from '../../shared/api/posSales'
import { normalizeApiError } from '../../shared/api/errors'
import { useModalFocusTrap } from '../../shared/hooks/useModalFocusTrap'
import { openPosReceiptPrint } from '../../utils/posReceiptPrint'
import { isValidReceiptPhone, normalizePhoneInput, RECEIPT_PHONE_HINT } from '../../utils/phoneValidation'
import { Button } from '../../shared/components/ui/Button'

type Channel = 'WHATSAPP' | 'SMS'
type ChannelStatus = 'idle' | 'sending' | 'success' | 'error'

interface ChannelState {
  status: ChannelStatus
  message: string | null
}

interface ReceiptDeliveryModalProps {
  receiptId: string | null
  defaultPhone?: string
  title?: string
  onClose: () => void
}

export function ReceiptDeliveryModal({
  receiptId,
  defaultPhone = '',
  title = 'Send receipt',
  onClose,
}: ReceiptDeliveryModalProps) {
  const open = Boolean(receiptId)
  const containerRef = useModalFocusTrap({ active: open, onEscape: onClose })
  const [phone, setPhone] = useState(defaultPhone)
  const [whatsapp, setWhatsapp] = useState<ChannelState>({ status: 'idle', message: null })
  const [sms, setSms] = useState<ChannelState>({ status: 'idle', message: null })
  const [printStatus, setPrintStatus] = useState<ChannelStatus>('idle')
  const [printError, setPrintError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setPhone(defaultPhone)
      setWhatsapp({ status: 'idle', message: null })
      setSms({ status: 'idle', message: null })
      setPrintStatus('idle')
      setPrintError(null)
    }
  }, [open, defaultPhone, receiptId])

  const phoneValid = isValidReceiptPhone(phone)
  const normalizedPhone = normalizePhoneInput(phone)

  const sendChannel = useCallback(
    async (channel: Channel, setState: (s: ChannelState) => void) => {
      if (!receiptId || !phoneValid) {
        setState({ status: 'error', message: `Enter a valid phone (${RECEIPT_PHONE_HINT})` })
        return
      }
      setState({ status: 'sending', message: null })
      try {
        const res = await deliverPosReceipt(receiptId, { channel, phone: normalizedPhone })
        if (res.ok) {
          setState({ status: 'success', message: res.message })
        } else {
          setState({ status: 'error', message: res.message })
        }
      } catch (err) {
        setState({ status: 'error', message: normalizeApiError(err).message })
      }
    },
    [receiptId, phoneValid, normalizedPhone],
  )

  const handlePrint = async () => {
    if (!receiptId) {
      return
    }
    setPrintStatus('sending')
    setPrintError(null)
    try {
      await openPosReceiptPrint(receiptId)
      setPrintStatus('success')
    } catch (err) {
      setPrintStatus('error')
      setPrintError(normalizeApiError(err).message)
    }
  }

  if (!open || !receiptId) {
    return null
  }

  return createPortal(
    <div ref={containerRef} className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="receipt-delivery-title">
      <div className="modal-panel modal-panel--md">
        <div className="flex items-start justify-between gap-2">
          <h2 id="receipt-delivery-title" className="m-0 text-lg font-semibold">
            {title}
          </h2>
          <button type="button" className="btn btn--sm btn--ghost" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="m-0 mt-1 text-sm text-neutral-600">
          Receipt <span className="font-mono text-xs">{receiptId.slice(0, 8)}…</span>
        </p>

        <label className="mt-4 block text-sm font-medium text-neutral-700">
          Customer phone
          <input
            className="ui-input mt-1"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder={RECEIPT_PHONE_HINT}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <span className="mt-1 block text-xs text-neutral-500">Format: {RECEIPT_PHONE_HINT} or international +…</span>
        </label>

        <ul className="m-0 mt-4 list-none space-y-3 p-0">
          <DeliveryRow
            label="WhatsApp"
            status={whatsapp.status}
            message={whatsapp.message}
            onSend={() => void sendChannel('WHATSAPP', setWhatsapp)}
            onRetry={() => void sendChannel('WHATSAPP', setWhatsapp)}
            disabled={!phoneValid}
          />
          <DeliveryRow
            label="SMS"
            status={sms.status}
            message={sms.message}
            onSend={() => void sendChannel('SMS', setSms)}
            onRetry={() => void sendChannel('SMS', setSms)}
            disabled={!phoneValid}
          />
          <li className="rounded-lg border border-[var(--border-subtle)] p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-neutral-800">Print</span>
              <ChannelIcon status={printStatus} />
            </div>
            <p className="m-0 mt-1 text-xs text-neutral-500">Opens print dialog or desktop printer.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={() => void handlePrint()} disabled={printStatus === 'sending'}>
                <Printer className="h-4 w-4" />
                Print receipt
              </Button>
              {printStatus === 'error' ? (
                <Button type="button" size="sm" variant="ghost" onClick={() => void handlePrint()}>
                  <RefreshCw className="h-4 w-4" />
                  Retry
                </Button>
              ) : null}
            </div>
            {printError ? <p className="m-0 mt-2 text-xs text-red-700">{printError}</p> : null}
          </li>
        </ul>

        <div className="mt-4 flex justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function ChannelIcon({ status }: { status: ChannelStatus }) {
  if (status === 'sending') {
    return <Loader2 className="h-4 w-4 animate-spin text-[var(--color-brand-700)]" aria-hidden />
  }
  if (status === 'success') {
    return <Check className="h-4 w-4 text-emerald-600" aria-hidden />
  }
  return null
}

function DeliveryRow({
  label,
  status,
  message,
  onSend,
  onRetry,
  disabled,
}: {
  label: string
  status: ChannelStatus
  message: string | null
  onSend: () => void
  onRetry: () => void
  disabled: boolean
}) {
  return (
    <li className="rounded-lg border border-[var(--border-subtle)] p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-neutral-800">{label}</span>
        <ChannelIcon status={status} />
      </div>
      {message ? (
        <p className={`m-0 mt-1 text-xs ${status === 'error' ? 'text-red-700' : 'text-neutral-600'}`}>{message}</p>
      ) : null}
      <div className="mt-2">
        {status === 'error' ? (
          <Button type="button" size="sm" variant="ghost" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        ) : status === 'success' ? (
          <span className="text-xs font-medium text-emerald-700">Sent</span>
        ) : (
          <Button type="button" size="sm" onClick={onSend} disabled={disabled || status === 'sending'}>
            {status === 'sending' ? 'Sending…' : `Send via ${label}`}
          </Button>
        )}
      </div>
    </li>
  )
}
