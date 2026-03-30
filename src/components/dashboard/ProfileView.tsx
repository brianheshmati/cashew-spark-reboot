import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
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
  MapPin,
  Edit,
  Save,
  X,
  Briefcase,
  Landmark,
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

interface Props {
  internalUserId?: string;
  internalUserEmail?: string;
}

export function ProfileView({ internalUserId, internalUserEmail }: Props) {
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [edited, setEdited] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    init();
  }, [internalUserEmail]);

  const init = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setAuthUser(user);

    const email = internalUserEmail ?? user.email;

    const { data } = await supabase
      .from("userProfiles")
      .select("*")
      .ilike("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const normalized: Profile = {
      first_name: data?.first_name ?? "",
      last_name: data?.last_name ?? "",
      email: data?.email ?? "",
      phone: data?.phone ?? null,
      address: data?.address ?? null,
      employer_name: data?.employer ?? null,
      employer_address: data?.employer_address ?? null,
      employer_phone: data?.employer_phone ?? null,
      position: data?.occupation ?? null,
      years_employed: data?.years_employed?.toString() ?? null,
      dob: data?.dob ?? null,
      facebook: data?.facebook ?? null,
      bank_name: data?.bank_name ?? null,
      bank_account_number: data?.bank_account ?? null,
      income: data?.income?.toString() ?? null,
      expense: data?.expense?.toString() ?? null,
      pay_schedule: data?.pay_schedule ?? null,
    };

    setProfile(normalized);
    setEdited(normalized);
    setLoading(false);
  };

  const handleChange = (field: keyof Profile, value: string) => {
    if (!edited) return;
    setEdited({ ...edited, [field]: value || null });
  };

  const save = async () => {
    if (!edited || !authUser) return;

    setSaving(true);

    const email =
      internalUserEmail ?? authUser.email ?? edited.email;

    const payload = {
      internal_user_id: internalUserId ?? authUser.id,
      first_name: edited.first_name,
      last_name: edited.last_name,
      email,
      phone: edited.phone,
      address: edited.address,
      employer: edited.employer_name,
      employer_phone: edited.employer_phone,
      employer_address: edited.employer_address,
      occupation: edited.position,
      years_employed: edited.years_employed
        ? Number(edited.years_employed)
        : null,
      dob: edited.dob,
      facebook: edited.facebook,
      bank_name: edited.bank_name,
      bank_account: edited.bank_account_number,
      income: edited.income ? Number(edited.income) : null,
      expense: edited.expense ? Number(edited.expense) : null,
      pay_schedule: edited.pay_schedule,
    };

    const { error } = await supabase
      .from("userProfiles")
      .update(payload)
      .ilike("email", email);

    if (error) {
      toast({ title: "Error saving", variant: "destructive" });
    } else {
      setProfile(edited);
      setEditing(false);
      toast({ title: "Profile updated" });
    }

    setSaving(false);
  };

  if (loading) return <div>Loading...</div>;
  if (!profile || !edited) return <div>No profile found</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h1 className="text-3xl font-bold">Profile</h1>

        {!editing ? (
          <Button onClick={() => setEditing(true)}>
            <Edit className="h-4 w-4 mr-2" /> Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button onClick={() => setEditing(false)} variant="outline">
              <X className="h-4 w-4 mr-2" /> Cancel
            </Button>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* PERSONAL */}
        <Card>
          <CardHeader>
            <CardTitle>
              <UserIcon className="inline mr-2" />
              Personal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InputField label="First Name" value={edited.first_name} edit={editing} onChange={(v) => handleChange("first_name", v)} />
            <InputField label="Last Name" value={edited.last_name} edit={editing} onChange={(v) => handleChange("last_name", v)} />

            <div className="p-3 bg-muted rounded flex justify-between">
              {profile.email}
              <Badge>Verified</Badge>
            </div>

            <InputField label="Phone" value={edited.phone} edit={editing} onChange={(v) => handleChange("phone", v)} />
            <InputField label="DOB" value={edited.dob} edit={editing} type="date" onChange={(v) => handleChange("dob", v)} />
          </CardContent>
        </Card>

        {/* ADDRESS */}
        <Card>
          <CardHeader>
            <CardTitle>
              <MapPin className="inline mr-2" />
              Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TextareaField value={edited.address} edit={editing} onChange={(v) => handleChange("address", v)} />
          </CardContent>
        </Card>

        {/* EMPLOYMENT */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>
              <Briefcase className="inline mr-2" />
              Employment
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <InputField label="Employer" value={edited.employer_name} edit={editing} onChange={(v) => handleChange("employer_name", v)} />
            <InputField label="Employer Phone" value={edited.employer_phone} edit={editing} onChange={(v) => handleChange("employer_phone", v)} />
            <TextareaField label="Employer Address" value={edited.employer_address} edit={editing} onChange={(v) => handleChange("employer_address", v)} />
            <InputField label="Position" value={edited.position} edit={editing} onChange={(v) => handleChange("position", v)} />
            <InputField label="Years" value={edited.years_employed} edit={editing} onChange={(v) => handleChange("years_employed", v)} />
          </CardContent>
        </Card>

        {/* FINANCIAL */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>
              <Landmark className="inline mr-2" />
              Financial
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <InputField label="Bank" value={edited.bank_name} edit={editing} onChange={(v) => handleChange("bank_name", v)} />
            <InputField label="Account #" value={edited.bank_account_number} edit={editing} onChange={(v) => handleChange("bank_account_number", v)} />
            <InputField label="Income" value={edited.income} edit={editing} onChange={(v) => handleChange("income", v)} />
            <InputField label="Expense" value={edited.expense} edit={editing} onChange={(v) => handleChange("expense", v)} />
            <TextareaField label="Pay Schedule" value={edited.pay_schedule} edit={editing} onChange={(v) => handleChange("pay_schedule", v)} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* reusable components */

const InputField = ({ label, value, edit, onChange, type = "text" }: any) => (
  <div className="space-y-1">
    <Label>{label}</Label>
    {edit ? (
      <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} type={type} />
    ) : (
      <div className="p-2 bg-muted rounded">{value || "—"}</div>
    )}
  </div>
);

const TextareaField = ({ label, value, edit, onChange }: any) => (
  <div className="space-y-1">
    {label && <Label>{label}</Label>}
    {edit ? (
      <Textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    ) : (
      <div className="p-2 bg-muted rounded whitespace-pre-line">
        {value || "—"}
      </div>
    )}
  </div>
);