import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { Copy, Mail, MessageSquare } from 'lucide-react'

interface ReferralUser {
  first_name: string | null
  last_name: string | null
  email: string | null
  created_at: string
}

interface InviteViewProps {
  internalUserId?: string;
}

export function InviteView({ internalUserId }: InviteViewProps) {

  const { toast } = useToast()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const [userId, setUserId] = useState<number | null>(null)
  const [referralLink, setReferralLink] = useState('')

  const [referrals, setReferrals] = useState<ReferralUser[]>([])

  useEffect(() => {
    loadUser()
  }, [internalUserId])

  async function loadUser() {

    const { data: auth } = await supabase.auth.getUser()

    if (!auth.user) return

    const targetUserId = internalUserId ?? auth.user.id

    const { data: profile } = await supabase
      .from("userProfiles")
      .select("user_id")
      .eq("internal_user_id", targetUserId)
      .limit(1)

    if (!profile || profile.length === 0) return

    const uid = profile[0].user_id

    setUserId(uid)

    const link =
      `https://app.cashew.ph/?referral=${uid}`

    setReferralLink(link)

    loadReferrals(uid)

  }

  async function loadReferrals(uid: number) {

    const { data } = await supabase
      .from("userProfiles")
      .select("first_name,last_name,email,created_at")
      .eq("referral", uid)
      .order("first_name", { ascending: true })

    if (data) setReferrals(data)

  }

  const handleSendInvite = async (e: React.FormEvent) => {

    e.preventDefault()

    if (!email || !userId) return

    setLoading(true)

    try {

      await supabase.functions.invoke("send_referral_email", {
        body: {
          email,
          referralLink
        }
      })

      toast({
        title: "Invitation sent!",
        description: `Invitation sent to ${email}`
      })

      setEmail('')

    } catch {

      toast({
        title: "Error",
        description: "Failed to send invitation"
      })

    }

    setLoading(false)

  }

  const copyToClipboard = (text: string) => {

    navigator.clipboard.writeText(text)

    toast({
      title: "Copied!",
      description: "Referral link copied"
    })

  }

  const shareViaEmail = () => {

    const subject = "Join Cashew - Fast and Simple Loans"

    const body =
      `Check out Cashew for fast and simple loans.\n\n${referralLink}`

    window.open(
      `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    )

  }

  const shareViaWhatsApp = () => {

    const message =
      `Check out Cashew for fast and simple loans: ${referralLink}`

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`)

  }

  return (

    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Invite Friends</h1>
        <Badge variant="outline">Referral Program</Badge>
      </div>

      <Card>

        <CardHeader>
          <CardTitle>Send Invitation</CardTitle>
          <CardDescription>
            Invite friends via email
          </CardDescription>
        </CardHeader>

        <CardContent>

          <form onSubmit={handleSendInvite} className="space-y-4">

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="friend@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              <Mail className="h-4 w-4 mr-2" />
              {loading ? "Sending..." : "Send Invite"}
            </Button>

          </form>

        </CardContent>

      </Card>

      <Card>

        <CardHeader>
          <CardTitle>Your Referral Link</CardTitle>
          <CardDescription>
            Share this link with friends
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">

          <div className="flex space-x-2">

            <Input
              value={referralLink}
              readOnly
              className="font-mono text-sm"
            />

            <Button
              variant="outline"
              onClick={() => copyToClipboard(referralLink)}
            >
              <Copy className="h-4 w-4" />
            </Button>

          </div>

          <div className="flex space-x-2">

            <Button
              onClick={shareViaEmail}
              variant="outline"
              className="flex-1"
            >
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>

            <Button
              onClick={shareViaWhatsApp}
              variant="outline"
              className="flex-1"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>

          </div>

        </CardContent>

      </Card>

      <Card>

        <CardHeader>
          <CardTitle>Friends Who Joined</CardTitle>
        </CardHeader>

        <CardContent className="space-y-2">

          {referrals.length === 0 &&
            <p className="text-sm text-muted-foreground">
              No referrals yet
            </p>
          }

          {referrals.map((r, i) => (

            <div
              key={i}
              className="flex justify-between border rounded p-3"
            >

              <div>
                <div className="font-medium">
                  {r.first_name} {r.last_name}
                </div>

                <div className="text-sm text-muted-foreground">
                  {r.email}
                </div>
              </div>

              <Badge variant="outline">
                Joined
              </Badge>

            </div>

          ))}

        </CardContent>

      </Card>

    </div>

  )

}
