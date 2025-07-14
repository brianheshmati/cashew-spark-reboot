import LoanApplicationForm from '@/components/LoanApplicationForm';

export function ApplyView() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Apply for a New Loan</h1>
        <p className="text-muted-foreground">
          Fill out the form below to apply for a loan. We'll review your application and get back to you soon.
        </p>
      </div>
      
      <LoanApplicationForm />
    </div>
  );
}