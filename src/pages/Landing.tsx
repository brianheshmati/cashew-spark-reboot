import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import cashewLogo from '@/assets/cashew-logo.png';
import { Link } from 'react-router-dom';
import { Zap, Shield, Clock, Users, Building, GraduationCap, Home, CreditCard } from 'lucide-react';

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
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
          
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#services" className="text-foreground hover:text-primary transition-colors">Services</a>
            <a href="#features" className="text-foreground hover:text-primary transition-colors">Features</a>
            <a href="#about" className="text-foreground hover:text-primary transition-colors">About</a>
          </nav>
          
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
      <section className="py-20 lg:py-32 px-6 bg-gradient-soft relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-left">
              <div className="text-sm font-semibold text-primary mb-4 tracking-wide uppercase">
                — Lender of choice for individuals and small businesses
              </div>
              <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
                Fast & Hassle-Free <span className="text-primary">Loans</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-lg">
                Quick application with minimal documentation. Instant decisions for pre-qualified applicants with same-day disbursement.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
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

              <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span>Fast Approval</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>Secure Process</span>
                </div>
              </div>
            </div>

            {/* Phone Mockup */}
            <div className="relative lg:pl-12">
              <div className="relative mx-auto w-80 h-96 bg-foreground rounded-[3rem] p-2 shadow-2xl">
                <div className="w-full h-full bg-background rounded-[2.5rem] overflow-hidden">
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold">9:41</div>
                      <div className="flex space-x-1">
                        <div className="w-4 h-2 bg-foreground rounded-sm"></div>
                        <div className="w-4 h-2 bg-foreground rounded-sm"></div>
                        <div className="w-4 h-2 bg-foreground rounded-sm"></div>
                      </div>
                    </div>
                    
                    <div className="text-center py-4">
                      <img 
                        src={cashewLogo} 
                        alt="Cashew" 
                        className="h-8 w-auto mx-auto mb-2"
                      />
                      <h3 className="font-bold text-lg mb-2">Apply for Loan</h3>
                      <p className="text-sm text-muted-foreground mb-4">Choose your loan type</p>
                    </div>

                    <div className="space-y-3">
                      <div className="bg-primary/10 rounded-lg p-3 border border-primary/20">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-sm">Business Loan</div>
                            <div className="text-xs text-muted-foreground">Starting at 2.5% monthly</div>
                          </div>
                          <Building className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                      
                      <div className="bg-card rounded-lg p-3 border">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-sm">Quick Cash</div>
                            <div className="text-xs text-muted-foreground">Fast approval</div>
                          </div>
                          <Zap className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                      
                      <div className="bg-card rounded-lg p-3 border">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-sm">Education Loan</div>
                            <div className="text-xs text-muted-foreground">For students</div>
                          </div>
                          <GraduationCap className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    </div>

                    <Button className="w-full mt-4" size="sm">
                      Get Started
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Loan Types Section */}
      <section id="services" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-sm font-semibold text-primary mb-4 tracking-wide uppercase">
              SERVICES
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Choose Your Perfect Loan
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We offer different loan types to meet your specific needs with competitive rates and flexible terms.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-border/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                  <Building className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Business Loan</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center mb-4">
                  Get capital to expand, buy inventory, or invest in new opportunities. Quick approval with minimal requirements.
                </CardDescription>
                <Link to="/apply" className="block">
                  <Button variant="outline" className="w-full">Apply Now</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-border/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Quick Cash</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center mb-4">
                  No long waits—get fast approval for bills, medical needs, or unexpected expenses. Simple and hassle-free.
                </CardDescription>
                <Link to="/apply" className="block">
                  <Button variant="outline" className="w-full">Apply Now</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-border/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                  <GraduationCap className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Education Loan</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center mb-4">
                  Focus on your studies while we handle the finances. Affordable rates and flexible repayment terms.
                </CardDescription>
                <Link to="/apply" className="block">
                  <Button variant="outline" className="w-full">Apply Now</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-border/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                  <Home className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Home Loan</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center mb-4">
                  Own a home with low-interest rates and easy terms. Whether buying, building, or refinancing.
                </CardDescription>
                <Link to="/apply" className="block">
                  <Button variant="outline" className="w-full">Apply Now</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="text-sm font-semibold text-primary mb-4 tracking-wide uppercase">
                WHY CHOOSE US
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
                Built for Your <span className="text-primary">Financial Success</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                We understand the challenges of accessing capital. That's why we've designed our process to be inclusive, accessible, and transparent.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Fast & Hassle-Free</h3>
                    <p className="text-muted-foreground">Quick application with minimal documentation and instant decisions for pre-qualified applicants.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                    <CreditCard className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Flexible Repayment</h3>
                    <p className="text-muted-foreground">Multiple repayment terms and payment options including bank transfer, GCash, or cash.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Inclusive & Accessible</h3>
                    <p className="text-muted-foreground">No credit history required—evaluations based on real-life financial behavior.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Secure & Transparent</h3>
                    <p className="text-muted-foreground">Data security measures and clear loan terms with upfront details—no hidden clauses.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-8 border border-primary/20">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-6">
                    <Shield className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-4">Trusted by Thousands</h3>
                  <p className="text-muted-foreground mb-6">
                    Join thousands of satisfied customers who trust Cashew for their financial needs.
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-background rounded-lg p-4">
                      <div className="text-2xl font-bold text-primary">10K+</div>
                      <div className="text-sm text-muted-foreground">Happy Customers</div>
                    </div>
                    <div className="bg-background rounded-lg p-4">
                      <div className="text-2xl font-bold text-primary">₱50M+</div>
                      <div className="text-sm text-muted-foreground">Loans Processed</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <img 
                  src={cashewLogo} 
                  alt="Cashew Logo" 
                  className="h-8 w-auto brightness-0 invert"
                />
                <span className="font-semibold text-lg">Cashew</span>
              </div>
              <p className="text-background/80 mb-4">
                Make Your Dream Come True! Lender of choice for individuals and small businesses.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-background/80">
                <li><a href="#" className="hover:text-primary transition-colors">Business Loan</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Quick Cash</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Education Loan</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Home Loan</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-background/80">
                <li><a href="#" className="hover:text-primary transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-background/80">
                <li><a href="https://www.cashew.ph/terms.html" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Terms of Service</a></li>
                <li><a href="https://www.cashew.ph/terms.html" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-background/20 pt-8 flex flex-col md:flex-row items-center justify-between">
            <p className="text-background/60 text-sm">
              © 2024 Cashew. All rights reserved.
            </p>
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <Link to="/apply">
                <Button variant="outline" className="border-background/20 text-background hover:bg-background hover:text-foreground">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;