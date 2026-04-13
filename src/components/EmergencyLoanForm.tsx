import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export default function EmergencyLoanForm() {
  const { toast } = useToast();

  const [amount, setAmount] = useState(5000);
  const [neededDate, setNeededDate] = useState('');
  const [purpose, setPurpose] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!amount || !neededDate || !purpose) {
      toast({
        title: 'Missing fields',
        description: 'Please complete all fields',
        variant: 'destructive',
      });
      return;
    }

    if (amount < 5000 || amount > 10000) {
      toast({
        title: 'Invalid amount',
        description: 'Amount must be between ₱5,000 and ₱10,000',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('User not logged in');

      const { error } = await supabase.from('applications').insert([
        {
          internal_user_id: user.id,
          email: user.email?.toLowerCase(),
          amount: amount,
          loan_purpose: purpose,
          status: 'Pending',
          loan_type: 'emergency',
          remarks: `Needed by: ${neededDate}`,
        },
      ]);

      if (error) throw error;

      toast({
        title: 'Application submitted',
        description: 'We’ll review your emergency loan shortly.',
      });

      // reset
      setAmount(5000);
      setNeededDate('');
      setPurpose('');

    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      });
    }

    setLoading(false);
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Emergency Loan</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        
        {/* Amount */}
        <div>
          <label className="text-sm font-medium">Amount (₱)</label>
          <Input
            type="number"
            value={amount}
            min={5000}
            max={10000}
            step={500}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">
            ₱5,000 – ₱10,000 only
          </p>
        </div>

        {/* Needed Date */}
        <div>
          <label className="text-sm font-medium">When do you need it?</label>
          <Input
            type="date"
            value={neededDate}
            onChange={(e) => setNeededDate(e.target.value)}
          />
        </div>

        {/* Purpose */}
        <div>
          <label className="text-sm font-medium">Purpose</label>
          <Textarea
            placeholder="e.g. medical, bills, emergency expense"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          />
        </div>

        {/* Submit */}
        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Submitting...' : 'Apply Now'}
        </Button>

      </CardContent>
    </Card>
  );
}