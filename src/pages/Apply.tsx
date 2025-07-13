import LoanApplicationForm from '@/components/LoanApplicationForm';
import { Button } from '@/components/ui/button';
import cashewLogo from '@/assets/cashew-logo.png';
import { Link } from 'react-router-dom';

const Apply = () => {
  return (
    <div className="min-h-screen">
      {/* Simple Header */}
      <header className="bg-background border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <img 
              src={cashewLogo} 
              alt="Cashew Logo" 
              className="h-10 w-auto"
            />
            <div>
              <div className="font-bold text-lg text-foreground">Cashew</div>
              <div className="text-sm text-muted-foreground">Make Your Dream Come True!</div>
            </div>
          </Link>
          
          <div className="flex items-center space-x-4">
            <Link to="/auth">
              <Button variant="outline">Sign In</Button>
            </Link>
            <Link to="/">
              <Button variant="ghost">← Back</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Application Form */}
      <LoanApplicationForm />
    </div>
  );
};

export default Apply;