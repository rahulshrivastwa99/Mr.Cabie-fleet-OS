import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Truck, UserCircle, Notebook, Receipt } from '@phosphor-icons/react';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE}/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      toast.error('Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#0047FF] border-t-transparent rounded-sm animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-[#525252]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Vehicles',
      value: stats?.total_vehicles || 0,
      subtitle: `${stats?.available_vehicles || 0} available`,
      icon: Truck,
      color: '#0047FF'
    },
    {
      title: 'Total Drivers',
      value: stats?.total_drivers || 0,
      subtitle: `${stats?.available_drivers || 0} available`,
      icon: UserCircle,
      color: '#00C853'
    },
    {
      title: 'Active Duties',
      value: stats?.active_duties || 0,
      subtitle: 'In progress',
      icon: Notebook,
      color: '#FFB300'
    },
    {
      title: 'Pending Invoices',
      value: stats?.pending_invoices || 0,
      subtitle: `₹${stats?.total_revenue?.toLocaleString('en-IN') || 0} revenue`,
      icon: Receipt,
      color: '#E00000'
    },
  ];

  return (
    <div className="p-6" data-testid="dashboard-page">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" data-testid="dashboard-title">Dashboard</h1>
        <p className="text-xs text-[#525252] uppercase tracking-widest mt-2">Operations Overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <div
            key={index}
            className="bg-white border border-[#E5E5E5] p-6 hover:border-[#525252] transition-colors duration-150"
            data-testid={`stat-card-${index}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-2">
                  {card.title}
                </p>
                <p className="text-3xl font-bold tracking-tight">{card.value}</p>
              </div>
              <card.icon size={32} weight="regular" style={{ color: card.color }} />
            </div>
            <p className="text-xs text-[#525252]">{card.subtitle}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 bg-white border border-[#E5E5E5] p-6">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight mb-4">Recent Activity</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 border-b border-[#E5E5E5]">
              <div>
                <p className="text-sm font-medium">Fleet management system active</p>
                <p className="text-xs text-[#525252]">All systems operational</p>
              </div>
              <span className="status-badge status-started">Active</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-[#E5E5E5]">
              <div>
                <p className="text-sm font-medium">{stats?.active_duties} duties in progress</p>
                <p className="text-xs text-[#525252]">Monitor live tracking</p>
              </div>
              <span className="status-badge status-accepted">Ongoing</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#E5E5E5] p-6">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button
              onClick={() => window.location.href = '/duties'}
              className="w-full px-4 py-3 text-left text-sm font-medium border border-[#E5E5E5] hover:bg-[#F5F5F5] transition-colors duration-150"
              data-testid="create-duty-quick-action"
            >
              Create New Duty
            </button>
            <button
              onClick={() => window.location.href = '/tracking'}
              className="w-full px-4 py-3 text-left text-sm font-medium border border-[#E5E5E5] hover:bg-[#F5F5F5] transition-colors duration-150"
              data-testid="view-tracking-quick-action"
            >
              View Live Tracking
            </button>
            <button
              onClick={() => window.location.href = '/billing'}
              className="w-full px-4 py-3 text-left text-sm font-medium border border-[#E5E5E5] hover:bg-[#F5F5F5] transition-colors duration-150"
              data-testid="generate-invoice-quick-action"
            >
              Generate Invoice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;