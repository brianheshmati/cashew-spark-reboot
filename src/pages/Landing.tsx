import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import cashewLogo from '@/assets/cashew-logo.png';
import { Link } from 'react-router-dom';
import { CreditCard, Users, Shield, Zap } from 'lucide-react';

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-soft">
      {/* Header */}
      <header className="bg-background/80 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img 
              src={cashewLogo} 
              alt="Cashew Logo" 
              className="h-10 w-auto"
            />
            <div>
              <div className="font-bold text-lg text-foreground">Cashew</div>
              <div className="text-sm text-muted-foreground">Make Your Dream Come True!</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link to="/auth">
              <Button variant="outline">Sign In</Button>
            </Link>
            <Link to="/apply">
              <Button>Apply Now</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-6xl font-bold text-foreground mb-6">
            Simple <span className="text-primary">Loans</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-12">
            Fast approval, competitive rates, secure process.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/apply">
              <Button size="lg" className="w-full sm:w-auto">
                Apply Now
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center space-x-3 mb-4 md:mb-0">
            <img 
              src={cashewLogo} 
              alt="Cashew Logo" 
              className="h-8 w-auto"
            />
            <span className="font-semibold">Cashew</span>
          </div>
          
          <div className="flex items-center space-x-6">
            <a
              href="https://www.cashew.ph"
              target="_blank"
              rel="noopener noreferrer"
              className="text-background/80 hover:text-primary transition-colors"
            >
              Home
            </a>
            <a
              href="https://www.cashew.ph/terms.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-background/80 hover:text-primary transition-colors"
            >
              Privacy Policy
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;