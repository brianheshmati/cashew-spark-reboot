import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import cashewLogo from '@/assets/cashew-logo.png';
import { Link } from 'react-router-dom';
import { Zap, Shield, Clock, Users, Building, GraduationCap, Home, CreditCard } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="py-20 lg:py-32 px-6 bg-gradient-soft relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-12 items-center">
            {/* Left Column - Text Content */}
            <div className="flex-1 text-left lg:pr-8">
              {/* <div className="text-sm font-semibold text-primary mb-4 tracking-wide uppercase">
                — Lender of choice for individuals and small businesses
              </div> */}
              <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
                Fast & Hassle-Free <span className="text-primary">Loans</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-lg">
                Quick application with minimal documentation. Instant decisions for pre-qualified applicants with same-day disbursement.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link to="/apply">
                  <Button size="lg" className="w-full sm:w-auto">
                    New Client
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    Already have an account? Log in.
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

            {/* Right Column - iPhone 15 Mockup */}
            <div className="flex-shrink-0 w-full lg:w-auto flex justify-center lg:justify-end">
              <div className="relative mx-auto w-72 h-[580px] bg-foreground rounded-[3.5rem] p-2 shadow-2xl">
                <div className="w-full h-full bg-background rounded-[3rem] overflow-hidden relative">
                  {/* iPhone notch */}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-foreground rounded-b-2xl z-10"></div>
                  
                  {/* Dashboard content */}
                  <div className="p-4 pt-8 h-full overflow-hidden">
                    {/* Status bar */}
                    <div className="flex items-center justify-between mb-6 text-xs">
                      <div className="font-semibold">9:41</div>
                      <div className="flex items-center space-x-1">
                        <div className="w-4 h-2 bg-foreground rounded-sm"></div>
                        <div className="w-1 h-1 bg-foreground rounded-full"></div>
                        <div className="w-6 h-3 border border-foreground rounded-sm">
                          <div className="w-4 h-1.5 bg-foreground rounded-sm m-0.5"></div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="font-bold text-lg">Welcome back, Maria</h3>
                        {/* <p className="text-xs text-muted-foreground">Welcome back, Maria</p> */}
                      </div>
                      <img 
                        src={cashewLogo} 
                        alt="Cashew" 
                        className="h-6 w-auto"
                      />
                    </div>

                    {/* Balance Card */}
                    <div className="bg-primary rounded-xl p-4 mb-4 text-white">
                      <div className="text-xs opacity-90 mb-1 text-black-400">Total Balance</div>
                      <div className="text-xl font-bold mb-2">₱25,500.00</div>
                      <div className="flex justify-between text-xs">
                        <span>Due: ₱6,000</span>
                        <span>Due Date: 08/15/2025</span>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-card rounded-lg p-3 border text-center">
                        <Building className="h-4 w-4 text-primary mx-auto mb-1" />
                        <div className="text-xs font-medium">Apply Loan</div>
                      </div>
                      <div className="bg-card rounded-lg p-3 border text-center">
                        <CreditCard className="h-4 w-4 text-primary mx-auto mb-1" />
                        <div className="text-xs font-medium">Pay Now</div>
                      </div>
                    </div>

                    {/* Recent Loans */}
                    <div className="mb-4">
                      <div className="text-sm font-semibold mb-3">Recent Loans</div>
                      <div className="space-y-2">
                        <div className="bg-card rounded-lg p-3 border">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="text-xs font-medium">Business Loan #12011</div>
                              <div className="text-xs text-muted-foreground">₱40,000 • 2 months</div>
                            </div>
                            <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Active</div>
                          </div>
                        </div>
                        
                        <div className="bg-card rounded-lg p-3 border">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="text-xs font-medium">Quick Cash #23122</div>
                              <div className="text-xs text-muted-foreground">₱15,000 • 2 months</div>
                            </div>
                            <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">Paid</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom navigation */}
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="bg-card rounded-full p-2 border flex justify-around">
                        <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                        </div>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center">
                          <Users className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center">
                          <CreditCard className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center">
                          <div className="w-3 h-3 border border-muted-foreground rounded-full"></div>
                        </div>
                      </div>
                    </div>
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

      <Footer />
    </div>
  );
};

export default Landing;