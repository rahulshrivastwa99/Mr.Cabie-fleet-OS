import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { MapPin, Truck, Phone } from '@phosphor-icons/react';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api/corporate`;

const CorporateTracking = () => {
  const [activeTrips, setActiveTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveTrips();
    const interval = setInterval(fetchActiveTrips, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchActiveTrips = async () => {
    try {
      const response = await axios.get(`${API_BASE}/tracking/active`);
      setActiveTrips(response.data);
    } catch (error) {
      toast.error('Failed to load tracking data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    const classes = {
      CONFIRMED: 'bg-[#E6EFFF] text-[#0047FF]',
      IN_PROGRESS: 'bg-[#E0F7E9] text-[#00C853]'
    };
    return `px-3 py-1 text-xs font-semibold uppercase tracking-wider ${classes[status]}`;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#0047FF] border-t-transparent rounded-sm animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-[#525252]">Loading tracking data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="corporate-tracking-page">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Live Tracking</h1>
        <p className="text-xs text-[#525252] uppercase tracking-widest mt-2">
          {activeTrips.length} Active Trips
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {activeTrips.length === 0 ? (
          <div className="col-span-full bg-white border border-[#E5E5E5] p-12 text-center">
            <MapPin size={48} className="mx-auto mb-4 text-[#E5E5E5]" />
            <p className="text-sm text-[#525252]">No active trips at the moment</p>
          </div>
        ) : (
          activeTrips.map((trip, index) => {
            const { booking, vehicle, driver } = trip;
            return (
              <div
                key={booking.id}
                className="bg-white border-2 border-[#E5E5E5] p-6 hover:shadow-lg transition-all duration-150"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">{booking.passenger_name}</h3>
                    <span className={getStatusBadgeClass(booking.status)}>{booking.status}</span>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-[#E0F7E9] flex items-center justify-center">
                    <MapPin size={24} weight="bold" className="text-[#00C853]" />
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-1">Pickup</p>
                    <p className="text-sm">{booking.pickup_location}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-1">Dropoff</p>
                    <p className="text-sm">{booking.dropoff_location}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-1">Scheduled Time</p>
                    <p className="text-sm">{new Date(booking.pickup_time).toLocaleString()}</p>
                  </div>
                </div>

                {vehicle && (
                  <div className="pt-4 border-t border-[#E5E5E5] mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Truck size={20} weight="bold" className="text-[#0047FF]" />
                      <p className="text-sm font-semibold">{vehicle.registration}</p>
                    </div>
                    <p className="text-xs text-[#525252]">{vehicle.model}</p>
                  </div>
                )}

                {driver && (
                  <div className="pt-3 border-t border-[#E5E5E5]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{driver.name}</p>
                        <p className="text-xs text-[#525252]">Driver</p>
                      </div>
                      <a
                        href={`tel:${driver.phone}`}
                        className="flex items-center gap-1 px-3 py-2 bg-[#0047FF] text-white text-xs font-semibold hover:bg-[#003BCC] transition-colors"
                      >
                        <Phone size={16} weight="bold" />
                        Call
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CorporateTracking;