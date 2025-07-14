import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Share2, Users, Gift, Copy, Mail, MessageSquare } from 'lucide-react';

export function InviteView() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const referralCode = "CASHEW2024USER";
  const referralLink = `${window.location.origin}/?ref=${referralCode}`;

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    
    // Simulate sending invitation
    setTimeout(() => {
      toast({
        title: "Invitation sent!",
        description: `Invitation sent to ${email}`,
      });
      setEmail('');
      setLoading(false);
    }, 1000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Referral link copied to clipboard",
    });
  };

  const shareViaEmail = () => {
    const subject = "Join Cashew - Fast and Simple Loans";
    const body = `Hi there!\n\nI wanted to share Cashew with you - it's an amazing platform for fast and simple loans.\n\nUse my referral link to get special benefits: ${referralLink}\n\nBest regards!`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const shareViaWhatsApp = () => {
    const message = `Check out Cashew - fast and simple loans! Use my referral link: ${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Invite Friends</h1>
        <Badge variant="outline" className="bg-primary/10 text-primary">
          Referral Program
        </Badge>
      </div>

      {/* Referral Program Info */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 p-3 bg-primary/10 rounded-full w-fit">
              <Gift className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Earn Rewards</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              Get $50 credit for each successful referral
            </p>
          </CardContent>
        </Card>

        <Card className="border-accent/20 bg-accent/5">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 p-3 bg-accent/10 rounded-full w-fit">
              <Users className="h-6 w-6 text-accent" />
            </div>
            <CardTitle className="text-lg">Help Friends</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              Your friends get 0.5% off their first loan
            </p>
          </CardContent>
        </Card>

        <Card className="border-success/20 bg-success/5">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 p-3 bg-success/10 rounded-full w-fit">
              <Share2 className="h-6 w-6 text-success" />
            </div>
            <CardTitle className="text-lg">Easy Sharing</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              Share via email, social media, or direct link
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Send Invitation */}
      <Card>
        <CardHeader>
          <CardTitle>Send Invitation</CardTitle>
          <CardDescription>
            Invite friends directly via email
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Friend's Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="friend@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              <Mail className="h-4 w-4 mr-2" />
              {loading ? 'Sending...' : 'Send Invitation'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Share Your Link */}
      <Card>
        <CardHeader>
          <CardTitle>Share Your Referral Link</CardTitle>
          <CardDescription>
            Share this link with friends and family
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Your Referral Code</Label>
            <div className="flex space-x-2">
              <Input value={referralCode} readOnly className="font-mono" />
              <Button
                variant="outline"
                onClick={() => copyToClipboard(referralCode)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Your Referral Link</Label>
            <div className="flex space-x-2">
              <Input value={referralLink} readOnly className="font-mono text-sm" />
              <Button
                variant="outline"
                onClick={() => copyToClipboard(referralLink)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex space-x-2 pt-4">
            <Button onClick={shareViaEmail} variant="outline" className="flex-1">
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
            <Button onClick={shareViaWhatsApp} variant="outline" className="flex-1">
              <MessageSquare className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Referral Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Your Referral Stats</CardTitle>
          <CardDescription>
            Track your referral performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">0</div>
              <p className="text-sm text-muted-foreground">Total Referrals</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-success">$0</div>
              <p className="text-sm text-muted-foreground">Earnings</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-accent">0</div>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}