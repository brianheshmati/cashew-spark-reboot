import { User } from '@supabase/supabase-js';
import LoanApplicationForm from '@/components/LoanApplicationForm';

interface ApplyViewProps {
  user: User | null;
}

export function ApplyView({ user }: ApplyViewProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Apply for a New Loan</h1>
        <p className="text-muted-foreground">
          Fill out the form below to apply for a loan. We&apos;ll review your application and get back to you soon.
        </p>
      </div>

      <LoanApplicationForm user={user} />
    </div>
  );
}
