import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';
import { User as UserIcon, Mail, Phone, MapPin, Edit, Save, X } from 'lucide-react';

interface ProfileViewProps {
  user: User | null;
}

interface Profile {
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
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
      console.log(supabase);
      const { data, error } = await supabase
        .from('borrower_profile_view')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile(data);
        setEditedProfile(data);
      } else {
        // Create profile from user metadata if it doesn't exist
        const newProfile = {
          first_name: user?.user_metadata?.first_name || '',
          last_name: user?.user_metadata?.last_name || '',
          email: user?.email || '',
          phone: null,
          address: null,
          city: null,
          state: null,
          zip_code: null
        };
        setProfile(newProfile);
        setEditedProfile(newProfile);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editedProfile || !user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ...editedProfile
        });

      if (error) throw error;

      setProfile(editedProfile);
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
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
        [field]: value || null
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
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserIcon className="h-5 w-5 mr-2" />
              Personal Information
            </CardTitle>
            <CardDescription>
              Your basic personal details
            </CardDescription>
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
                  <div className="p-3 bg-muted rounded-md">
                    {profile?.first_name || 'Not provided'}
                  </div>
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
                  <div className="p-3 bg-muted rounded-md">
                    {profile?.last_name || 'Not provided'}
                  </div>
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
                <div className="p-3 bg-muted rounded-md">
                  {profile?.phone || 'Not provided'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Address Information
            </CardTitle>
            <CardDescription>
              Your current address details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Street Address</Label>
              {isEditing ? (
                <Input
                  value={editedProfile?.address || ''}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Street address"
                />
              ) : (
                <div className="p-3 bg-muted rounded-md">
                  {profile?.address || 'Not provided'}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                {isEditing ? (
                  <Input
                    value={editedProfile?.city || ''}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="City"
                  />
                ) : (
                  <div className="p-3 bg-muted rounded-md">
                    {profile?.city || 'Not provided'}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                {isEditing ? (
                  <Input
                    value={editedProfile?.state || ''}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    placeholder="State"
                  />
                ) : (
                  <div className="p-3 bg-muted rounded-md">
                    {profile?.state || 'Not provided'}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>ZIP Code</Label>
              {isEditing ? (
                <Input
                  value={editedProfile?.zip_code || ''}
                  onChange={(e) => handleInputChange('zip_code', e.target.value)}
                  placeholder="ZIP code"
                />
              ) : (
                <div className="p-3 bg-muted rounded-md">
                  {profile?.zip_code || 'Not provided'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}