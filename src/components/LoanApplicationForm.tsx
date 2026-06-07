import { useEffect, useMemo, useState } from 'react'
import { User } from '@supabase/supabase-js'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

import { Textarea } from '@/components/ui/textarea'

import { useToast } from '@/hooks/use-toast'

import { supabase } from '@/integrations/supabase/client'

import {
  Wallet,
  FileText,
  Tag
} from 'lucide-react'

interface Props {
  user?: User | null
  internalUserId?: string
  internalUserEmail?: string
}

interface UserProfile {
  first_name?: string | null
  middle_name?: string | null
  last_name?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  employer_name?: string | null
  employer?: string | null
  employer_phone?: string | null
  employer_address?: string | null
  position?: string | null
  job_title?: string | null
  occupation?: string | null
  years_employed?: string | number | null
  employment_status?: string | null
  bank_name?: string | null
  bank_account?: string | null
  income?: string | number | null
  expense?: string | number | null
  pay_schedule?: string | null
  dob?: string | null
  referral?: string | null
}

interface LoanCalculation {
  interest: number
  total: number
  payment: number
  frequency: 'monthly' | 'semi-monthly'
  periods: number
}

type LoanType = 'conventional' | 'emergency'

const EMERGENCY_LOAN_RATE = 0.12
const EMERGENCY_LOAN_TERM_MONTHS = '1'
const EMERGENCY_LOAN_MIN_AMOUNT = 5000
const EMERGENCY_LOAN_MAX_AMOUNT = 10000
const CONVENTIONAL_LOAN_RATE = 0.10

function calculateLoan(
  amount: number,
  months: number,
  type: LoanType
): LoanCalculation | null {

  if (!amount || !months) {
    return null
  }

  if (type === 'emergency') {

    const interest =
      amount * EMERGENCY_LOAN_RATE * months

    const total =
      amount + interest

    return {
      interest,
      total,
      payment: total,
      frequency: 'monthly',
      periods: months
    }

  }

  const interest =
    amount * CONVENTIONAL_LOAN_RATE * months

  const total =
    amount + interest

  const periods =
    months * 2

  return {
    interest,
    total,
    payment: total / periods,
    frequency: 'semi-monthly',
    periods
  }

}

export default function LoanApplicationForm({
  user,
  internalUserId,
  internalUserEmail
}: Props) {

  const { toast } = useToast()

  const [profile, setProfile] =
    useState<UserProfile | null>(null)

  // =========================
  // SINGLE CANONICAL ID
  // =========================
  const [
    resolvedInternalUserId,
    setResolvedInternalUserId
  ] = useState<string | null>(null)

  const [loanAmount, setLoanAmount] =
    useState('')

  const [loanTerm, setLoanTerm] =
    useState('')

  const [loanPurpose, setLoanPurpose] =
    useState('')

  const [loanType, setLoanType] =
    useState<LoanType>('conventional')

  const [promoCode, setPromoCode] =
    useState('')

  const [
    activeLoanTypes,
    setActiveLoanTypes
  ] = useState<LoanType[]>([])

  const [submitting, setSubmitting] =
    useState(false)

  const [
    documentsReady,
    setDocumentsReady
  ] = useState(false)

  const [
    documentsStatusMessage,
    setDocumentsStatusMessage
  ] = useState(
    'Upload your last two payslips (within 30 days), a Certificate of Employment, a valid Government ID, and a selfie clearly holding your Government Issued ID to continue.'
  )

  // =========================
  // RESOLVE internal_user_id
  // =========================
  useEffect(() => {

    const resolveInternalUserId =
      async () => {

        try {

          // impersonation/admin path
          if (internalUserId) {

            setResolvedInternalUserId(
              internalUserId
            )

            return

          }

          if (!user?.email) {
            return
          }

          const normalizedEmail =
            user.email
              .trim()
              .toLowerCase()

          const { data, error } =
            await supabase
              .from('userProfiles')
              .select('internal_user_id')
              .eq(
                'email',
                normalizedEmail
              )
              .maybeSingle()

          if (error) {
            throw error
          }

          if (!data?.internal_user_id) {

            throw new Error(
              'Unable to resolve internal_user_id'
            )

          }

          console.log(
            'Resolved loan application internal_user_id',
            {
              email:
                normalizedEmail,
              authUserId:
                user.id,
              internalUserId:
                data.internal_user_id
            }
          )

          setResolvedInternalUserId(
            data.internal_user_id
          )

        } catch (error) {

          console.error(
            'Failed to resolve internal_user_id',
            error
          )

        }

      }

    resolveInternalUserId()

  }, [internalUserId, user?.email])

  /*
  DOCUMENT VALIDATION
  */

  const validateRequiredDocuments =
    async () => {

      const targetUserId =
        resolvedInternalUserId

      if (!targetUserId) {

        return {
          valid: false,
          message: 'User not found'
        }

      }

      const { data, error } =
        await supabase.storage
          .from('clients_documents')
          .list(targetUserId)

      if (error) {

        return {
          valid: false,
          message:
            'Unable to verify uploaded documents'
        }

      }

      const now = new Date()

      const thirtyDaysAgo =
        new Date()

      thirtyDaysAgo.setDate(
        now.getDate() - 30
      )

      let recentPayslips = 0

      let validCertificate = false

      let validGovernmentId = false

      let validSelfieWithId = false

      for (const file of data || []) {

        const parts =
          file.name.split('__')

        const type =
          parts[1] || ''

        const created =
          new Date(
            file.created_at || ''
          )

        if (
          created < thirtyDaysAgo
        ) {
          continue
        }

        if (
          type === 'payslip'
        ) {
          recentPayslips += 1
        }

        if (
          type ===
          'certificate_employment'
        ) {
          validCertificate = true
        }

        if (
          type ===
          'government_id'
        ) {
          validGovernmentId = true
        }

        if (
          type ===
          'selfie_with_government_id'
        ) {
          validSelfieWithId = true
        }

      }

      const missingRequirements:
        string[] = []

      if (recentPayslips < 2) {

        missingRequirements.push(
          'two payslips issued within the last 30 days'
        )

      }

      if (!validCertificate) {

        missingRequirements.push(
          'a Certificate of Employment issued within the last 30 days'
        )

      }

      if (!validGovernmentId) {

        missingRequirements.push(
          'a valid Government ID'
        )

      }

      if (!validSelfieWithId) {

        missingRequirements.push(
          'a selfie clearly holding your Government Issued ID'
        )

      }

      if (
        missingRequirements.length > 0
      ) {

        return {
          valid: false,
          message:
            `Please upload ${missingRequirements.join(', ')}.`
        }

      }

      return {
        valid: true
      }

    }

  /*
  PROFILE FIELDS
  */

  const requiredProfileFields =
    useMemo(() => {

      return [

        {
          label: 'First name',
          value:
            profile?.first_name ||
            user?.user_metadata?.first_name ||
            ''
        },

        {
          label: 'Last name',
          value:
            profile?.last_name ||
            user?.user_metadata?.last_name ||
            ''
        },

        {
          label: 'Email',
          value:
            profile?.email ||
            user?.email ||
            ''
        },

        {
          label: 'Phone',
          value:
            profile?.phone || ''
        },

        {
          label: 'Address',
          value:
            profile?.address || ''
        },

        {
          label: "Employer's name",
          value:
            profile?.employer_name ||
            profile?.employer ||
            ''
        },

        {
          label: "Employer's phone",
          value:
            profile?.employer_phone ||
            ''
        },

        {
          label: "Employer's address",
          value:
            profile?.employer_address ||
            ''
        },

        {
          label: 'Position',
          value:
            profile?.position ||
            profile?.job_title ||
            profile?.occupation ||
            ''
        },

        {
          label: 'Years employed',
          value:
            profile?.years_employed ??
            ''
        }

      ]

    }, [profile, user])

  const missingProfileFields =
    useMemo(() => {

      return requiredProfileFields
        .filter(
          ({ value }) =>
            String(value)
              .trim()
              .length === 0
        )
        .map(
          ({ label }) => label
        )

    }, [requiredProfileFields])

  const isProfileComplete =
    missingProfileFields.length === 0

  /*
  LOAD PROFILE
  */

  useEffect(() => {

    const loadProfile =
      async () => {

        const lookupEmail =
          internalUserEmail ||
          user?.email

        if (!lookupEmail) {
          return
        }

        const { data } =
          await supabase
            .from('userProfiles')
            .select('*')
            .ilike(
              'email',
              lookupEmail
            )
            .order(
              'created_at',
              {
                ascending: false
              }
            )
            .limit(1)
            .single()

        if (data) {

          setProfile(data)

        }

      }

    loadProfile()

  }, [internalUserEmail, user])

  /*
  CHECK ACTIVE LOANS
  */

  useEffect(() => {

    const checkLoans =
      async () => {

        const targetUserId =
          resolvedInternalUserId

        if (!targetUserId) {
          return
        }

        const { data } =
          await supabase
            .from('user_loans_summary')
            .select('loan_type')
            .eq(
              'internal_user_id',
              targetUserId
            )
            .ilike(
              'status',
              'active'
            )

        const loanTypes =
          (data || [])
            .map((loan) => {

              const type =
                String(loan.loan_type)
                  .trim()
                  .toLowerCase()

              if (
                type === 'regular'
              ) {
                return 'conventional'
              }

              return type

            })
            .filter(
              (type): type is LoanType =>
                type === 'conventional' ||
                type === 'emergency'
            )

        setActiveLoanTypes(
          Array.from(new Set(loanTypes))
        )

      }

    checkLoans()

  }, [resolvedInternalUserId])

  const hasActiveConventionalLoan =
    activeLoanTypes.includes(
      'conventional'
    )

  const hasActiveEmergencyLoan =
    activeLoanTypes.includes(
      'emergency'
    )

  const derivedLoanType: LoanType =
    hasActiveEmergencyLoan
      ? 'conventional'
      : hasActiveConventionalLoan
        ? 'emergency'
        : 'conventional'

  useEffect(() => {

    setLoanType(derivedLoanType)

    if (
      derivedLoanType ===
      'emergency'
    ) {

      setLoanTerm(
        EMERGENCY_LOAN_TERM_MONTHS
      )

    }

  }, [derivedLoanType])

  /*
  CHECK REQUIRED DOCUMENTS
  */

  useEffect(() => {

    const checkRequiredDocuments =
      async () => {

        const docCheck =
          await validateRequiredDocuments()

        setDocumentsReady(
          Boolean(docCheck.valid)
        )

        if (docCheck.valid) {

          setDocumentsStatusMessage(
            'Required documents are on file.'
          )

        } else {

          setDocumentsStatusMessage(
            docCheck.message ||
            'Upload the required documents to continue.'
          )

        }

      }

    checkRequiredDocuments()

  }, [resolvedInternalUserId])

  /*
  TERM OPTIONS
  */

  const terms = useMemo(() => {

    if (
      loanType === 'emergency'
    ) {
      return ['1']
    }

    return ['1', '2']

  }, [
    loanType
  ])

  /*
  CALCULATION
  */

  const calculation =
    useMemo(() => {

      const amount =
        Number(loanAmount)

      const term =
        Number(loanTerm)

      if (
        !amount ||
        !term ||
        !loanType
      ) {
        return null
      }

      return calculateLoan(
        amount,
        term,
        loanType
      )

    }, [
      loanAmount,
      loanTerm,
      loanType
    ])

  /*
  SUBMIT
  */

  const submitApplication =
    async () => {

      const amount =
        Number(loanAmount)

      if (
        !amount ||
        !loanTerm ||
        !loanPurpose ||
        !loanType
      ) {

        toast({
          title:
            'Missing required fields',
          description:
            'Please fill all required fields.',
          variant:
            'destructive'
        })

        return

      }

      if (
        loanType === 'emergency' &&
        (
          loanTerm !==
          EMERGENCY_LOAN_TERM_MONTHS ||
          amount <
            EMERGENCY_LOAN_MIN_AMOUNT ||
          amount >
            EMERGENCY_LOAN_MAX_AMOUNT
        )
      ) {

        toast({
          title:
            'Invalid emergency loan details',
          description:
            'Emergency loans must be 1 month and between ₱5,000 and ₱10,000.',
          variant:
            'destructive'
        })

        return

      }

      if (
        !isProfileComplete
      ) {

        toast({
          title:
            'Complete your profile first',
          description:
            `Missing: ${missingProfileFields.join(', ')}`,
          variant:
            'destructive'
        })

        return

      }

      /*
      DOCUMENT VALIDATION
      */

      const docCheck =
        await validateRequiredDocuments()

      if (!docCheck.valid) {

        toast({
          title:
            'Missing required documents',
          description:
            docCheck.message,
          variant:
            'destructive'
        })

        return

      }

      if (
        !resolvedInternalUserId
      ) {

        toast({
          title:
            'Unable to resolve user',
          description:
            'Please refresh and try again.',
          variant:
            'destructive'
        })

        return

      }

      setSubmitting(true)

      try {

        const payload = {

          user_id:
            resolvedInternalUserId,

          personalInfo: {

            firstName:
              profile?.first_name ||
              '',

            middleName:
              profile?.middle_name ||
              '',

            lastName:
              profile?.last_name ||
              '',

            email:
              profile?.email ||
              '',

            phone:
              profile?.phone ||
              '',

            address:
              profile?.address ||
              '',

            promoCode:
              promoCode || '',

            dateOfBirth:
              profile?.dob ||
              '',

            referralCode:
              profile?.referral ||
              ''

          },

          loanInfo: {

            loanAmount:
              String(
                loanAmount
              ),

            loanTerm:
              String(
                loanTerm
              ),

            loanPurpose:
              loanPurpose.trim(),

            loanType:
              loanType,

            interestRate:
              loanType === 'emergency'
                ? EMERGENCY_LOAN_RATE
                : CONVENTIONAL_LOAN_RATE

          },

          employmentInfo: {

            employmentLength:
              profile?.years_employed ||
              '',

            employmentStatus:
              profile?.employment_status ||
              '',

            company:
              profile?.employer_name ||
              profile?.employer ||
              '',

            employer_phone:
              profile?.employer_phone ||
              '',

            employer_address:
              profile?.employer_address ||
              '',

            position:
              profile?.position ||
              profile?.occupation ||
              ''

          },

          financialInfo: {

            bank_name:
              profile?.bank_name ||
              '',

            bank_account:
              profile?.bank_account ||
              '',

            monthly_income:
              String(
                profile?.income ||
                0
              ),

            monthly_expense:
              String(
                profile?.expense ||
                0
              ),

            pay_schedule:
              profile?.pay_schedule ||
              ''

          }

        }

        const { error } =
          await supabase.functions.invoke(
            'loan_application_submission',
            {
              body: payload
            }
          )

        if (error) {
          throw error
        }

        toast({
          title:
            'Application submitted',
          description:
            'Your application has been sent successfully.'
        })

        setLoanAmount('')
        setLoanTerm('')
        setLoanPurpose('')
        setPromoCode('')
        setLoanType(
          derivedLoanType
        )

      } catch (err: unknown) {

        toast({
          title:
            'Submission failed',
          description:
            err instanceof Error
              ? err.message
              : 'An unexpected error occurred.',
          variant:
            'destructive'
        })

      } finally {

        setSubmitting(false)

      }

    }

  return (

    <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6">

      <Card>

        <CardHeader>

          <CardTitle>
            Loan Details
          </CardTitle>

        </CardHeader>

        <CardContent className="space-y-6">

          <div>

            <Label>
              Loan Type
            </Label>

            <Select
              value={loanType}
              disabled
            >

              <SelectTrigger>
                <SelectValue placeholder="Loan type" />
              </SelectTrigger>

              <SelectContent>

                <SelectItem value="conventional">
                  Conventional
                </SelectItem>

                <SelectItem value="emergency">
                  Emergency
                </SelectItem>

              </SelectContent>

            </Select>

          </div>

          <div>

            <Label>
              Amount
              {loanType === 'emergency'
                ? ' (₱5,000-₱10,000)'
                : ''}
            </Label>

            <div className="flex gap-2 items-center">

              <Wallet size={16} />

              <Input
                type="number"
                value={loanAmount}
                min={
                  loanType === 'emergency'
                    ? EMERGENCY_LOAN_MIN_AMOUNT
                    : undefined
                }
                max={
                  loanType === 'emergency'
                    ? EMERGENCY_LOAN_MAX_AMOUNT
                    : undefined
                }
                onChange={(e) =>
                  setLoanAmount(
                    e.target.value
                  )
                }
                placeholder="5000"
              />

            </div>

          </div>

          <div>

            <Label>
              Term
            </Label>

            <Select
              value={loanTerm}
              onValueChange={
                setLoanTerm
              }
              disabled={
                loanType ===
                'emergency'
              }
            >

              <SelectTrigger>

                <SelectValue placeholder="Select term" />

              </SelectTrigger>

              <SelectContent>

                {terms.map(
                  (t) => (

                    <SelectItem
                      key={t}
                      value={t}
                    >
                      {t} month
                    </SelectItem>

                  )
                )}

              </SelectContent>

            </Select>

          </div>

          <div>

            <Label>
              Purpose
            </Label>

            <div className="flex gap-2">

              <FileText size={16} />

              <Textarea
                rows={4}
                value={loanPurpose}
                onChange={(e) =>
                  setLoanPurpose(
                    e.target.value
                  )
                }
              />

            </div>

          </div>

          <div>

            <Label>
              Promo Code
            </Label>

            <div className="flex gap-2">

              <Tag size={16} />

              <Input
                value={promoCode}
                onChange={(e) =>
                  setPromoCode(
                    e.target.value
                  )
                }
              />

            </div>

          </div>

        </CardContent>

      </Card>

      <Card className="bg-muted/40 border-dashed">

        <CardHeader>

          <CardTitle>
            Loan Summary
          </CardTitle>

        </CardHeader>

        <CardContent className="space-y-4">

          {!isProfileComplete && (

            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">

              Complete your profile before submitting.

              Missing:
              {' '}

              {missingProfileFields.join(', ')}

            </div>

          )}

          {!documentsReady && (

            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">

              {documentsStatusMessage}

            </div>

          )}

          <div className="flex justify-between">

            <span>
              Loan Type
            </span>

            <span>
              {loanType || '-'}
            </span>

          </div>

          <div className="flex justify-between">

            <span>
              Interest Rate
            </span>

            <span>
              {loanType === 'emergency'
                ? '12%'
                : '10%'}
            </span>

          </div>

          <div className="flex justify-between">

            <span>
              Amount
            </span>

            <span>
              ₱{loanAmount || '0'}
            </span>

          </div>

          <div className="flex justify-between">

            <span>
              Total Repayment
            </span>

            <span>

              {calculation
                ? `₱${calculation.total.toFixed(0)}`
                : '-'}

            </span>

          </div>

          <div className="flex justify-between">

            <span>

              {calculation?.frequency ===
              'monthly'
                ? 'Payment (1 month)'
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
            disabled={
              submitting ||
              !isProfileComplete ||
              !documentsReady
            }
            onClick={submitApplication}
          >

            {submitting
              ? 'Submitting...'
              : 'Submit Application'}

          </Button>

        </CardContent>

      </Card>

    </div>

  )

}
