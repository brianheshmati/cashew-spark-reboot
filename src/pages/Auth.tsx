import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import cashewLogo from '@/assets/cashew-logo.png';
import { User, Session } from '@supabase/supabase-js';

const Auth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: ''
  });
  const [resetEmail, setResetEmail] = useState('');
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaSetup, setMfaSetup] = useState<{qr: string, secret: string, factorId: string} | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            navigate('/dashboard');
          }, 0);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        navigate('/dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/dashboard`;
      
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName
          }
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          toast({
            title: "Account exists",
            description: "This email is already registered. Please sign in instead.",
            variant: "destructive"
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Success!",
          description: "Account created successfully. Please check your email for verification.",
        });
        
        // Set up MFA if enabled
        if (mfaEnabled) {
          setTimeout(() => {
            setupMFA();
          }, 1000);
        }
      }
    } catch (error: any) {
      toast({
        title: "Sign up failed",
        description: error.message || "An error occurred during sign up",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast({
            title: "Sign in failed",
            description: "Invalid email or password. Please check your credentials.",
            variant: "destructive"
          });
        } else {
          throw error;
        }
      }
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message || "An error occurred during sign in",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth`
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Reset email sent",
        description: "Please check your email for password reset instructions.",
      });
      setResetEmail('');
    } catch (error: any) {
      toast({
        title: "Reset failed",
        description: error.message || "An error occurred while sending reset email",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const setupMFA = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Cashew Account'
      });

      if (error) {
        throw error;
      }

      if (data) {
        setMfaSetup({
          qr: data.totp.qr_code,
          secret: data.totp.secret,
          factorId: data.id
        });
        
        toast({
          title: "MFA Setup",
          description: "Scan the QR code with your authenticator app and enter the verification code.",
        });
      }
    } catch (error: any) {
      toast({
        title: "MFA Setup Failed",
        description: error.message || "An error occurred while setting up MFA",
        variant: "destructive"
      });
    }
  };

  const verifyMFA = async () => {
    if (!mfaSetup || !otpCode || otpCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a valid 6-digit code from your authenticator app.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId: mfaSetup.factorId,
        challengeId: mfaSetup.factorId,
        code: otpCode
      });

      if (error) {
        throw error;
      }

      toast({
        title: "MFA Verified",
        description: "Two-factor authentication has been successfully enabled.",
      });
      
      setMfaSetup(null);
      setOtpCode('');
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid verification code. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-soft flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-3">
            <img 
              src={cashewLogo} 
              alt="Cashew Logo" 
              className="h-12 w-auto"
            />
            <div>
              <div className="font-bold text-xl text-foreground">Cashew</div>
              <div className="text-sm text-muted-foreground">Make Your Dream Come True!</div>
            </div>
          </Link>
        </div>

        <Card className="shadow-medium">
          <CardHeader className="text-center">
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
                <TabsTrigger value="reset">Reset</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      name="password"
                      type="password"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading}
                  >
                    {loading ? 'Signing In...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        placeholder="First name"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        placeholder="Last name"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      name="password"
                      type="password"
                      placeholder="Create a password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="mfa-setup" 
                      checked={mfaEnabled}
                      onCheckedChange={(checked) => setMfaEnabled(checked as boolean)}
                    />
                    <Label htmlFor="mfa-setup" className="text-sm">
                      Enable two-factor authentication for enhanced security
                    </Label>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading}
                  >
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="reset">
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="Enter your email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading}
                  >
                    {loading ? 'Sending Reset Email...' : 'Send Reset Email'}
                  </Button>
                  <p className="text-sm text-muted-foreground text-center">
                    Enter your email address and we'll send you a link to reset your password.
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* MFA Setup Modal */}
        {mfaSetup && (
          <Card className="mt-6 shadow-medium">
            <CardHeader className="text-center">
              <CardTitle>Setup Two-Factor Authentication</CardTitle>
              <CardDescription>
                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <img 
                  src={mfaSetup.qr} 
                  alt="QR Code for MFA setup" 
                  className="w-48 h-48 border rounded-lg"
                />
              </div>
              
              <div className="text-center">
                <Label className="text-sm font-medium">Manual Entry Key:</Label>
                <code className="block mt-1 p-2 bg-muted rounded text-xs break-all">
                  {mfaSetup.secret}
                </code>
              </div>

              <div className="space-y-2">
                <Label>Enter Verification Code</Label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otpCode}
                    onChange={setOtpCode}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setMfaSetup(null);
                    setOtpCode('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={verifyMFA}
                  disabled={otpCode.length !== 6}
                  className="flex-1"
                >
                  Verify & Enable
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-6 text-center">
          <Link 
            to="/" 
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Auth;