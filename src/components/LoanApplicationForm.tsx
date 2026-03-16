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

interface Props {
  user?: User | null
}

interface LoanCalculation {
  interest: number
  total: number
  payment: number
  frequency: 'daily' | 'semi-monthly'
  periods: number
}

function calculateLoan(amount: number, months: number, type: string): LoanCalculation | null {

  if (!amount || !months) return null

  if (type === 'emergency') {

    const days = 30
    const interest = amount * 0.004 * days
    const total = amount + interest

    return {
      interest,
      total,
      payment: total / days,
      frequency: 'daily',
      periods: days
    }

  }

  const interest = amount * 0.10 * months
  const total = amount + interest
  const periods = months * 2

  return {
    interest,
    total,
    payment: total / periods,
    frequency: 'semi-monthly',
    periods
  }

}

export default function LoanApplicationForm({ user }: Props) {

  const { toast } = useToast()

  const [profile, setProfile] = useState<any>(null)

  const [loanAmount, setLoanAmount] = useState('')
  const [loanTerm, setLoanTerm] = useState('')
  const [loanPurpose, setLoanPurpose] = useState('')
  const [loanType, setLoanType] = useState('')
  const [promoCode, setPromoCode] = useState('')

  const [hasPaidOffLoan, setHasPaidOffLoan] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  /*
  DOCUMENT VALIDATION
  */

  const validateRequiredDocuments = async () => {

    if (!user) {
      return { valid: false, message: 'User not found' }
    }

    const { data, error } = await supabase.storage
      .from('clients_documents')
      .list(user.id)

    if (error) {
      return {
        valid: false,
        message: 'Unable to verify uploaded documents'
      }
    }

    const now = new Date()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(now.getDate() - 30)

    let validPayslip = false
    let validCertificate = false

    for (const file of data || []) {

      const parts = file.name.split('__')
      const type = parts[1] || ''

      const created = new Date(file.created_at || '')

      if (created < thirtyDaysAgo) continue

      if (type === 'payslip') validPayslip = true
      if (type === 'certificate_employment') validCertificate = true

    }

    if (!validPayslip && !validCertificate) {

      return {
        valid: false,
        message:
          'Upload a recent payslip and Certificate of Employment (both within the last 30 days).'
      }

    }

    if (!validPayslip) {

      return {
        valid: false,
        message:
          'Please upload a recent payslip (within the last 30 days).'
      }

    }

    if (!validCertificate) {

      return {
        valid: false,
        message:
          'Please upload a Certificate of Employment issued within the last 30 days.'
      }

    }

    return { valid: true }

  }

  /*
  PROFILE FIELDS
  */

  const requiredProfileFields = useMemo(() => {

    return [

      { label: 'First name', value: profile?.first_name || user?.user_metadata?.first_name || '' },
      { label: 'Last name', value: profile?.last_name || user?.user_metadata?.last_name || '' },
      { label: 'Email', value: profile?.email || user?.email || '' },
      { label: 'Phone', value: profile?.phone || '' },
      { label: 'Address', value: profile?.address || '' },
      { label: "Employer's name", value: profile?.employer_name || profile?.employer || '' },
      { label: "Employer's phone", value: profile?.employer_phone || '' },
      { label: "Employer's address", value: profile?.employer_address || '' },
      { label: 'Position', value: profile?.position || profile?.job_title || profile?.occupation || '' },
      { label: 'Years employed', value: profile?.years_employed ?? '' }

    ]

  }, [profile, user])

  const missingProfileFields = useMemo(() => {

    return requiredProfileFields
      .filter(({ value }) => String(value).trim().length === 0)
      .map(({ label }) => label)

  }, [requiredProfileFields])

  const isProfileComplete = missingProfileFields.length === 0

  /*
  LOAD PROFILE
  */

  useEffect(() => {

    const loadProfile = async () => {

      if (!user) return

      const { data } = await supabase
        .from('userProfiles')
        .select('*')
        .eq('internal_user_id', user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (data) setProfile(data)

    }

    loadProfile()

  }, [user])

  /*
  CHECK ELIGIBILITY
  */

  useEffect(() => {

    const checkLoans = async () => {

      if (!user) return

      const { data } = await supabase
        .from('loans')
        .select('id')
        .eq('internal_user_id', user.id)
        .eq('status', 'paid_off')
        .limit(1)

      setHasPaidOffLoan((data?.length || 0) > 0)

    }

    checkLoans()

  }, [user])

  /*
  TERM OPTIONS
  */

  const terms = useMemo(() => {

    if (loanType === 'emergency') return ['1']

    return hasPaidOffLoan ? ['1', '2', '3'] : ['1', '2']

  }, [loanType, hasPaidOffLoan])

  /*
  CALCULATION
  */

  const calculation = useMemo(() => {

    const amount = Number(loanAmount)
    const term = Number(loanTerm)

    if (!amount || !term || !loanType) return null

    return calculateLoan(amount, term, loanType)

  }, [loanAmount, loanTerm, loanType])

  /*
  SUBMIT
  */

  const submitApplication = async () => {

    const amount = Number(loanAmount)

    if (!amount || !loanTerm || !loanPurpose || !loanType) {

      toast({
        title: 'Missing required fields',
        description: 'Please fill all required fields.',
        variant: 'destructive'
      })

      return
    }

    if (!isProfileComplete) {

      toast({
        title: 'Complete your profile first',
        description: `Missing: ${missingProfileFields.join(', ')}`,
        variant: 'destructive'
      })

      return
    }

    /*
    DOCUMENT VALIDATION
    */

    const docCheck = await validateRequiredDocuments()

    if (!docCheck.valid) {

      toast({
        title: 'Missing required documents',
        description: docCheck.message,
        variant: 'destructive'
      })

      return

    }

    setSubmitting(true)

    try {

      const payload = {

        user_id: user?.id || '',

        personalInfo: {

          firstName: profile?.first_name || '',
          middleName: profile?.middle_name || '',
          lastName: profile?.last_name || '',
          email: profile?.email || '',
          phone: profile?.phone || '',
          address: profile?.address || '',
          promoCode: promoCode || '',
          dateOfBirth: profile?.dob || '',
          referralCode: profile?.referral || ''

        },

        loanInfo: {

          loanAmount: String(loanAmount),
          loanTerm: String(loanTerm),
          loanPurpose: loanPurpose.trim(),
          loanType: loanType

        },

      employmentInfo: {
        employmentLength: profile?.years_employed || '',
        employmentStatus: profile?.employment_status || '',
        company: profile?.employer_name || profile?.employer || '',
        employer_phone: profile?.employer_phone || '',
        employer_address: profile?.employer_address || '',
        position: profile?.position || profile?.occupation || ''
      },

      financialInfo: {
        bank_name: profile?.bank_name || '',
        bank_account: profile?.bank_account || '',
        monthly_income: String(profile?.income || 0),
        monthly_expense: String(profile?.expense || 0),
        pay_schedule: profile?.pay_schedule || ''
      }

      }

      const { error } = await supabase.functions.invoke(
        'loan_application_submission',
        { body: payload }
      )

      if (error) throw error

      toast({
        title: 'Application submitted',
        description: 'Your application has been sent successfully.'
      })

      setLoanAmount('')
      setLoanTerm('')
      setLoanPurpose('')
      setPromoCode('')
      setLoanType('')

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

    <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6">

      <Card>

        <CardHeader>
          <CardTitle>Loan Details</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">

          <div>

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

          <div>

            <Label>Amount</Label>

            <div className="flex gap-2 items-center">

              <Wallet size={16} />

              <Input
                type="number"
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
                placeholder="5000"
              />

            </div>

          </div>

          <div>

            <Label>Term</Label>

            <Select
              value={loanTerm}
              onValueChange={setLoanTerm}
              disabled={loanType === 'emergency'}
            >

              <SelectTrigger>
                <SelectValue placeholder="Select term" />
              </SelectTrigger>

              <SelectContent>

                {terms.map(t => (
                  <SelectItem key={t} value={t}>
                    {t} month
                  </SelectItem>
                ))}

              </SelectContent>

            </Select>

          </div>

          <div>

            <Label>Purpose</Label>

            <div className="flex gap-2">

              <FileText size={16} />

              <Textarea
                rows={4}
                value={loanPurpose}
                onChange={(e) => setLoanPurpose(e.target.value)}
              />

            </div>

          </div>

          <div>

            <Label>Promo Code</Label>

            <div className="flex gap-2">

              <Tag size={16} />

              <Input
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
              />

            </div>

          </div>

        </CardContent>

      </Card>

      <Card className="bg-muted/40 border-dashed">

        <CardHeader>
          <CardTitle>Loan Summary</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">

          {!isProfileComplete && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              Complete your profile before submitting. Missing: {missingProfileFields.join(', ')}
            </div>
          )}

          <div className="flex justify-between">
            <span>Loan Type</span>
            <span>{loanType || '-'}</span>
          </div>

          <div className="flex justify-between">
            <span>Amount</span>
            <span>₱{loanAmount || '0'}</span>
          </div>

          <div className="flex justify-between">
            <span>Total Repayment</span>
            <span>
              {calculation ? `₱${calculation.total.toFixed(0)}` : '-'}
            </span>
          </div>

          <div className="flex justify-between">
            <span>
              {calculation?.frequency === 'daily'
                ? 'Daily Payment'
                : 'Payment (15 days)'}
            </span>

            <span>
              {calculation
                ? `₱${calculation.payment.toFixed(0)}`
                : '-'}
            </span>
          </div>

          <Button
            className="w-full h-12 text-lg"
            disabled={submitting || !isProfileComplete}
            onClick={submitApplication}
          >
            {submitting ? 'Submitting...' : 'Submit Application'}
          </Button>

        </CardContent>

      </Card>

    </div>

  )

}