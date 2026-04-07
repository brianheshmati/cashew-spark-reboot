import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { DashboardHeader } from '@/components/DashboardHeader';
import { OverviewView } from '@/components/dashboard/OverviewView';
import { ProfileView } from '@/components/dashboard/ProfileView';
import { LoansView } from '@/components/dashboard/LoansView';
import { TransactionsView } from '@/components/dashboard/TransactionsView';
import { InviteView } from '@/components/dashboard/InviteView';
import { ApplyView } from '@/components/dashboard/ApplyView';
import { DocumentsView } from '@/components/dashboard/DocumentsView';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import PaymentsView from '@/components/dashboard/PaymentsView';

type DashboardView =
  | 'overview'
  | 'profile'
  | 'loans'
  | 'transactions'
  | 'invite'
  | 'apply'
  | 'documents'
  | 'payments';

const DASHBOARD_LAST_VIEW_KEY = 'dashboard:last-view';

const profileEntryKey = (userId: string) =>
  `dashboard:profile-defaulted:${userId}`;

const isDashboardView = (value: string | null): value is DashboardView =>
  [
    'overview',
    'profile',
    'loans',
    'transactions',
    'invite',
    'apply',
    'documents',
    'payments',
  ].includes(value || '');

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [lookupEmail, setLookupEmail] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<DashboardView>(() => {
    const savedView = localStorage.getItem(DASHBOARD_LAST_VIEW_KEY);
    return isDashboardView(savedView) ? savedView : 'overview';
  });
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // 🔥 CLEAN EMAIL-BASED IMPERSONATION
  const getEmailFromUrl = () => {
    const params = new URLSearchParams(location.search);
    return params.get('email')?.toLowerCase() || null;
  };

  useEffect(() => {
    const urlEmail = getEmailFromUrl();

    if (urlEmail) {
      setLookupEmail(urlEmail);
      toast({
        title: 'Impersonation active',
        description: `Viewing data for ${urlEmail}`,
      });
    } else {
      setLookupEmail(user?.email?.toLowerCase() ?? null);
    }
  }, [location.search, user]);

  // PROFILE COMPLETENESS
  const isProfileComplete = useCallback(
    async (currentUser: User): Promise<boolean> => {
      const email = lookupEmail ?? currentUser.email ?? '';
      if (!email) return false;

      const { data } = await supabase
        .from('userProfiles')
        .select('*')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      const requiredValues = [
        data?.first_name || currentUser.user_metadata?.first_name || '',
        data?.last_name || currentUser.user_metadata?.last_name || '',
        data?.email || currentUser.email || '',
        data?.phone || '',
        data?.address || '',
        data?.employer_name || data?.employer || '',
        data?.employer_phone || '',
        data?.employer_address || '',
        data?.position || data?.occupation || '',
        data?.years_employed ?? '',
        data?.dob || '',
        data?.facebook_profile || '',
        data?.bank_name || '',
        data?.bank_account_number || '',
        data?.income ?? '',
        data?.expense ?? '',
        data?.pay_schedule || '',
      ];

      return requiredValues.every(
        (value) => String(value).trim().length > 0
      );
    },
    [lookupEmail]
  );

  const redirectToProfileIfIncomplete = useCallback(
    async (currentUser: User) => {
      const complete = await isProfileComplete(currentUser);
      const entryKey = profileEntryKey(currentUser.id);
      const hasDefaultedProfile =
        localStorage.getItem(entryKey) === 'true';

      if (!complete && !hasDefaultedProfile) {
        setCurrentView('profile');
        localStorage.setItem(entryKey, 'true');
      }
    },
    [isProfileComplete]
  );

  // AUTH
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (!session?.user) {
        navigate('/auth');
      } else {
        void redirectToProfileIfIncomplete(session.user);
      }

      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (!session?.user) {
        navigate('/auth');
      } else {
        void redirectToProfileIfIncomplete(session.user);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate, redirectToProfileIfIncomplete]);

  useEffect(() => {
    const locationView = (location.state as any)?.view;
    if (locationView) setCurrentView(locationView);
  }, [location.state]);

  useEffect(() => {
    localStorage.setItem(DASHBOARD_LAST_VIEW_KEY, currentView);
  }, [currentView]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn(err);
    } finally {
      navigate('/');
    }
  };

  // 🔥 PASS EMAIL, NOT internal_user_id
  const renderCurrentView = () => {
    switch (currentView) {
      case 'overview':
        return <OverviewView userEmail={lookupEmail ?? undefined} />;

      case 'profile':
        return <ProfileView internalUserEmail={lookupEmail ?? undefined} />;

      case 'loans':
        return <LoansView userEmail={lookupEmail ?? undefined} />;

      case 'transactions':
        return <TransactionsView userEmail={lookupEmail ?? undefined} />;

      case 'invite':
        return <InviteView internalUserEmail={lookupEmail ?? undefined} />;

      case 'apply':
        return (
          <ApplyView
            user={user}
            internalUserEmail={lookupEmail ?? undefined}
          />
        );

      case 'documents':
        return <DocumentsView user={user} />;

      case 'payments':
        return <PaymentsView />;

      default:
        return <OverviewView userEmail={lookupEmail ?? undefined} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar
          currentView={currentView}
          onViewChange={setCurrentView}
        />
        <div className="flex-1 flex flex-col">
          <DashboardHeader user={user} onSignOut={handleSignOut} />
          <main className="flex-1 p-4 md:p-6 bg-gradient-soft">
            {renderCurrentView()}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;