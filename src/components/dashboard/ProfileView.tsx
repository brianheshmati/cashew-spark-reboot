import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User as SupabaseUser } from "@supabase/supabase-js";
import {
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Edit,
  Save,
  X,
  Briefcase,
  CalendarDays,
  Landmark,
  PiggyBank,
} from "lucide-react";

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
  dob: string | null;
  facebook: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  income: string | null;
  expense: string | null;
  pay_schedule: string | null;
}

export function ProfileView(): JSX.Element {
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editedProfile, setEditedProfile] = useState<Profile | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    void initialize();
  }, []);

  const initialize = async (): Promise<void> => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    setAuthUser(user);

    const { data } = await supabase
      .from("userProfiles")
      .select("*")
      .eq("id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const normalized: Profile = {
      first_name: data?.first_name ?? "",
      last_name: data?.last_name ?? "",
      email: data?.email ?? user.email ?? "",
      phone: data?.phone || null,
      address: data?.address || null,

      employer_name: data?.employer || null,
      employer_address: data?.employer_address || null,
      employer_phone: data?.employer_phone || null,

      position: data?.occupation || null,

      years_employed:
        data?.years_employed !== null && data?.years_employed !== undefined
          ? String(data.years_employed)
          : null,

      dob: data?.dob || null,
      facebook: data?.facebook || null,

      bank_name: data?.bank_name || null,
      bank_account_number: data?.bank_account || null,

      income:
        data?.income !== null && data?.income !== undefined
          ? String(data.income)
          : null,

      expense:
        data?.expense !== null && data?.expense !== undefined
          ? String(data.expense)
          : null,

      pay_schedule: data?.pay_schedule || null,
    };

    setProfile(normalized);
    setEditedProfile(normalized);
    setLoading(false);
  };

  const handleSave = async (): Promise<void> => {
    if (!editedProfile || !authUser) return;

    setSaving(true);

    const payload = {
      internal_user_id: authUser.id,
      first_name: editedProfile.first_name,
      last_name: editedProfile.last_name,
      email: editedProfile.email,
      phone: editedProfile.phone,
      address: editedProfile.address,
      employer: editedProfile.employer_name,
      employer_phone: editedProfile.employer_phone,
      employer_address: editedProfile.employer_address,
      occupation: editedProfile.position,
      years_employed: editedProfile.years_employed
        ? Number(editedProfile.years_employed)
        : null,
      dob: editedProfile.dob,
      facebook: editedProfile.facebook,
      bank_name: editedProfile.bank_name,
      bank_account: editedProfile.bank_account_number,
      income: editedProfile.income ? Number(editedProfile.income) : null,
      expense: editedProfile.expense ? Number(editedProfile.expense) : null,
      pay_schedule: editedProfile.pay_schedule,
    };

    const { error } = await supabase.from("userProfiles").upsert(payload);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } else {
      setProfile(editedProfile);
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    }

    setSaving(false);
  };

  const handleCancel = (): void => {
    setEditedProfile(profile);
    setIsEditing(false);
  };

  const handleInputChange = (
    field: keyof Profile,
    value: string
  ): void => {
    if (!editedProfile) return;

    setEditedProfile({
      ...editedProfile,
      [field]: value || null,
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Profile</h1>
        <div className="text-center text-muted-foreground">
          Loading profile...
        </div>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Profile</h1>
        <div className="text-center text-muted-foreground">
          No authenticated user.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-foreground">Profile</h1>

        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:space-x-2">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save"}
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
                    value={editedProfile?.first_name ?? ""}
                    onChange={(e) =>
                      handleInputChange("first_name", e.target.value)
                    }
                  />
                ) : (
                  <div className="p-3 bg-muted rounded-md">
                    {profile?.first_name || "Not provided"}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Last Name</Label>
                {isEditing ? (
                  <Input
                    value={editedProfile?.last_name ?? ""}
                    onChange={(e) =>
                      handleInputChange("last_name", e.target.value)
                    }
                  />
                ) : (
                  <div className="p-3 bg-muted rounded-md">
                    {profile?.last_name || "Not provided"}
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
                  value={editedProfile?.phone ?? ""}
                  onChange={(e) =>
                    handleInputChange("phone", e.target.value)
                  }
                  type="tel"
                />
              ) : (
                <div className="p-3 bg-muted rounded-md">
                  {profile?.phone || "Not provided"}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center">
                <CalendarDays className="h-4 w-4 mr-2" />
                Date of Birth
              </Label>
              {isEditing ? (
                <Input
                  value={editedProfile?.dob ?? ""}
                  onChange={(e) =>
                    handleInputChange("dob", e.target.value)
                  }
                  type="date"
                />
              ) : (
                <div className="p-3 bg-muted rounded-md">
                  {profile?.dob || "Not provided"}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Facebook Profile Link</Label>
              {isEditing ? (
                <Input
                  value={editedProfile?.facebook ?? ""}
                  onChange={(e) =>
                    handleInputChange("facebook", e.target.value)
                  }
                  type="url"
                  placeholder="https://facebook.com/your-profile"
                />
              ) : (
                <div className="p-3 bg-muted rounded-md break-all">
                  {profile?.facebook || "Not provided"}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Address */}
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

          <CardContent>
            <div className="space-y-2">
              <Label>Address (3 lines)</Label>
              {isEditing ? (
                <Textarea
                  value={editedProfile?.address ?? ""}
                  onChange={(e) =>
                    handleInputChange("address", e.target.value)
                  }
                  rows={3}
                />
              ) : (
                <div className="p-3 bg-muted rounded-md whitespace-pre-line">
                  {profile?.address || "Not provided"}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Employment */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Briefcase className="h-5 w-5 mr-2" />
              Employment
            </CardTitle>
            <CardDescription>
              Your employer and position details
            </CardDescription>
          </CardHeader>

          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Employer's Name</Label>
              {isEditing ? (
                <Input
                  value={editedProfile?.employer_name ?? ""}
                  onChange={(e) =>
                    handleInputChange("employer_name", e.target.value)
                  }
                />
              ) : (
                <div className="p-3 bg-muted rounded-md">
                  {profile?.employer_name || "Not provided"}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Employer's Phone Number</Label>
              {isEditing ? (
                <Input
                  value={editedProfile?.employer_phone ?? ""}
                  onChange={(e) =>
                    handleInputChange("employer_phone", e.target.value)
                  }
                  type="tel"
                />
              ) : (
                <div className="p-3 bg-muted rounded-md">
                  {profile?.employer_phone || "Not provided"}
                </div>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Employer's Address</Label>
              {isEditing ? (
                <Textarea
                  value={editedProfile?.employer_address ?? ""}
                  onChange={(e) =>
                    handleInputChange(
                      "employer_address",
                      e.target.value
                    )
                  }
                  rows={3}
                />
              ) : (
                <div className="p-3 bg-muted rounded-md whitespace-pre-line">
                  {profile?.employer_address || "Not provided"}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Position</Label>
              {isEditing ? (
                <Input
                  value={editedProfile?.position ?? ""}
                  onChange={(e) =>
                    handleInputChange("position", e.target.value)
                  }
                />
              ) : (
                <div className="p-3 bg-muted rounded-md">
                  {profile?.position || "Not provided"}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Years Employed</Label>
              {isEditing ? (
                <Input
                  value={editedProfile?.years_employed ?? ""}
                  onChange={(e) =>
                    handleInputChange(
                      "years_employed",
                      e.target.value
                    )
                  }
                  type="number"
                  min="0"
                />
              ) : (
                <div className="p-3 bg-muted rounded-md">
                  {profile?.years_employed || "Not provided"}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Financial Information */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Landmark className="h-5 w-5 mr-2" />
              Financial Information
            </CardTitle>
            <CardDescription>
              Your banking and cash flow details
            </CardDescription>
          </CardHeader>

          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>The name of your bank</Label>
              {isEditing ? (
                <Input
                  value={editedProfile?.bank_name ?? ""}
                  onChange={(e) =>
                    handleInputChange("bank_name", e.target.value)
                  }
                />
              ) : (
                <div className="p-3 bg-muted rounded-md">
                  {profile?.bank_name || "Not provided"}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Your bank account number (to deposit the funds)</Label>
              {isEditing ? (
                <Input
                  value={editedProfile?.bank_account_number ?? ""}
                  onChange={(e) =>
                    handleInputChange("bank_account_number", e.target.value)
                  }
                />
              ) : (
                <div className="p-3 bg-muted rounded-md">
                  {profile?.bank_account_number || "Not provided"}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center">
                <PiggyBank className="h-4 w-4 mr-2" />
                Monthly income
              </Label>
              {isEditing ? (
                <Input
                  value={editedProfile?.income ?? ""}
                  onChange={(e) =>
                    handleInputChange("income", e.target.value)
                  }
                  type="number"
                  min="0"
                />
              ) : (
                <div className="p-3 bg-muted rounded-md">
                  {profile?.income || "Not provided"}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Estimated monthly expense</Label>
              {isEditing ? (
                <Input
                  value={editedProfile?.expense ?? ""}
                  onChange={(e) =>
                    handleInputChange("expense", e.target.value)
                  }
                  type="number"
                  min="0"
                />
              ) : (
                <div className="p-3 bg-muted rounded-md">
                  {profile?.expense || "Not provided"}
                </div>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Pay schedule (days you get your pay)</Label>
              {isEditing ? (
                <Textarea
                  value={editedProfile?.pay_schedule ?? ""}
                  onChange={(e) =>
                    handleInputChange("pay_schedule", e.target.value)
                  }
                  rows={2}
                />
              ) : (
                <div className="p-3 bg-muted rounded-md whitespace-pre-line">
                  {profile?.pay_schedule || "Not provided"}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}