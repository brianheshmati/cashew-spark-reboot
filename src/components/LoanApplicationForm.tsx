import { useEffect, useMemo, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface LoanApplicationFormProps {
  user?: User | null;
}

const LoanApplicationForm = ({ user }: LoanApplicationFormProps) => {
  const [loanAmount, setLoanAmount] = useState('');
  const [loanTerm, setLoanTerm] = useState('');
  const [loanPurpose, setLoanPurpose] = useState('');
  const [hasPaidOffLoan, setHasPaidOffLoan] = useState(false);
  const [loadingEligibility, setLoadingEligibility] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkEligibility = async () => {
      if (!user) return;

      setLoadingEligibility(true);
      const { data, error } = await supabase
        .from('loans')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'paid_off')
        .limit(1);

      if (error) {
        toast({
          title: 'Unable to verify term eligibility',
          description: 'Default term range will be used.',
          variant: 'destructive',
        });
      } else {
        setHasPaidOffLoan((data?.length || 0) > 0);
      }
      setLoadingEligibility(false);
    };

    checkEligibility();
  }, [user]);

  const availableTerms = useMemo(() => (hasPaidOffLoan ? ['1', '2', '3'] : ['1', '2']), [hasPaidOffLoan]);

  const submitApplication = async () => {
    const amount = Number(loanAmount);
    if (!amount || amount <= 0 || !loanTerm || !loanPurpose.trim()) {
      toast({
        title: 'Missing required fields',
        description: 'Amount, term, and purpose are all required.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        loanInfo: {
          loanAmount: amount,
          loanTerm: Number(loanTerm),
          loanPurpose: loanPurpose.trim(),
        },
        userId: user?.id,
      };

      const response = await fetch('https://api.cashew.ph/functions/v1/loan_application_submission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:
            'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrbGF4aHB1Ymx4aGd4Y2FqdXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzEwNDcyODAsImV4cCI6MjA0NjYyMzI4MH0.8c7FWSRsw0PfrZmq9dzVEq5wTl668AG0ww7jf9tYIAo',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'Submission failed');
      }

      toast({
        title: 'Application submitted',
        description: 'Your loan application was submitted successfully.',
      });
      setLoanAmount('');
      setLoanTerm('');
      setLoanPurpose('');
    } catch (error: unknown) {
      toast({
        title: 'Submission failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Simplified Loan Application</CardTitle>
        <CardDescription>Provide amount, term, and purpose to submit your request.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="loanAmount">Amount</Label>
          <Input
            id="loanAmount"
            type="number"
            min="1"
            value={loanAmount}
            onChange={(e) => setLoanAmount(e.target.value)}
            placeholder="5000"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="loanTerm">Term (months)</Label>
          <Select value={loanTerm} onValueChange={setLoanTerm}>
            <SelectTrigger id="loanTerm">
              <SelectValue placeholder={loadingEligibility ? 'Checking eligibility...' : 'Select term'} />
            </SelectTrigger>
            <SelectContent>
              {availableTerms.map((term) => (
                <SelectItem key={term} value={term}>
                  {term} month{term === '1' ? '' : 's'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {hasPaidOffLoan ? 'Eligible for 1–3 months due to paid-off loan history.' : 'Eligible for 1–2 months.'}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="loanPurpose">Purpose</Label>
          <Textarea
            id="loanPurpose"
            value={loanPurpose}
            onChange={(e) => setLoanPurpose(e.target.value)}
            placeholder="What will you use the loan for?"
            rows={4}
          />
        </div>

        <Button onClick={submitApplication} disabled={submitting} className="w-full">
          {submitting ? 'Submitting...' : 'Submit Application'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default LoanApplicationForm;
