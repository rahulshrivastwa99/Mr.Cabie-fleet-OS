import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { MapPin, CaretDown, Phone, Navigation } from '@phosphor-icons/react';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

const LiveTracking = () => {
  const [driverLocations, setDriverLocations] = useState([]);
  const [duties, setDuties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [locationsRes, dutiesRes] = await Promise.all([
        axios.get(`${API_BASE}/admin/drivers/locations`),
        axios.get(`${API_BASE}/duties`)
      ]);
      setDriverLocations(locationsRes.data);
      const activeDuties = dutiesRes.data.filter(d => 
        ['ASSIGNED', 'ACCEPTED', 'STARTED'].includes(d.status)
      );
      setDuties(activeDuties);
      setLastUpdated(new Date());
    } catch (error) {
      toast.error('Failed to load tracking data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'ON_DUTY': return 'bg-blue-500';
      case 'AVAILABLE': return 'bg-green-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'ON_DUTY': return 'bg-blue-100 text-blue-700';
      case 'AVAILABLE': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatLastSeen = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return date.toLocaleDateString();
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

  const driversOnDuty = driverLocations.filter(d => d.status === 'ON_DUTY');
  const driversAvailable = driverLocations.filter(d => d.status === 'AVAILABLE');
  const driversWithLocation = driverLocations.filter(d => d.location);

  return (
    <div className="h-full flex flex-col" data-testid="tracking-page">
      <div className="p-6 border-b border-[#E5E5E5] bg-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Live Tracking</h1>
            <p className="text-xs text-[#525252] uppercase tracking-widest mt-2">
              Real-time Driver Monitoring • Last updated: {lastUpdated?.toLocaleTimeString()}
            </p>
          </div>
          <div className="flex gap-3">
            <div className="px-4 py-2 bg-blue-50 border border-blue-200">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#525252]">On Duty</p>
              <p className="text-lg font-bold text-blue-600">{driversOnDuty.length}</p>
            </div>
            <div className="px-4 py-2 bg-green-50 border border-green-200">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#525252]">Available</p>
              <p className="text-lg font-bold text-green-600">{driversAvailable.length}</p>
            </div>
            <div className="px-4 py-2 bg-purple-50 border border-purple-200">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#525252]">GPS Active</p>
              <p className="text-lg font-bold text-purple-600">{driversWithLocation.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3">
        {/* Map Placeholder */}
        <div className="lg:col-span-2 relative bg-[#F5F5F5]">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-8 bg-white border border-[#E5E5E5] max-w-md">
              <MapPin size={48} className="mx-auto mb-4 text-[#0047FF]" />
              <h3 className="text-lg font-semibold mb-2">Google Maps Integration</h3>
              <p className="text-sm text-[#525252] mb-4">
                Add your Google Maps API key to enable live map view with driver markers.
              </p>
              <div className="p-3 bg-[#FAFAFA] border border-[#E5E5E5] text-left">
                <p className="text-xs font-mono text-[#525252]">
                  REACT_APP_GOOGLE_MAPS_API_KEY=your_key_here
                </p>
              </div>
              <p className="text-xs text-[#525252] mt-4">
                Get your API key from <a href="https://console.cloud.google.com/google/maps-apis" target="_blank" rel="noreferrer" className="text-[#0047FF] hover:underline">Google Cloud Console</a>
              </p>
            </div>
          </div>

          {/* Driver Location List (visible when no map) */}
          <div className="absolute bottom-4 left-4 right-4 max-h-48 overflow-auto">
            <div className="bg-white border border-[#E5E5E5] p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-3">
                Driver Coordinates (Last Known)
              </p>
              <div className="space-y-2">
                {driversWithLocation.length === 0 ? (
                  <p className="text-sm text-[#525252]">No driver locations available</p>
                ) : (
                  driversWithLocation.map(driver => (
                    <div key={driver.driver_id} className="flex justify-between items-center text-xs">
                      <span className="font-medium">{driver.name}</span>
                      <span className="text-[#525252] font-mono">
                        {driver.location?.latitude?.toFixed(4)}, {driver.location?.longitude?.toFixed(4)}
                      </span>
                      <span className="text-[#525252]">{formatLastSeen(driver.location?.updated_at)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar - Driver List */}
        <div className="bg-white border-l border-[#E5E5E5] overflow-auto">
          <div className="p-4 border-b border-[#E5E5E5] sticky top-0 bg-white z-10">
            <h2 className="text-lg font-semibold tracking-tight">Active Drivers</h2>
            <p className="text-xs text-[#525252]">{driverLocations.length} total</p>
          </div>
          
          <div className="divide-y divide-[#E5E5E5]">
            {driverLocations.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-[#525252]">No drivers available</p>
              </div>
            ) : (
              driverLocations.map(driver => {
                const activeTrip = duties.find(d => d.driver_id === driver.driver_id && d.status === 'STARTED');
                return (
                  <div 
                    key={driver.driver_id} 
                    className={`p-4 cursor-pointer hover:bg-[#FAFAFA] transition-colors ${
                      selectedDriver?.driver_id === driver.driver_id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedDriver(driver)}
                    data-testid={`driver-location-${driver.driver_id}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Status Indicator */}
                      <div className={`w-3 h-3 rounded-full mt-1.5 ${getStatusColor(driver.status)}`} />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-semibold truncate">{driver.name}</p>
                            <p className="text-xs text-[#525252]">{driver.phone}</p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 font-medium ${getStatusBadgeClass(driver.status)}`}>
                            {driver.status}
                          </span>
                        </div>

                        {/* Location Info */}
                        <div className="mt-2 flex items-center gap-2 text-xs text-[#525252]">
                          {driver.location ? (
                            <>
                              <MapPin size={12} className="text-green-500" />
                              <span>GPS: {formatLastSeen(driver.location.updated_at)}</span>
                            </>
                          ) : (
                            <>
                              <MapPin size={12} className="text-gray-400" />
                              <span>No GPS data</span>
                            </>
                          )}
                        </div>

                        {/* Active Trip Info */}
                        {activeTrip && (
                          <div className="mt-2 p-2 bg-green-50 border border-green-200">
                            <p className="text-xs font-semibold text-green-700">Active Trip</p>
                            <p className="text-xs text-green-600 truncate">
                              {activeTrip.passenger_name} • {activeTrip.dropoff_location}
                            </p>
                          </div>
                        )}

                        {driver.location?.trip_id && !activeTrip && (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-200">
                            <p className="text-xs text-blue-700">On active trip</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveTracking;