import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useCorporateAuth } from '../context/CorporateAuthContext';
import {
  Gauge,
  Calendar,
  Users,
  MapPin,
  Receipt,
  ChartBar,
  SignOut,
  UserCircle,
  FileText
} from '@phosphor-icons/react';

const CorporateLayout = () => {
  const { user, logout } = useCorporateAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/corporate/login');
  };

  const navItems = [
    { path: '/corporate', icon: Gauge, label: 'Dashboard', exact: true },
    { path: '/corporate/bookings', icon: Calendar, label: 'Bookings' },
    { path: '/corporate/duty-slips', icon: FileText, label: 'Duty Slips' },
    { path: '/corporate/employees', icon: Users, label: 'Employees', roles: ['ADMIN', 'HR'] },
    { path: '/corporate/tracking', icon: MapPin, label: 'Live Tracking' },
    { path: '/corporate/invoices', icon: Receipt, label: 'Invoices' },
    { path: '/corporate/reports', icon: ChartBar, label: 'Reports' },
  ];

  const filteredNavItems = navItems.filter(item => {
    if (!item.roles) return true;
    return item.roles.includes(user?.role);
  });

  return (
    <div className="flex h-screen bg-[#FAFAFA]">
      <aside className="w-64 bg-white border-r border-[#E5E5E5] flex flex-col">
        <div className="p-6 border-b border-[#E5E5E5]">
          <h1 className="text-xl font-bold tracking-tight" data-testid="corporate-app-title">Mr. Cabie</h1>
          <p className="text-xs text-[#525252] mt-1 uppercase tracking-widest">Corporate Portal</p>
        </div>
        
        <nav className="flex-1 p-4" data-testid="corporate-sidebar-nav">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 mb-1 text-sm transition-colors duration-150 ${
                  isActive
                    ? 'bg-[#E6EFFF] text-[#0047FF] border-l-2 border-[#0047FF]'
                    : 'text-[#525252] hover:bg-[#F5F5F5]'
                }`
              }
              data-testid={`corporate-nav-${item.label.toLowerCase()}`}
            >
              <item.icon size={20} weight="regular" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-[#E5E5E5]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-sm bg-[#E5E5E5] flex items-center justify-center">
              <UserCircle size={24} weight="regular" />
            </div>
            <div>
              <p className="text-sm font-semibold">{user?.display_name || user?.name}</p>
              <p className="text-xs text-[#525252] uppercase tracking-wider">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm border border-[#E5E5E5] hover:bg-[#F5F5F5] transition-colors duration-150"
            data-testid="corporate-logout-button"
          >
            <SignOut size={18} weight="regular" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default CorporateLayout;