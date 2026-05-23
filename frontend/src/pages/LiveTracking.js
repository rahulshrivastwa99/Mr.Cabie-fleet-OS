import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { MapPin, CaretDown, Phone, Navigation, User, Car } from '@phosphor-icons/react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

const LiveTracking = () => {
  const [driverLocations, setDriverLocations] = useState([]);
  const [duties, setDuties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 28.6139, lng: 77.2090 }); // Default: Delhi

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
      
      // Center map on first driver with location
      const firstWithLocation = locationsRes.data.find(d => d.location?.lat && d.location?.lng);
      if (firstWithLocation) {
        setMapCenter({
          lat: firstWithLocation.location.lat,
          lng: firstWithLocation.location.lng
        });
      }
    } catch (error) {
      toast.error('Failed to load tracking data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'AVAILABLE': 'bg-green-500',
      'ON_DUTY': 'bg-blue-500',
      'ON_LEAVE': 'bg-yellow-500',
      'INACTIVE': 'bg-gray-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  const getDriverDuty = (driverId) => {
    return duties.find(d => d.driver_id === driverId);
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const driversOnDuty = driverLocations.filter(d => d.status === 'ON_DUTY');
  const driversAvailable = driverLocations.filter(d => d.status === 'AVAILABLE');
  const driversWithLocation = driverLocations.filter(d => d.location?.lat && d.location?.lng);

  const hasValidApiKey = GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY !== 'YOUR_GOOGLE_MAPS_API_KEY';

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
        {/* Map Section */}
        <div className="lg:col-span-2 relative bg-[#F5F5F5]" style={{ minHeight: '500px' }}>
          {hasValidApiKey ? (
            <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
              <Map
                defaultCenter={mapCenter}
                defaultZoom={12}
                mapId="fleet-os-tracking-map"
                style={{ width: '100%', height: '100%' }}
                gestureHandling="greedy"
                disableDefaultUI={false}
              >
                {driversWithLocation.map((driver) => (
                  <AdvancedMarker
                    key={driver.id}
                    position={{ lat: driver.location.lat, lng: driver.location.lng }}
                    onClick={() => setSelectedDriver(driver)}
                  >
                    <div 
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg border-2 border-white ${
                        driver.status === 'ON_DUTY' ? 'bg-blue-500' : 
                        driver.status === 'AVAILABLE' ? 'bg-green-500' : 'bg-gray-500'
                      }`}
                      title={driver.name}
                    >
                      <Car size={20} weight="fill" />
                    </div>
                  </AdvancedMarker>
                ))}
              </Map>
            </APIProvider>
          ) : (
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
          )}

          {/* Selected Driver Info Popup */}
          {selectedDriver && (
            <div className="absolute top-4 left-4 bg-white border border-[#E5E5E5] p-4 shadow-lg max-w-xs z-10">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${getStatusColor(selectedDriver.status)}`}>
                    <User size={20} weight="fill" />
                  </div>
                  <div>
                    <p className="font-semibold">{selectedDriver.name}</p>
                    <p className="text-xs text-[#525252]">{selectedDriver.phone}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedDriver(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#525252]">Status:</span>
                  <span className={`px-2 py-0.5 text-xs font-semibold text-white rounded ${getStatusColor(selectedDriver.status)}`}>
                    {selectedDriver.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#525252]">Last Update:</span>
                  <span>{formatTimeAgo(selectedDriver.location?.updated_at)}</span>
                </div>
                {getDriverDuty(selectedDriver.id) && (
                  <div className="pt-2 border-t border-[#E5E5E5]">
                    <p className="text-xs font-semibold text-[#525252] mb-1">Current Trip:</p>
                    <p className="text-xs">{getDriverDuty(selectedDriver.id)?.pickup_location}</p>
                    <p className="text-xs">→ {getDriverDuty(selectedDriver.id)?.drop_location}</p>
                  </div>
                )}
              </div>
              <a 
                href={`tel:${selectedDriver.phone}`}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2 bg-green-500 text-white text-sm font-semibold hover:bg-green-600"
              >
                <Phone size={16} /> Call Driver
              </a>
            </div>
          )}
        </div>

        {/* Driver List Sidebar */}
        <div className="border-l border-[#E5E5E5] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[#E5E5E5] bg-white">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-[#525252]">
              Active Drivers ({driverLocations.length})
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-[#525252]">Loading...</div>
            ) : driverLocations.length === 0 ? (
              <div className="p-4 text-center text-[#525252]">No active drivers</div>
            ) : (
              <div className="divide-y divide-[#E5E5E5]">
                {driverLocations.map((driver) => {
                  const duty = getDriverDuty(driver.id);
                  return (
                    <div 
                      key={driver.id} 
                      className={`p-4 hover:bg-[#FAFAFA] cursor-pointer transition-colors ${
                        selectedDriver?.id === driver.id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => {
                        setSelectedDriver(driver);
                        if (driver.location?.lat && driver.location?.lng) {
                          setMapCenter({ lat: driver.location.lat, lng: driver.location.lng });
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 ${getStatusColor(driver.status)}`}>
                          <User size={20} weight="fill" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold truncate">{driver.name}</p>
                              <p className="text-xs text-[#525252]">{driver.phone}</p>
                            </div>
                            <span className={`px-2 py-0.5 text-xs font-semibold text-white rounded ${getStatusColor(driver.status)}`}>
                              {driver.status}
                            </span>
                          </div>
                          
                          {driver.location ? (
                            <div className="mt-2 text-xs text-[#525252]">
                              <div className="flex items-center gap-1">
                                <MapPin size={12} />
                                <span>{driver.location.lat?.toFixed(4)}, {driver.location.lng?.toFixed(4)}</span>
                              </div>
                              <p className="mt-1">Updated: {formatTimeAgo(driver.location.updated_at)}</p>
                            </div>
                          ) : (
                            <p className="mt-2 text-xs text-[#525252]">No GPS data</p>
                          )}
                          
                          {duty && (
                            <div className="mt-2 p-2 bg-blue-50 border border-blue-100 text-xs">
                              <p className="font-semibold text-blue-700">{duty.status}</p>
                              <p className="truncate">{duty.pickup_location} → {duty.drop_location}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveTracking;
