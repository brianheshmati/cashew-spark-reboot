import { 
  User, 
  CreditCard, 
  History, 
  UserPlus, 
  FileText,
  Home
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';

type DashboardView = 'overview' | 'profile' | 'loans' | 'transactions' | 'invite' | 'apply';

interface AppSidebarProps {
  currentView: DashboardView;
  onViewChange: (view: DashboardView) => void;
}

const menuItems = [
  { id: 'overview' as DashboardView, title: 'Overview', icon: Home },
  { id: 'profile' as DashboardView, title: 'Profile', icon: User },
  { id: 'loans' as DashboardView, title: 'My Loans', icon: CreditCard },
  { id: 'transactions' as DashboardView, title: 'Transactions', icon: History },
  { id: 'apply' as DashboardView, title: 'Apply for Loan', icon: FileText },
  { id: 'invite' as DashboardView, title: 'Invite Friends', icon: UserPlus },
];

export function AppSidebar({ currentView, onViewChange }: AppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  return (
    <Sidebar
      className={collapsed ? "w-14" : "w-60"}
      collapsible="icon"
    >
      <SidebarTrigger className="m-2 self-end" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton 
                    onClick={() => onViewChange(item.id)}
                    className={currentView === item.id ? 
                      "bg-sidebar-accent text-sidebar-accent-foreground" : 
                      "hover:bg-sidebar-accent/50"
                    }
                  >
                    <item.icon className="h-4 w-4" />
                    {!collapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}