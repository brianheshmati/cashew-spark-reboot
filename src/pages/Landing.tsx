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
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-foreground mb-6">
            Fast, Simple, <span className="text-primary">Reliable</span> Loans
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Get the funding you need with our streamlined loan application process. 
            Quick approval, competitive rates, and personalized service.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/apply">
              <Button size="lg" className="w-full sm:w-auto">
                Apply for Loan
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Access Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">
            Why Choose Cashew?
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-border/50 hover:shadow-medium transition-all duration-300">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Fast Approval</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Get approved in minutes with our automated processing system
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-border/50 hover:shadow-medium transition-all duration-300">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-accent/10 rounded-full w-fit">
                  <CreditCard className="h-6 w-6 text-accent" />
                </div>
                <CardTitle>Competitive Rates</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Enjoy competitive interest rates tailored to your profile
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-border/50 hover:shadow-medium transition-all duration-300">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-success/10 rounded-full w-fit">
                  <Shield className="h-6 w-6 text-success" />
                </div>
                <CardTitle>Secure & Safe</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Your data is protected with bank-level security measures
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-border/50 hover:shadow-medium transition-all duration-300">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-info/10 rounded-full w-fit">
                  <Users className="h-6 w-6 text-info" />
                </div>
                <CardTitle>Personal Support</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Dedicated support team to help you every step of the way
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6 bg-primary/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join thousands of satisfied customers who trust Cashew for their financial needs.
          </p>
          <Link to="/apply">
            <Button size="lg">
              Start Your Application
            </Button>
          </Link>
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