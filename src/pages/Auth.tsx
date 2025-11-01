import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import cashewLogo from '@/assets/cashew-logo.png';
import { Session } from '@supabase/supabase-js';

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [needsPasswordReset, setNeedsPasswordReset] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const evaluateSession = (incomingSession: Session | null) => {
      const currentUser = incomingSession?.user ?? null;

      const mustChangePassword = Boolean(currentUser?.user_metadata?.must_change_password);
      setNeedsPasswordReset(mustChangePassword);

      if (currentUser && !mustChangePassword) {
        navigate('/dashboard');
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, currentSession) => {
      evaluateSession(currentSession);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      evaluateSession(session);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast({
            title: 'Sign in failed',
            description: 'Invalid email or password. Please check your credentials.',
            variant: 'destructive',
          });
        } else {
          throw error;
        }
        return;
      }

      const signedInUser = data?.user ?? data?.session?.user ?? null;
      if (signedInUser) {
        const mustChangePassword = Boolean(signedInUser.user_metadata?.must_change_password);
        setNeedsPasswordReset(mustChangePassword);

        if (mustChangePassword) {
          toast({
            title: 'Welcome to Cashew!',
            description: 'Please create a new password to finish setting up your account.',
          });
        } else {
          toast({
            title: 'Signed in successfully',
            description: 'Redirecting you to the dashboard.',
          });
          navigate('/dashboard');
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An error occurred during sign in';
      toast({
        title: 'Sign in failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (event: React.FormEvent) => {
    event.preventDefault();

    if (newPassword.length < 8) {
      toast({
        title: 'Password too short',
        description: 'Please choose a password with at least 8 characters.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Make sure both password fields are identical.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
        data: {
          must_change_password: false,
        },
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Password updated',
        description: 'You can now access your Cashew dashboard.',
      });

      setNeedsPasswordReset(false);
      setNewPassword('');
      setConfirmPassword('');
      navigate('/dashboard');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'We were unable to update your password. Please try again.';
      toast({
        title: 'Password update failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-soft flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center space-x-3">
            <img src={cashewLogo} alt="Cashew Logo" className="h-12 w-auto" />
            <div className="text-left">
              <p className="text-xl font-bold text-foreground">Cashew</p>
              <p className="text-sm text-muted-foreground">Make Your Dream Come True</p>
            </div>
          </Link>
        </div>

        <Card className="shadow-medium">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">
              {needsPasswordReset ? 'Create your new password' : 'Welcome back'}
            </CardTitle>
            <CardDescription>
              {needsPasswordReset
                ? 'For security, please update the temporary password we emailed to you.'
                : 'Sign in with your verified email address to open your dashboard.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {needsPasswordReset ? (
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div className="space-y-2 text-left">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Enter a new password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2 text-left">
                  <Label htmlFor="confirm-password">Confirm new password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Re-enter the new password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Updating...' : 'Save new password'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2 text-left">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2 text-left">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {!needsPasswordReset && (
          <div className="rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm text-primary">
            New applicant? Submit your loan application first so we can verify your email and send you a temporary password.
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth;
