import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  ClipboardCheck,
  Wrench,
  HardHat,
  Scale,
  ShieldCheck,
  FileSignature,
  Receipt,
  FileCheck,
  DollarSign,
  Ticket,
  MessageSquare,
  Bell,
  FolderOpen,
  ArrowRightLeft,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'OVERVIEW',
    items: [
      { label: 'Dashboard', path: '/', icon: <LayoutDashboard className="h-5 w-5" /> },
    ],
  },
  {
    title: 'PROPERTY',
    items: [
      { label: 'Properties', path: '/properties', icon: <Building2 className="h-5 w-5" /> },
      { label: 'Tenancies', path: '/tenancies', icon: <Users className="h-5 w-5" /> },
      { label: 'Inspections', path: '/inspections', icon: <ClipboardCheck className="h-5 w-5" /> },
      { label: 'Maintenance', path: '/maintenance', icon: <Wrench className="h-5 w-5" /> },
      { label: 'Construction', path: '/construction', icon: <HardHat className="h-5 w-5" /> },
    ],
  },
  {
    title: 'LEGAL',
    items: [
      { label: 'Legal Cases', path: '/legal-cases', icon: <Scale className="h-5 w-5" /> },
      { label: 'Compliance', path: '/compliance', icon: <ShieldCheck className="h-5 w-5" /> },
      { label: 'Powers of Attorney', path: '/powers-of-attorney', icon: <FileSignature className="h-5 w-5" /> },
    ],
  },
  {
    title: 'FINANCIAL',
    items: [
      { label: 'Expenses', path: '/expenses', icon: <Receipt className="h-5 w-5" /> },
      { label: 'Obligations', path: '/obligations', icon: <FileCheck className="h-5 w-5" /> },
      { label: 'Revenue Records', path: '/revenue-records', icon: <DollarSign className="h-5 w-5" /> },
    ],
  },
  {
    title: 'COMMUNICATION',
    items: [
      { label: 'Support Tickets', path: '/support-tickets', icon: <Ticket className="h-5 w-5" /> },
      { label: 'Chat', path: '/chat', icon: <MessageSquare className="h-5 w-5" /> },
      { label: 'Notifications', path: '/notifications', icon: <Bell className="h-5 w-5" /> },
    ],
  },
  {
    title: 'SERVICE',
    items: [
      { label: 'Documents', path: '/documents', icon: <FolderOpen className="h-5 w-5" /> },
      { label: 'Handovers', path: '/handovers', icon: <ArrowRightLeft className="h-5 w-5" /> },
      { label: 'Escalations', path: '/escalations', icon: <AlertTriangle className="h-5 w-5" /> },
    ],
  },
];

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user } = useAuth();

  const userInitials = user
    ? `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase()
    : '??';

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen bg-gray-900 text-white flex flex-col transition-all duration-300 ease-in-out ${
        collapsed ? 'w-[72px]' : 'w-[280px]'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-600 flex-shrink-0">
          <Shield className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight whitespace-nowrap">
            Elevare
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6 scrollbar-thin">
        {navSections.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                {section.title}
              </p>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group
                      ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                      }
                      ${collapsed ? 'justify-center' : ''}`
                    }
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    {!collapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* User profile section */}
      {user && (
        <div className="border-t border-gray-800 px-3 py-3 flex-shrink-0">
          <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-indigo-600 flex-shrink-0 text-sm font-semibold">
              {userInitials}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-gray-500 capitalize truncate">
                  {user.roles?.[0] || 'User'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <div className="border-t border-gray-800 px-3 py-3 flex-shrink-0">
        <button
          onClick={onToggle}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-all duration-200 w-full ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
