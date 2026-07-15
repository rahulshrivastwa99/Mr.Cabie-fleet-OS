import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useCorporateAuth } from '../context/CorporateAuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Gauge,
  Calendar,
  Users,
  MapPin,
  Receipt,
  ChartBar,
  SignOut,
  UserCircle,
  FileText,
  Gear,
  Eye,
  EyeSlash
} from '@phosphor-icons/react';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api/corporate`;

const CorporateLayout = () => {
  const { user, logout } = useCorporateAuth();
  const navigate = useNavigate();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/corporate/login');
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordData.new_password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setChangingPassword(true);
    try {
      await axios.post(`${API_BASE}/auth/change-password`, {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      });
      toast.success('Password changed successfully');
      setShowPasswordModal(false);
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
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
      <aside className="w-64 bg-[#0A0A0A] border-r border-[#1A1A1A] flex flex-col">
        <div className="p-4 border-b border-[#1A1A1A]">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Mr. Cabie" className="h-10 w-auto" />
            <div>
              <h1 className="text-lg font-bold tracking-tight text-[#FFD700]" data-testid="corporate-app-title">Mr. Cabie</h1>
              <p className="text-xs text-gray-500 uppercase tracking-widest">Corporate Portal</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4" data-testid="corporate-sidebar-nav">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 mb-1 text-sm transition-colors duration-150 rounded-lg ${
                  isActive
                    ? 'bg-[#FFD700]/10 text-[#FFD700] border-l-2 border-[#FFD700]'
                    : 'text-gray-400 hover:bg-[#1A1A1A] hover:text-white'
                }`
              }
              data-testid={`corporate-nav-${item.label.toLowerCase()}`}
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
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{user?.display_name || user?.name}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider">{user?.role}</p>
            </div>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="p-2 text-gray-400 hover:text-[#FFD700] hover:bg-[#1A1A1A] rounded-lg transition-colors"
              title="Settings"
              data-testid="corporate-settings-button"
            >
              <Gear size={18} />
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm border border-[#333] text-gray-400 hover:bg-[#1A1A1A] hover:text-white rounded-lg transition-colors duration-150"
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

      {/* Change Password Modal */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Change Password</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePasswordChange} className="space-y-4 mt-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm pr-10"
                  required
                  data-testid="current-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#525252] hover:text-[#0A0A0A]"
                >
                  {showCurrentPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm pr-10"
                  required
                  minLength={6}
                  data-testid="new-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#525252] hover:text-[#0A0A0A]"
                >
                  {showNewPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                Confirm New Password
              </label>
              <input
                type="password"
                value={passwordData.confirm_password}
                onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                required
                minLength={6}
                data-testid="confirm-password-input"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
                }}
                className="flex-1 px-4 py-2 border border-[#E5E5E5] text-sm font-medium hover:bg-[#F5F5F5] transition-colors duration-150"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={changingPassword}
                className="flex-1 px-4 py-2 bg-[#0047FF] text-white text-sm font-semibold hover:bg-[#003BCC] transition-colors duration-150 disabled:opacity-50"
                data-testid="save-password-button"
              >
                {changingPassword ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CorporateLayout;