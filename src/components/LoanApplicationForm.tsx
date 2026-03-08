import { useEffect, useMemo, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { Wallet, FileText, Tag } from 'lucide-react'

interface LoanApplicationFormProps {
  user?: User | null
}

interface LoanCalculation {
  interest: number
  total: number
  payment: number
  frequency: 'daily' | 'semi-monthly'
  periods: number
}

/*
Loan Calculation Logic
*/
function calculateLoanPayment(
  amount: number,
  termMonths: number,
  loanType: string
): LoanCalculation | null {

  if (!amount || !termMonths) return null

  // EMERGENCY LOAN
  if (loanType === 'emergency') {

    const days = 30
    const dailyRate = 0.004

    const interest = amount * dailyRate * days
    const total = amount + interest
    const payment = total / days

    return {
      interest,
      total,
      payment,
      frequency: 'daily',
      periods: days
    }
  }

  // CONVENTIONAL LOAN

  const interest = amount * 0.10 * termMonths
  const total = amount + interest
  const periods = termMonths * 2
  const payment = total / periods

  return {
    interest,
    total,
    payment,
    frequency: 'semi-monthly',
    periods
  }
}

const LoanApplicationForm = ({ user }: LoanApplicationFormProps) => {

  const [loanAmount, setLoanAmount] = useState('')
  const [loanTerm, setLoanTerm] = useState('')
  const [loanPurpose, setLoanPurpose] = useState('')
  const [loanType, setLoanType] = useState('')
  const [promoCode, setPromoCode] = useState('')

  const [hasPaidOffLoan, setHasPaidOffLoan] = useState(false)
  const [loadingEligibility, setLoadingEligibility] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const { toast } = useToast()

  /*
  Check eligibility
  */
  useEffect(() => {

    const checkEligibility = async () => {

      if (!user) return

      setLoadingEligibility(true)

      const { data } = await supabase
        .from('loans')
        .select('id')
        .eq('internal_user_id', user.id)
        .eq('status', 'paid_off')
        .limit(1)

      setHasPaidOffLoan((data?.length || 0) > 0)

      setLoadingEligibility(false)
    }

    checkEligibility()

  }, [user])


  /*
  Available terms
  */
  const availableTerms = useMemo(() => {

    if (loanType === 'emergency') return ['1']

    return hasPaidOffLoan ? ['1', '2', '3'] : ['1', '2']

  }, [loanType, hasPaidOffLoan])


  /*
  Loan calculation
  */
  const loanCalculation = useMemo(() => {

    const amount = Number(loanAmount)
    const term = Number(loanTerm)

    if (!amount || !term || !loanType) return null

    return calculateLoanPayment(amount, term, loanType)

  }, [loanAmount, loanTerm, loanType])


  /*
  Submit
  */
  const submitApplication = async () => {

    const amount = Number(loanAmount)

    if (!amount || !loanTerm || !loanPurpose.trim() || !loanType) {

      toast({
        title: 'Missing required fields',
        description: 'Amount, term, loan type, and purpose are required.',
        variant: 'destructive'
      })

      return
    }

    setSubmitting(true)

    try {

      const payload = {
        user_id: user?.id || '',
        personalInfo: {
          firstName: user?.user_metadata?.first_name || '',
          middleName: user?.user_metadata?.middle_name || '',
          lastName: user?.user_metadata?.last_name || '',
          email: user?.email || '',
          promoCode: promoCode || ''
        },
        loanInfo: {
          loanAmount,
          loanTerm,
          loanPurpose: loanPurpose.trim(),
          loanType
        }
      }

      const { error } = await supabase.functions.invoke(
        'loan_application_submission',
        { body: payload }
      )

      if (error) throw error

      toast({
        title: 'Application submitted',
        description: 'Your loan request has been received.'
      })

      setLoanAmount('')
      setLoanTerm('')
      setLoanPurpose('')
      setLoanType('')
      setPromoCode('')

    } catch (err: any) {

      toast({
        title: 'Submission failed',
        description: err.message,
        variant: 'destructive'
      })

    } finally {
      setSubmitting(false)
    }

  }


  return (

    <div className="max-w-5xl mx-auto">

      <div className="grid md:grid-cols-2 gap-6">

        {/* LEFT PANEL */}

        <Card>

          <CardHeader>
            <CardTitle>Loan Details</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">

            {/* Loan Type */}

            <div className="space-y-2">

              <Label>Loan Type</Label>

              <Select
                value={loanType}
                onValueChange={(value) => {

                  setLoanType(value)

                  if (value === 'emergency') {
                    setLoanTerm('1')
                  }

                }}
              >

                <SelectTrigger>
                  <SelectValue placeholder="Select loan type" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="conventional">Conventional</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>

              </Select>

            </div>


            {/* Amount */}

            <div className="space-y-2">

              <Label>Amount</Label>

              <div className="flex items-center gap-2">

                <Wallet className="w-4 h-4 text-muted-foreground" />

                <Input
                  type="number"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(e.target.value)}
                  placeholder="5000"
                />

              </div>

            </div>


            {/* Term */}

            <div className="space-y-2">

              <Label>Term</Label>

              <Select
                value={loanTerm}
                onValueChange={setLoanTerm}
                disabled={loanType === 'emergency'}
              >

                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingEligibility
                        ? 'Checking eligibility...'
                        : 'Select term'
                    }
                  />
                </SelectTrigger>

                <SelectContent>

                  {availableTerms.map((term) => (
                    <SelectItem key={term} value={term}>
                      {term} month
                    </SelectItem>
                  ))}

                </SelectContent>

              </Select>

              <p className="text-xs text-muted-foreground">

                {loanType === 'emergency'
                  ? 'Emergency loans are limited to 30 days.'
                  : hasPaidOffLoan
                    ? 'Returning borrowers can apply up to 3 months.'
                    : 'New borrowers may apply for 1–2 months.'}

              </p>

            </div>


            {/* Purpose */}

            <div className="space-y-2">

              <Label>Purpose</Label>

              <div className="flex items-start gap-2">

                <FileText className="w-4 h-4 mt-2 text-muted-foreground" />

                <Textarea
                  value={loanPurpose}
                  onChange={(e) => setLoanPurpose(e.target.value)}
                  placeholder="Briefly describe how you will use the loan"
                  rows={4}
                />

              </div>

            </div>


            {/* Promo Code */}

            <div className="space-y-2">

              <Label>Promo Code (optional)</Label>

              <div className="flex items-center gap-2">

                <Tag className="w-4 h-4 text-muted-foreground" />

                <Input
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Enter referral or promo code"
                />

              </div>

            </div>

          </CardContent>

        </Card>


        {/* SUMMARY PANEL */}

        <Card className="bg-muted/40 border-dashed">

          <CardHeader>
            <CardTitle>Loan Summary</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">

            <div className="flex justify-between text-sm">
              <span>Loan Type</span>
              <span className="font-semibold">{loanType || '-'}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span>Loan Amount</span>
              <span className="font-semibold">₱{loanAmount || '0'}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span>Term</span>
              <span className="font-semibold">
                {loanTerm || '-'} month
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span>Total Repayment</span>
              <span className="font-semibold">
                {loanCalculation
                  ? `₱${loanCalculation.total.toFixed(0)}`
                  : '-'}
              </span>
            </div>

            <div className="flex justify-between text-sm">

              <span>
                {loanCalculation?.frequency === 'daily'
                  ? 'Daily Payment'
                  : 'Payment (15 days)'}
              </span>

              <span className="font-semibold">
                {loanCalculation
                  ? `₱${loanCalculation.payment.toFixed(0)}`
                  : '-'}
              </span>

            </div>

            <Button
              className="w-full h-12 text-lg"
              onClick={submitApplication}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Application'}
            </Button>

          </CardContent>

        </Card>

      </div>

    </div>
  )
}

export default LoanApplicationForm