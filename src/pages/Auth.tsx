import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import cashewLogo from '@/assets/cashew-logo.png';
import { User } from '@supabase/supabase-js';

const RESEND_SECONDS = 30;

const maskPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return phone;
  const last = digits.slice(-3);
  return `+${digits.slice(0, 2)}••• ••••${last}`;
};

const Auth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => {
            navigate('/dashboard');
          }, 0);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        navigate('/dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!otpSent || resendTimer <= 0) return;
    const timerId = window.setInterval(() => {
      setResendTimer((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [otpSent, resendTimer]);

  const canResend = otpSent && resendTimer === 0;

  const maskedPhone = useMemo(() => maskPhone(phone), [phone]);

  const handleSocialSignIn = async (provider: 'google' | 'facebook') => {
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Social sign in failed",
        description: error.message || "Unable to start social sign in.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async () => {
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone
      });

      if (error) throw error;

      setOtpSent(true);
      setResendTimer(RESEND_SECONDS);
      toast({
        title: "OTP sent",
        description: "Check your phone for the verification code.",
      });
    } catch (error: any) {
      toast({
        title: "OTP failed",
        description: error.message || "Unable to send the OTP.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!phone) return;
    await sendOtp();
  };

  const handleVerifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: otpCode,
        type: 'sms'
      });

      if (error) throw error;

      toast({
        title: "Verification successful",
        description: "Welcome back!",
      });
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message || "Unable to verify the OTP.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    await sendOtp();
  };

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-soft flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/home" className="inline-flex items-center space-x-3">
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
            <CardTitle>{otpSent ? 'Verify your code' : 'Welcome back'}</CardTitle>
            <CardDescription>
              {otpSent
                ? `Enter the 6-digit code sent to ${maskedPhone || 'your phone'}.`
                : 'Sign in with a social account or phone number.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!otpSent && (
              <>
                <div className="space-y-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={loading}
                    onClick={() => handleSocialSignIn('google')}
                  >
                    Continue with Google
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={loading}
                    onClick={() => handleSocialSignIn('facebook')}
                  >
                    Continue with Facebook
                  </Button>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  <span>or</span>
                  <span className="h-px flex-1 bg-border" />
                </div>

                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+63"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? 'Sending...' : 'Continue'}
                  </Button>
                </form>

                <p className="text-xs text-muted-foreground text-center">
                  By continuing, you agree to our Terms &amp; Privacy.
                </p>
              </>
            )}

            {otpSent && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">Enter the 6-digit code</Label>
                  <Input
                    id="otp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="_ _ _ _ _ _"
                    value={otpCode}
                    onChange={(event) => setOtpCode(event.target.value)}
                    className="text-center tracking-[0.4em] text-lg"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? 'Verifying...' : 'Verify Code'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  disabled={!canResend}
                  onClick={handleResend}
                >
                  {canResend ? 'Resend code' : `Resend code (${resendTimer}s)`}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
