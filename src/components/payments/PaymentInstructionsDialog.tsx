import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'

interface PaymentInstructionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const paymentAccount = [
  ['Bank Name', 'Wise Pilipinas Inc.'],
  ['Account Holder', 'Cashew Solutions OPC'],
  ['Account Number', '2004079043']
]

export function PaymentInstructionsDialog({
  open,
  onOpenChange
}: PaymentInstructionsDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Payment Instructions
          </DialogTitle>
          <DialogDescription>
            Please deposit your payment to the account below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-md border bg-muted/30 p-4">
          {paymentAccount.map(([label, value]) => (
            <div
              key={label}
              className="flex items-start justify-between gap-4 text-sm"
            >
              <span className="text-muted-foreground">
                {label}
              </span>
              <span className="text-right font-semibold">
                {value}
              </span>
            </div>
          ))}
        </div>

        <p className="text-sm text-muted-foreground">
          After depositing, keep your transaction receipt for payment verification.
        </p>
      </DialogContent>
    </Dialog>
  )
}
