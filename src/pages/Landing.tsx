import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import cashewLogo from '@/assets/cashew-logo.png';
import {
  ArrowRight,
  CheckCircle2,
  Lock,
  Shield,
  Sparkles,
  Users
} from 'lucide-react';

const newApplicantSteps = [
  {
    title: 'Submit your loan application',
    description: 'Complete the secure online form in minutes and tell us how we can help.'
  },
  {
    title: 'Verify your email',
    description: 'Receive a welcome email with a temporary password and click the link to confirm your account.'
  },
  {
    title: 'Confirm your mobile number',
    description: "We’ll text you a thank-you message and referral link. Reply VERIFY to activate your number."
  },
  {
    title: 'First-time login',
    description: 'Sign in with your email and temporary password, then create your permanent password.'
  }
];

const returningClientSteps = [
  {
    title: 'Sign in securely',
    description: 'Use your verified email address and password to access the Cashew dashboard.'
  },
  {
    title: 'Manage your loans',
    description: 'Track balances, make payments, submit new applications, and monitor your status in real time.'
  }
];

const featureHighlights = [
  {
    title: 'End-to-end digital onboarding',
    description: 'From loan submission to verification, everything happens online with status updates at each step.',
    icon: Sparkles
  },
  {
    title: 'Secure by design',
    description: 'Email and SMS verification ensure only verified clients gain access to sensitive financial data.',
    icon: Shield
  },
  {
    title: 'Personal support',
    description: 'Our customer success team is ready to assist you by phone, SMS, or email whenever you need help.',
    icon: Users
  }
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-soft">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/" className="flex items-center gap-3">
            <img src={cashewLogo} alt="Cashew" className="h-10 w-auto" />
            <div>
              <p className="text-lg font-bold text-foreground">Cashew</p>
              <p className="text-sm text-muted-foreground">Make Your Dream Come True</p>
            </div>
          </Link>
          <div className="hidden items-center gap-3 sm:flex">
            <Link to="/auth">
              <Button variant="outline">Returning clients</Button>
            </Link>
            <Link to="/apply">
              <Button>
                Start an application
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="border-b bg-background">
          <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16 md:flex-row md:items-center">
            <div className="flex-1 space-y-6">
              <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
                A single flow for every Cashew client
              </span>
              <h1 className="text-4xl font-bold leading-tight text-foreground md:text-5xl">
                Get funded faster with a guided onboarding experience
              </h1>
              <p className="max-w-xl text-lg text-muted-foreground">
                Whether you are applying for the first time or returning to manage an existing loan, the Cashew experience begins on this page.
                Choose the journey that fits you and follow the clear steps all the way to your dashboard.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link to="/apply">
                  <Button size="lg">
                    New applicants
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button size="lg" variant="outline">
                    Returning clients
                  </Button>
                </Link>
              </div>
            </div>
            <Card className="flex-1 border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <CheckCircle2 className="h-5 w-5" />
                  Your Cashew checklist
                </CardTitle>
                <CardDescription>
                  Every step is tracked to keep your application moving and your profile secure.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {newApplicantSteps.slice(0, 3).map((step, index) => (
                  <div key={step.title} className="flex items-start gap-3">
                    <div className="mt-1 h-6 w-6 rounded-full border border-primary/40 bg-primary/10 text-center text-xs font-semibold leading-6 text-primary">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{step.title}</p>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                ))}
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-6 w-6 rounded-full border border-primary/40 bg-primary/10 text-center text-xs font-semibold leading-6 text-primary">
                    4
                  </div>
                  <div>
                    <p className="font-medium text-foreground">First-time login</p>
                    <p className="text-sm text-muted-foreground">
                      After verification, sign in with your temporary password and set a new secure password.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="bg-gradient-to-b from-background via-background to-primary/5">
          <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 md:grid-cols-2">
            <Card className="shadow-soft">
              <CardHeader>
                <div className="flex items-center gap-3 text-primary">
                  <Sparkles className="h-5 w-5" />
                  <CardTitle>New applicants</CardTitle>
                </div>
                <CardDescription>
                  Follow these steps to complete your loan application and activate your Cashew account.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {newApplicantSteps.map((step) => (
                  <div key={step.title} className="rounded-lg border border-border/60 bg-background/80 p-4">
                    <p className="font-medium text-foreground">{step.title}</p>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                ))}
                <div className="rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm text-primary">
                  Once your email and mobile number are verified, you will see updated statuses in your Cashew profile and gain full dashboard access.
                </div>
                <Link to="/apply" className="block">
                  <Button className="w-full">
                    Start your application
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardHeader>
                <div className="flex items-center gap-3 text-primary">
                  <Lock className="h-5 w-5" />
                  <CardTitle>Returning clients</CardTitle>
                </div>
                <CardDescription>
                  Already verified? Log back in to manage your loans and view personalized offers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {returningClientSteps.map((step) => (
                  <div key={step.title} className="rounded-lg border border-border/60 bg-background/80 p-4">
                    <p className="font-medium text-foreground">{step.title}</p>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                ))}
                <div className="rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm text-primary">
                  Forgot your password? Use the change password option inside the dashboard at any time.
                </div>
                <Link to="/auth" className="block">
                  <Button className="w-full" variant="outline">
                    Go to sign in
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="border-t bg-background">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-bold text-foreground md:text-4xl">Why clients love the Cashew experience</h2>
              <p className="mt-3 text-lg text-muted-foreground">
                Every improvement in this release is focused on reducing friction from your onboarding flow.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {featureHighlights.map(({ title, description, icon: Icon }) => (
                <Card key={title} className="h-full border-border/60">
                  <CardHeader>
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-background">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-6 text-center text-sm text-muted-foreground md:flex-row md:text-left">
          <p>© {new Date().getFullYear()} Cashew Philippines. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/apply" className="hover:text-primary">
              Start a new loan
            </Link>
            <Link to="/auth" className="hover:text-primary">
              Client dashboard
            </Link>
            <a href="mailto:support@cashew.ph" className="hover:text-primary">
              support@cashew.ph
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
