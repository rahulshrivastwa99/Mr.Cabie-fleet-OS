import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Gauge,
  Truck,
  UserCircle,
  Notebook,
  MapPin,
  Receipt,
  Building,
  SignOut,
  FileText,
  Handshake
} from '@phosphor-icons/react';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', icon: Gauge, label: 'Dashboard', exact: true },
    { path: '/fleet', icon: Truck, label: 'Fleet' },
    { path: '/drivers', icon: UserCircle, label: 'Drivers' },
    { path: '/trips', icon: Notebook, label: 'Trips' },
    { path: '/duty-slips', icon: FileText, label: 'Duty Slips' },
    { path: '/contracts', icon: Handshake, label: 'Contracts' },
    { path: '/tracking', icon: MapPin, label: 'Live Tracking' },
    { path: '/billing', icon: Receipt, label: 'Billing' },
    { path: '/clients', icon: Building, label: 'Clients' },
  ];

  return (
    <div className="flex h-screen bg-[#FAFAFA]">
      <aside className="w-64 bg-[#0A0A0A] border-r border-[#1A1A1A] flex flex-col">
        <div className="p-4 border-b border-[#1A1A1A]">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Mr. Cabie" className="h-10 w-auto" />
            <div>
              <h1 className="text-lg font-bold tracking-tight text-[#FFD700]" data-testid="app-title">Mr. Cabie</h1>
              <p className="text-xs text-gray-500 uppercase tracking-widest">Operations</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4" data-testid="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 mb-1 text-sm transition-colors duration-150 rounded-lg ${isActive
                  ? 'bg-[#FFD700]/10 text-[#FFD700] border-l-2 border-[#FFD700]'
                  : 'text-gray-400 hover:bg-[#1A1A1A] hover:text-white'
                }`
              }
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <item.icon size={20} weight="regular" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-[#1A1A1A]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-[#1A1A1A] flex items-center justify-center">
              <UserCircle size={24} weight="regular" className="text-[#FFD700]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{user?.name}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm border border-[#333] text-gray-400 hover:bg-[#1A1A1A] hover:text-white rounded-lg transition-colors duration-150"
            data-testid="logout-button"
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

export default Layout;