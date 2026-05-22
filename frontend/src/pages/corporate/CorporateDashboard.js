import React, { useState, useEffect } from 'react';
import { corporateAxios } from '../../context/CorporateAuthContext';
import { toast } from 'sonner';
import { Calendar, Users, MapPin, CurrencyDollar, TrendUp, Clock } from '@phosphor-icons/react';
import { useCorporateAuth } from '../../context/CorporateAuthContext';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api/corporate`;

const CorporateDashboard = () => {
  const { user } = useCorporateAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await corporateAxios.get(`${API_BASE}/dashboard/stats`);
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
      title: 'Total Bookings',
      value: stats?.total_bookings || 0,
      subtitle: `${stats?.pending_bookings || 0} pending`,
      icon: Calendar,
      color: '#0047FF',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Active Trips',
      value: stats?.active_trips || 0,
      subtitle: 'In progress now',
      icon: MapPin,
      color: '#00C853',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Employees',
      value: stats?.total_employees || 0,
      subtitle: 'Active users',
      icon: Users,
      color: '#FFB300',
      bgColor: 'bg-yellow-50'
    },
    {
      title: 'Monthly Cost',
      value: `₹${stats?.monthly_cost?.toLocaleString('en-IN') || 0}`,
      subtitle: `${stats?.this_month_trips || 0} trips this month`,
      icon: CurrencyDollar,
      color: '#E00000',
      bgColor: 'bg-red-50'
    },
  ];

  return (
    <div className="p-6" data-testid="corporate-dashboard-page">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" data-testid="corporate-dashboard-title">
          Welcome, {user?.display_name || user?.name}
        </h1>
        <p className="text-xs text-[#525252] uppercase tracking-widest mt-2">Corporate Dashboard</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, index) => (
          <div
            key={index}
            className={`${card.bgColor} border border-[#E5E5E5] p-6 hover:shadow-sm transition-all duration-150`}
            data-testid={`corporate-stat-card-${index}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-2">
                  {card.title}
                </p>
                <p className="text-3xl font-bold tracking-tight">{card.value}</p>
              </div>
              <div className="w-12 h-12 rounded-sm flex items-center justify-center" style={{ backgroundColor: card.color + '20' }}>
                <card.icon size={28} weight="bold" style={{ color: card.color }} />
              </div>
            </div>
            <p className="text-xs text-[#525252]">{card.subtitle}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-[#E5E5E5] p-6">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight mb-6 flex items-center gap-2">
            <Clock size={24} weight="bold" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => window.location.href = '/corporate/bookings'}
              className="p-6 border-2 border-[#0047FF] hover:bg-[#E6EFFF] transition-all duration-150 text-left group"
              data-testid="create-booking-quick-action"
            >
              <Calendar size={32} weight="bold" className="text-[#0047FF] mb-3" />
              <h3 className="text-lg font-semibold mb-1">Create Booking</h3>
              <p className="text-xs text-[#525252]">Book a trip for your employees</p>
            </button>

            <button
              onClick={() => window.location.href = '/corporate/tracking'}
              className="p-6 border-2 border-[#00C853] hover:bg-green-50 transition-all duration-150 text-left group"
              data-testid="track-trips-quick-action"
            >
              <MapPin size={32} weight="bold" className="text-[#00C853] mb-3" />
              <h3 className="text-lg font-semibold mb-1">Track Active Trips</h3>
              <p className="text-xs text-[#525252]">View live location of vehicles</p>
            </button>

            {(user?.role === 'ADMIN' || user?.role === 'HR') && (
              <button
                onClick={() => window.location.href = '/corporate/employees'}
                className="p-6 border-2 border-[#FFB300] hover:bg-yellow-50 transition-all duration-150 text-left group"
                data-testid="manage-employees-quick-action"
              >
                <Users size={32} weight="bold" className="text-[#FFB300] mb-3" />
                <h3 className="text-lg font-semibold mb-1">Manage Employees</h3>
                <p className="text-xs text-[#525252]">Add or update employee details</p>
              </button>
            )}

            <button
              onClick={() => window.location.href = '/corporate/invoices'}
              className="p-6 border-2 border-[#525252] hover:bg-[#F5F5F5] transition-all duration-150 text-left group"
              data-testid="view-invoices-quick-action"
            >
              <TrendUp size={32} weight="bold" className="text-[#525252] mb-3" />
              <h3 className="text-lg font-semibold mb-1">View Invoices</h3>
              <p className="text-xs text-[#525252]">Check billing and payments</p>
            </button>
          </div>
        </div>

        <div className="bg-white border border-[#E5E5E5] p-6">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight mb-6">Recent Activity</h2>
          <div className="space-y-4">
            <div className="p-4 bg-[#F5F5F5] border-l-4 border-[#0047FF]">
              <p className="text-sm font-semibold mb-1">System Active</p>
              <p className="text-xs text-[#525252]">All booking systems operational</p>
            </div>
            <div className="p-4 bg-[#F5F5F5] border-l-4 border-[#00C853]">
              <p className="text-sm font-semibold mb-1">{stats?.active_trips} Active Trips</p>
              <p className="text-xs text-[#525252]">Vehicles on the road</p>
            </div>
            {stats?.pending_bookings > 0 && (
              <div className="p-4 bg-[#FFF4E0] border-l-4 border-[#FFB300]">
                <p className="text-sm font-semibold mb-1">{stats.pending_bookings} Pending</p>
                <p className="text-xs text-[#525252]">Awaiting vehicle assignment</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CorporateDashboard;