import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { Mail, RefreshCw } from 'lucide-react'
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

    loadInvites(uid)
  }

  async function loadInvites(uid: string) {

    const { data, error } = await supabase
      .from("invites")
      .select("*")
      .eq("referrer_internal_user_id", uid)
      .order("created_at", { ascending: false })

    if (error) {
      console.error(error)
      return
    }

    if (data) setInvites(data)
  }

  const handleSendInvite = async (e: React.FormEvent) => {

    e.preventDefault()

    if (!email || !userId) return

    setLoading(true)

    try {

      const normalizedEmail = email.trim().toLowerCase()

      // 🔥 Check if already a user
      const { data: existingUser } = await supabase
        .from("userProfiles")
        .select("id")
        .eq("email", normalizedEmail)
        .limit(1)

      if (existingUser && existingUser.length > 0) {
        toast({
          title: "Already a user",
          description: "This person is already registered."
        })
        setLoading(false)
        return
      }

      // 🔥 Insert invite
      const { error } = await supabase
        .from("invites")
        .insert({
          referrer_internal_user_id: userId,
          invited_email: normalizedEmail,
          referral_code: userId,
          status: 'sent'
        })

      if (error) {

        if (error.code === '23505') {
          toast({
            title: "Already invited",
            description: "This email has already been invited."
          })
          setLoading(false)
          return
        }

        throw error
      }

      // 🔥 Send email
      await supabase.functions.invoke("send_referral_email", {
        body: {
          email: normalizedEmail
        }
      })

      toast({
        title: "Invitation sent!",
        description: `Invitation sent to ${normalizedEmail}`
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
          email: inviteEmail
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

  return (

    <div className="space-y-6">

      {/* HEADER */}
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

      {/* INVITES LIST */}
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

          {invites.map((invite) => (

            <div
              key={invite.id}
              className="flex justify-between items-center border rounded p-3"
            >

              <div>
                <div className="font-medium">
                  {invite.invited_email}
                </div>

                <div className="text-sm text-muted-foreground">
                  {new Date(invite.created_at).toLocaleDateString()}
                </div>
              </div>

              <div className="flex items-center space-x-2">

                <Badge variant="outline">
                  {invite.status}
                </Badge>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => resendInvite(invite.invited_email)}
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