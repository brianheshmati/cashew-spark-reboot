import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { Copy, Mail, MessageSquare, RefreshCw } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

interface Invite {
  id: string
  invited_email: string
  status: string
  created_at: string
}

interface InviteViewProps {
  internalUserId?: string
  internalUserEmail?: string
}

export function InviteView({ internalUserId, internalUserEmail }: InviteViewProps) {

  const { toast } = useToast()
  const [searchParams] = useSearchParams()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const [userId, setUserId] = useState<string | null>(null)
  const [referralLink, setReferralLink] = useState('')

  const [invites, setInvites] = useState<Invite[]>([])

  useEffect(() => {
    loadUser()
  }, [internalUserEmail, internalUserId, searchParams])

  async function loadUser() {

    const urlEmail = searchParams.get('email')

    let lookupEmail =
      urlEmail ??
      internalUserEmail ??
      null

    if (!lookupEmail) {
      const { data: auth } = await supabase.auth.getUser()
      lookupEmail = auth.user?.email ?? null
    }

    if (!lookupEmail) return

    lookupEmail = lookupEmail.toLowerCase()

    const { data: profile } = await supabase
      .from("userProfiles")
      .select("internal_user_id")
      .eq("email", lookupEmail)
      .limit(1)

    if (!profile || profile.length === 0) return

    const uid = profile[0].internal_user_id

    setUserId(uid)

    const link =
      `https://app.cashew.ph/?referral=${uid}`

    setReferralLink(link)

    loadInvites(uid)
  }

  async function loadInvites(uid: string) {

    const { data } = await supabase
      .from("invites")
      .select("*")
      .eq("referrer_internal_user_id", uid)
      .order("created_at", { ascending: false })

    if (data) setInvites(data)
  }

  const handleSendInvite = async (e: React.FormEvent) => {

    e.preventDefault()

    if (!email || !userId) return

    setLoading(true)

    try {

      // 1. store invite
      const { error } = await supabase
        .from("invites")
        .insert({
          referrer_internal_user_id: userId,
          invited_email: email.toLowerCase(),
          referral_code: userId
        })

      if (error) throw error

      // 2. send email
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

      loadInvites(userId)

    } catch (err) {

      console.error(err)

      toast({
        title: "Error",
        description: "Failed to send invitation"
      })
    }

    setLoading(false)
  }

  const resendInvite = async (inviteEmail: string) => {

    try {

      await supabase.functions.invoke("send_referral_email", {
        body: {
          email: inviteEmail,
          referralLink
        }
      })

      toast({
        title: "Resent!",
        description: `Invitation resent to ${inviteEmail}`
      })

    } catch {
      toast({
        title: "Error",
        description: "Failed to resend invitation"
      })
    }
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

      {/* SEND INVITE */}
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

      {/* REFERRAL LINK */}
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

      {/* INVITES TABLE */}
      <Card>
        <CardHeader>
          <CardTitle>Your Invitations</CardTitle>
        </CardHeader>

        <CardContent className="space-y-2">

          {invites.length === 0 &&
            <p className="text-sm text-muted-foreground">
              No invites yet
            </p>
          }

          {invites.map((i) => (

            <div
              key={i.id}
              className="flex justify-between items-center border rounded p-3"
            >

              <div>
                <div className="font-medium">
                  {i.invited_email}
                </div>

                <div className="text-sm text-muted-foreground">
                  {new Date(i.created_at).toLocaleDateString()}
                </div>
              </div>

              <div className="flex items-center space-x-2">

                <Badge variant="outline">
                  {i.status}
                </Badge>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => resendInvite(i.invited_email)}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>

              </div>

            </div>

          ))}

        </CardContent>
      </Card>

    </div>
  )
}