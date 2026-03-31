import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { MapPin, Truck, Phone, NavigationArrow, Clock } from '@phosphor-icons/react';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api/corporate`;

const CorporateTracking = () => {
  const [trackingData, setTrackingData] = useState({ active_trips: [] });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    fetchActiveTrips();
    const interval = setInterval(fetchActiveTrips, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchActiveTrips = async () => {
    try {
      const response = await axios.get(`${API_BASE}/tracking/active`);
      setTrackingData(response.data);
      setLastUpdated(new Date());
    } catch (error) {
      toast.error('Failed to load tracking data');
    } finally {
      setLoading(false);
    }
  };

  const formatLastSeen = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    return date.toLocaleTimeString();
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

  const activeTrips = trackingData.active_trips || [];

  return (
    <div className="p-6" data-testid="corporate-tracking-page">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Live Tracking</h1>
          <p className="text-xs text-[#525252] uppercase tracking-widest mt-2">
            {activeTrips.length} Active Trips • Auto-refreshes every 30s
          </p>
        </div>
        {lastUpdated && (
          <div className="text-xs text-[#525252] flex items-center gap-1">
            <Clock size={14} />
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </div>

      {activeTrips.length === 0 ? (
        <div className="bg-white border border-[#E5E5E5] p-12 text-center">
          <MapPin size={48} className="mx-auto mb-4 text-[#E5E5E5]" />
          <h3 className="text-lg font-semibold mb-2">No Active Trips</h3>
          <p className="text-sm text-[#525252]">
            {trackingData.message || 'You will see live tracking for trips once they are in progress'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {activeTrips.map((trip) => (
            <div
              key={trip.trip_id}
              className="bg-white border-2 border-green-200 p-6 hover:shadow-lg transition-all duration-150"
              data-testid={`tracking-card-${trip.trip_id}`}
            >
              {/* Status Banner */}
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#E5E5E5]">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs font-semibold uppercase tracking-wider text-green-700">
                  Trip In Progress
                </span>
              </div>

              {/* Passenger Info */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold">{trip.passenger_name}</h3>
              </div>

              {/* Route */}
              <div className="space-y-3 mb-4">
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full mt-1" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-1">Pickup</p>
                    <p className="text-sm">{trip.pickup_location}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full mt-1" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-1">Dropoff</p>
                    <p className="text-sm">{trip.dropoff_location}</p>
                  </div>
                </div>
              </div>

              {/* Vehicle Info */}
              {trip.vehicle && (
                <div className="pt-4 border-t border-[#E5E5E5] mb-3">
                  <div className="flex items-center gap-2">
                    <Truck size={18} weight="bold" className="text-[#0047FF]" />
                    <div>
                      <p className="text-sm font-semibold">{trip.vehicle.registration_number}</p>
                      <p className="text-xs text-[#525252]">{trip.vehicle.vehicle_type}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Driver Info with Location */}
              {trip.driver && (
                <div className="pt-3 border-t border-[#E5E5E5]">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold">{trip.driver.name}</p>
                      <p className="text-xs text-[#525252]">Driver</p>
                    </div>
                    <a
                      href={`tel:${trip.driver.phone}`}
                      className="flex items-center gap-1 px-3 py-2 bg-[#0047FF] text-white text-xs font-semibold hover:bg-[#003BCC] transition-colors"
                    >
                      <Phone size={16} weight="bold" />
                      Call
                    </a>
                  </div>

                  {/* Live Location */}
                  {trip.location && trip.location.latitude ? (
                    <div className="p-3 bg-green-50 border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <NavigationArrow size={16} className="text-green-600" />
                        <span className="text-xs font-semibold text-green-700">Live Location</span>
                      </div>
                      <p className="text-xs text-green-600 font-mono">
                        {trip.location.latitude.toFixed(6)}, {trip.location.longitude.toFixed(6)}
                      </p>
                      <p className="text-xs text-green-500 mt-1">
                        Updated: {formatLastSeen(trip.location.updated_at)}
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-yellow-50 border border-yellow-200">
                      <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-yellow-600" />
                        <span className="text-xs text-yellow-700">Location data unavailable</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Google Maps placeholder notice */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200">
        <p className="text-sm text-blue-700">
          <strong>Note:</strong> Live map view will be available once Google Maps API is configured. 
          Currently showing driver coordinates.
        </p>
      </div>
    </div>
  );
};

export default CorporateTracking;