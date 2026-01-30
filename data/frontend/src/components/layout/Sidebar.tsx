import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BarChart3,
  Database,
  Settings,
  HelpCircle,
} from 'lucide-react';

interface SidebarItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const mainNavItems: SidebarItem[] = [
  {
    label: 'Dashboard',
    path: '/',
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    label: 'Intake Analytics',
    path: '/analytics/intake',
    icon: <BarChart3 className="w-5 h-5" />,
  },
  {
    label: 'Datasets',
    path: '/datasets',
    icon: <Database className="w-5 h-5" />,
  },
];

const bottomNavItems: SidebarItem[] = [
  {
    label: 'Settings',
    path: '/settings',
    icon: <Settings className="w-5 h-5" />,
  },
  {
    label: 'Help',
    path: '/help',
    icon: <HelpCircle className="w-5 h-5" />,
  },
];

interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed = false,
}) => {
  const renderNavItem = (item: SidebarItem) => (
    <NavLink
      key={item.path}
      to={item.path}
      end={item.path === '/'}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
          isActive
            ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-600 -ml-1 pl-4'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        } ${isCollapsed ? 'justify-center' : ''}`
      }
      title={isCollapsed ? item.label : undefined}
    >
      {item.icon}
      {!isCollapsed && <span>{item.label}</span>}
    </NavLink>
  );

  return (
    <aside
      className={`
        hidden lg:flex flex-col bg-white border-r border-gray-200 
        transition-all duration-300
        ${isCollapsed ? 'w-16' : 'w-64'}
      `}
    >
      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p
          className={`px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider ${
            isCollapsed ? 'hidden' : ''
          }`}
        >
          Analytics
        </p>
        {mainNavItems.map(renderNavItem)}
      </nav>

      {/* Bottom Navigation */}
      <nav className="px-3 py-4 border-t border-gray-100 space-y-1">
        {bottomNavItems.map(renderNavItem)}
      </nav>
    </aside>
  );
};

export default Sidebar;
