import { useEffect } from 'react'
import { Check, MessageCircle, Printer, Smartphone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, Modal } from '../../components/ui'

export interface PosReceiptSuccessModalProps {
  open: boolean
  amountLabel: string
  receiptNumber: string
  printing?: boolean
  onPrint: () => void
  onWhatsApp: () => void
  onSms: () => void
  onNewSale: () => void
}

export function PosReceiptSuccessModal({
  open,
  amountLabel,
  receiptNumber,
  printing,
  onPrint,
  onWhatsApp,
  onSms,
  onNewSale,
}: PosReceiptSuccessModalProps) {
  const { t } = useTranslation()

  useEffect(() => {
    if (!open) {
      return
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <Modal
      open={open}
      onClose={onNewSale}
      title={t('pos.paymentReceived')}
      size="sm"
      footer={
        <Button variant="primary" fullWidth onClick={onNewSale}>
          {t('pos.newSale')}
        </Button>
      }
    >
      <div className="pos-receipt-success__check" aria-hidden>
        <div className="pos-receipt-success__check-ring">
          <Check size={40} strokeWidth={2.5} color="var(--color-success)" />
        </div>
      </div>
      <p className="pos-receipt-success__amount num">{amountLabel}</p>
      <p className="pos-receipt-success__receipt-no">
        {t('pos.receiptNumber', { number: receiptNumber })}
      </p>
      <div className="pos-receipt-success__actions">
        <Button variant="secondary" fullWidth icon={<Printer size={18} />} onClick={onPrint} loading={printing}>
          {t('pos.printReceiptBtn')}
        </Button>
        <Button variant="secondary" fullWidth icon={<MessageCircle size={18} />} onClick={onWhatsApp}>
          {t('pos.sendWhatsApp')}
        </Button>
        <Button variant="secondary" fullWidth icon={<Smartphone size={18} />} onClick={onSms}>
          {t('pos.sendSms')}
        </Button>
      </div>
    </Modal>
  )
}
