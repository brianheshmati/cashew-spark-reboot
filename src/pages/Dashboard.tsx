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

type DashboardView = 'overview' | 'profile' | 'loans' | 'transactions' | 'invite' | 'apply' | 'documents';

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [currentView, setCurrentView] = useState<DashboardView>('overview');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const localTestUserId = import.meta.env.VITE_LOCAL_TEST_USER_ID as string | undefined;
  const overviewUserId = localTestUserId ?? user?.id;

  const isProfileComplete = useCallback(async (currentUser: User): Promise<boolean> => {
    const { data } = await supabase
      .from('userProfiles')
      .select('*')
      .eq('id', currentUser.id)
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
  }, []);

  const redirectToProfileIfIncomplete = useCallback(async (currentUser: User): Promise<void> => {
    const complete = await isProfileComplete(currentUser);
    if (!complete) {
      setCurrentView('profile');
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
        return <ProfileView user={user} />;
      case 'loans':
        return overviewUserId ? <LoansView userId={overviewUserId} /> : null;
      case 'transactions':
        return <TransactionsView />;
      case 'invite':
        return <InviteView />;
      case 'apply':
        return <ApplyView user={user} />;
      case 'documents':
        return <DocumentsView user={user} />;
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
