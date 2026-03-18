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
import { getInternalUserEmailFromSearch, resolveInternalUserId } from '@/lib/internal-user';

type DashboardView = 'overview' | 'profile' | 'loans' | 'transactions' | 'invite' | 'apply' | 'documents';
const DASHBOARD_LAST_VIEW_KEY = 'dashboard:last-view';
const profileEntryKey = (userId: string) => `dashboard:profile-defaulted:${userId}`;

const isDashboardView = (value: string | null): value is DashboardView =>
  value === 'overview' ||
  value === 'profile' ||
  value === 'loans' ||
  value === 'transactions' ||
  value === 'invite' ||
  value === 'apply' ||
  value === 'documents';

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
  const localTestUserId = import.meta.env.VITE_LOCAL_TEST_USER_ID as string | undefined;
  const { effectiveUserId: overviewUserId, impersonatedUserId } = resolveInternalUserId({
    authenticatedUserId: user?.id,
    localTestUserId,
    search: location.search
  });
  const urlLookupEmail = getInternalUserEmailFromSearch(location.search);

  useEffect(() => {
    if (urlLookupEmail) {
      setLookupEmail(urlLookupEmail);
      return;
    }

    setLookupEmail(user?.email ?? null);
  }, [urlLookupEmail, user]);

  const isProfileComplete = useCallback(async (currentUser: User): Promise<boolean> => {
    const emailForLookup = lookupEmail ?? currentUser.email ?? '';
    if (!emailForLookup) {
      return false;
    }

    const { data } = await supabase
      .from('userProfiles')
      .select('*')
      .ilike('email', emailForLookup)
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

    return requiredValues.every((value) => String(value).trim().length > 0);
  }, [lookupEmail]);

  const redirectToProfileIfIncomplete = useCallback(async (currentUser: User): Promise<void> => {
    const complete = await isProfileComplete(currentUser);
    const entryKey = profileEntryKey(currentUser.id);
    const hasDefaultedProfile = localStorage.getItem(entryKey) === 'true';

    if (!complete && !hasDefaultedProfile) {
      setCurrentView('profile');
      localStorage.setItem(entryKey, 'true');
    }
  }, [isProfileComplete]);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session?.user) {
          setTimeout(() => {
            navigate('/auth');
          }, 0);
        } else {
          void redirectToProfileIfIncomplete(session.user);
        }
        setLoading(false);
      }
    );

    // Check for existing session
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
    const locationView = (location.state as { view?: DashboardView } | null)?.view;
    if (locationView) {
      setCurrentView(locationView);
    }
  }, [location.state]);

  useEffect(() => {
    localStorage.setItem(DASHBOARD_LAST_VIEW_KEY, currentView);
  }, [currentView]);

  useEffect(() => {
    if (impersonatedUserId) {
      toast({
        title: 'Impersonation active',
        description: `Viewing data for uid: ${impersonatedUserId}`
      });
    }
  }, [impersonatedUserId, toast]);

  const handleSignOut = async () => {

    try {

      const { error } = await supabase.auth.signOut()

      if (error && error.message !== "Auth session missing") {
        console.error(error)
      }

    } catch (err) {

      console.warn("Logout warning:", err)

    } finally {

      navigate("/")

    }

  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'overview':
        return overviewUserId ? <OverviewView userId={overviewUserId} /> : null;
      case 'profile':
        return <ProfileView internalUserId={overviewUserId} internalUserEmail={lookupEmail ?? undefined} />;
      case 'loans':
        return overviewUserId ? <LoansView userId={overviewUserId} userEmail={lookupEmail ?? undefined} /> : null;
      case 'transactions':
        return <TransactionsView internalUserId={overviewUserId} />;
      case 'invite':
        return <InviteView internalUserId={overviewUserId} internalUserEmail={lookupEmail ?? undefined} />;
      case 'apply':
        return <ApplyView user={user} internalUserId={overviewUserId} internalUserEmail={lookupEmail ?? undefined} />;
      case 'documents':
        return <DocumentsView user={user} internalUserId={overviewUserId} />;
      default:
        return overviewUserId ? <OverviewView userId={overviewUserId} /> : null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar 
          currentView={currentView}
          onViewChange={setCurrentView}
        />
        <div className="flex-1 flex flex-col">
          <DashboardHeader 
            user={user}
            onSignOut={handleSignOut}
          />
          <main className="flex-1 p-4 md:p-6 bg-gradient-soft">
            {renderCurrentView()}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
