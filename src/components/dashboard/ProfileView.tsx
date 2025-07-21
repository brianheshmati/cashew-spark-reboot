import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';
import { User as UserIcon, Mail, Phone, MapPin, Edit, Save, X, Briefcase, DollarSign, FileText } from 'lucide-react';

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

interface ApplicationData {
  id: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  address?: string;
  referral_code?: string;
  promo_code?: string;
  employment_status?: string;
  employer_name?: string;
  job_title?: string;
  monthly_income?: number;
  monthly_expense?: number;
  years_employed?: number;
  employer_phone?: string;
  employer_address?: string;
  loan_amount?: number;
  loan_purpose?: string;
  loan_term?: number;
  status?: string;
  created_at?: string;
}

export function ProfileView({ user }: ProfileViewProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [applicationData, setApplicationData] = useState<ApplicationData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchApplicationData();
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

  const fetchApplicationData = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching application data:', error);
        return;
      }

      if (data) {
        setApplicationData(data);
      }
    } catch (error: any) {
      console.error('Error fetching application data:', error);
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

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return 'Not provided';
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
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
        <div>
          <h1 className="text-3xl font-bold text-foreground">Profile</h1>
          <p className="text-muted-foreground">Manage your personal information and view application details</p>
        </div>
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

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic" className="flex items-center gap-2">
            <UserIcon className="w-4 h-4" />
            Basic Info
          </TabsTrigger>
          <TabsTrigger value="personal" className="flex items-center gap-2">
            <UserIcon className="w-4 h-4" />
            Personal Details
          </TabsTrigger>
          <TabsTrigger value="employment" className="flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Employment
          </TabsTrigger>
          <TabsTrigger value="loan" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Loan Info
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
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
        </TabsContent>

        <TabsContent value="personal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserIcon className="h-5 w-5 mr-2" />
                Personal Details from Application
              </CardTitle>
              <CardDescription>
                Personal information from your loan application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {applicationData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <div className="p-3 bg-muted rounded-md">
                      {applicationData.first_name || 'Not provided'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Middle Name</Label>
                    <div className="p-3 bg-muted rounded-md">
                      {applicationData.middle_name || 'Not provided'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <div className="p-3 bg-muted rounded-md">
                      {applicationData.last_name || 'Not provided'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <div className="p-3 bg-muted rounded-md">
                      {applicationData.email || 'Not provided'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <div className="p-3 bg-muted rounded-md">
                      {applicationData.phone || 'Not provided'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Date of Birth</Label>
                    <div className="p-3 bg-muted rounded-md">
                      {applicationData.date_of_birth ? new Date(applicationData.date_of_birth).toLocaleDateString() : 'Not provided'}
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Address</Label>
                    <div className="p-3 bg-muted rounded-md">
                      {applicationData.address || 'Not provided'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Referral Code</Label>
                    <div className="p-3 bg-muted rounded-md">
                      {applicationData.referral_code || 'Not provided'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Promo Code</Label>
                    <div className="p-3 bg-muted rounded-md">
                      {applicationData.promo_code || 'Not provided'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No application data found.</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Apply for a loan to see your personal information here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Briefcase className="h-5 w-5 mr-2" />
                Employment Information
              </CardTitle>
              <CardDescription>
                Employment details from your loan application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {applicationData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Employment Status</Label>
                    <div className="p-3 bg-muted rounded-md">
                      {applicationData.employment_status || 'Not provided'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Company/Employer</Label>
                    <div className="p-3 bg-muted rounded-md">
                      {applicationData.employer_name || 'Not provided'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Job Title/Position</Label>
                    <div className="p-3 bg-muted rounded-md">
                      {applicationData.job_title || 'Not provided'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Years Employed</Label>
                    <div className="p-3 bg-muted rounded-md">
                      {applicationData.years_employed ? `${applicationData.years_employed} years` : 'Not provided'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Monthly Income</Label>
                    <div className="p-3 bg-muted rounded-md">
                      {formatCurrency(applicationData.monthly_income)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Monthly Expenses</Label>
                    <div className="p-3 bg-muted rounded-md">
                      {formatCurrency(applicationData.monthly_expense)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Employer Phone</Label>
                    <div className="p-3 bg-muted rounded-md">
                      {applicationData.employer_phone || 'Not provided'}
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Employer Address</Label>
                    <div className="p-3 bg-muted rounded-md">
                      {applicationData.employer_address || 'Not provided'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No employment data found.</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Apply for a loan to see your employment information here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loan" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Loan Information
              </CardTitle>
              <CardDescription>
                Loan details from your most recent application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {applicationData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Loan Amount</Label>
                    <div className="p-3 bg-muted rounded-md">
                      {formatCurrency(applicationData.loan_amount)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Loan Purpose</Label>
                    <div className="p-3 bg-muted rounded-md">
                      {applicationData.loan_purpose || 'Not provided'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Loan Term</Label>
                    <div className="p-3 bg-muted rounded-md">
                      {applicationData.loan_term ? `${applicationData.loan_term} months` : 'Not provided'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Application Status</Label>
                    <div className="p-3 bg-muted rounded-md">
                      <Badge variant={
                        applicationData.status === 'approved' ? 'default' :
                        applicationData.status === 'pending' ? 'secondary' :
                        applicationData.status === 'draft' ? 'outline' : 'destructive'
                      }>
                        {applicationData.status?.toUpperCase() || 'UNKNOWN'}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Application Date</Label>
                    <div className="p-3 bg-muted rounded-md">
                      {applicationData.created_at ? new Date(applicationData.created_at).toLocaleDateString() : 'Not provided'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No loan application data found.</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Apply for a loan to see your loan information here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}