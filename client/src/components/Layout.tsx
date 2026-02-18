import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const routeTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/properties': 'Properties',
  '/tenancies': 'Tenancies',
  '/inspections': 'Inspections',
  '/maintenance': 'Maintenance',
  '/construction': 'Construction',
  '/legal-cases': 'Legal Cases',
  '/compliance': 'Compliance',
  '/powers-of-attorney': 'Powers of Attorney',
  '/expenses': 'Expenses',
  '/obligations': 'Obligations',
  '/revenue-records': 'Revenue Records',
  '/support-tickets': 'Support Tickets',
  '/chat': 'Chat',
  '/notifications': 'Notifications',
  '/documents': 'Documents',
  '/handovers': 'Handovers',
  '/escalations': 'Escalations',
  '/settings': 'Settings',
};

function getPageTitle(pathname: string): string {
  // Exact match first
  if (routeTitles[pathname]) {
    return routeTitles[pathname];
  }

  // Match parent route for detail pages (e.g., /properties/123)
  const parentPath = '/' + pathname.split('/').filter(Boolean)[0];
  if (routeTitles[parentPath]) {
    return routeTitles[parentPath];
  }

  // Fallback: capitalize the path segment
  const segment = pathname.split('/').filter(Boolean).pop() || 'Dashboard';
  return segment
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  const pageTitle = getPageTitle(location.pathname);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main content area */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'ml-[72px]' : 'ml-[280px]'
        }`}
      >
        {/* Header */}
        <Header title={pageTitle} />

        {/* Page content */}
        <main className="p-6 min-h-[calc(100vh-4rem)] overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
