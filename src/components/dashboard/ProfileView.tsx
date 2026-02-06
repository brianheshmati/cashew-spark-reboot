import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';
import { User as UserIcon, Mail, Phone, MapPin, Edit, Save, X, Briefcase } from 'lucide-react';

interface ProfileViewProps {
  user: User | null;
}

type ProfileRecord = Tables<'profiles'>;

interface Profile {
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  employer_name: string | null;
  employer_address: string | null;
  employer_phone: string | null;
  position: string | null;
  years_employed: string | null;
}

export function ProfileView({ user }: ProfileViewProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user?.id).maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        const profileRecord = data as ProfileRecord;
        const normalized: Profile = {
          ...profileRecord,
          employer_name: profileRecord.employer_name ?? null,
          employer_address: profileRecord.employer_address ?? null,
          employer_phone: profileRecord.employer_phone ?? null,
          position: profileRecord.position ?? null,
          years_employed: profileRecord.years_employed !== null ? String(profileRecord.years_employed) : null,
        };
        setProfile(normalized);
        setEditedProfile(normalized);
      } else {
        const newProfile = {
          first_name: user?.user_metadata?.first_name || '',
          last_name: user?.user_metadata?.last_name || '',
          email: user?.email || '',
          phone: null,
          address: null,
          employer_name: null,
          employer_address: null,
          employer_phone: null,
          position: null,
          years_employed: null,
        };
        setProfile(newProfile);
        setEditedProfile(newProfile);
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load profile data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editedProfile || !user) return;

    setSaving(true);
    try {
      const payload: TablesInsert<'profiles'> = {
        id: user.id,
        ...editedProfile,
        years_employed: editedProfile.years_employed ? Number(editedProfile.years_employed) : null,
      };

      const { error } = await supabase.from('profiles').upsert(payload);

      if (error) throw error;

      setProfile(editedProfile);
      setIsEditing(false);
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedProfile(profile);
    setIsEditing(false);
  };

  const handleInputChange = (field: keyof Profile, value: string) => {
    if (editedProfile) {
      setEditedProfile({
        ...editedProfile,
        [field]: value || null,
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Profile</h1>
        </div>
        <div className="text-center text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Profile</h1>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex space-x-2">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button onClick={handleCancel} variant="outline">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserIcon className="h-5 w-5 mr-2" />
              Personal Information
            </CardTitle>
            <CardDescription>Your basic personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                {isEditing ? (
                  <Input
                    value={editedProfile?.first_name || ''}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                    placeholder="First name"
                  />
                ) : (
                  <div className="p-3 bg-muted rounded-md">{profile?.first_name || 'Not provided'}</div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                {isEditing ? (
                  <Input
                    value={editedProfile?.last_name || ''}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                    placeholder="Last name"
                  />
                ) : (
                  <div className="p-3 bg-muted rounded-md">{profile?.last_name || 'Not provided'}</div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center">
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Label>
              <div className="p-3 bg-muted rounded-md flex items-center justify-between">
                {profile?.email}
                <Badge variant="secondary">Verified</Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center">
                <Phone className="h-4 w-4 mr-2" />
                Phone Number
              </Label>
              {isEditing ? (
                <Input
                  value={editedProfile?.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="Phone number"
                  type="tel"
                />
              ) : (
                <div className="p-3 bg-muted rounded-md">{profile?.phone || 'Not provided'}</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Address Information
            </CardTitle>
            <CardDescription>Your current address details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Address (3 lines)</Label>
              {isEditing ? (
                <Textarea
                  value={editedProfile?.address || ''}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder={'Street Address\nBarangay/City\nProvince/Postal'}
                  rows={3}
                />
              ) : (
                <div className="p-3 bg-muted rounded-md whitespace-pre-line">{profile?.address || 'Not provided'}</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Briefcase className="h-5 w-5 mr-2" />
              Employment
            </CardTitle>
            <CardDescription>Your employer and position details</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Employer&apos;s Name</Label>
              {isEditing ? (
                <Input value={editedProfile?.employer_name || ''} onChange={(e) => handleInputChange('employer_name', e.target.value)} />
              ) : (
                <div className="p-3 bg-muted rounded-md">{profile?.employer_name || 'Not provided'}</div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Employer&apos;s Phone Number</Label>
              {isEditing ? (
                <Input value={editedProfile?.employer_phone || ''} onChange={(e) => handleInputChange('employer_phone', e.target.value)} type="tel" />
              ) : (
                <div className="p-3 bg-muted rounded-md">{profile?.employer_phone || 'Not provided'}</div>
              )}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Employer&apos;s Address</Label>
              {isEditing ? (
                <Textarea value={editedProfile?.employer_address || ''} onChange={(e) => handleInputChange('employer_address', e.target.value)} rows={3} />
              ) : (
                <div className="p-3 bg-muted rounded-md whitespace-pre-line">{profile?.employer_address || 'Not provided'}</div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Position</Label>
              {isEditing ? (
                <Input value={editedProfile?.position || ''} onChange={(e) => handleInputChange('position', e.target.value)} />
              ) : (
                <div className="p-3 bg-muted rounded-md">{profile?.position || 'Not provided'}</div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Years Employed</Label>
              {isEditing ? (
                <Input
                  value={editedProfile?.years_employed || ''}
                  onChange={(e) => handleInputChange('years_employed', e.target.value)}
                  type="number"
                  min="0"
                />
              ) : (
                <div className="p-3 bg-muted rounded-md">{profile?.years_employed || 'Not provided'}</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
