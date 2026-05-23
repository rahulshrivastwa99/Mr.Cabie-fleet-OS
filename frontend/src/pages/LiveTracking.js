import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { MapPin, Phone, User, Car, Circle } from '@phosphor-icons/react';
import { APIProvider, Map, Marker, InfoWindow } from '@vis.gl/react-google-maps';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

const LiveTracking = () => {
  const [driverLocations, setDriverLocations] = useState([]);
  const [duties, setDuties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 28.6139, lng: 77.2090 }); // Default: Delhi
  const [mapZoom, setMapZoom] = useState(11);

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
      
      // Transform backend data to match frontend expected format
      // Backend sends: driver_id, latitude, longitude
      // Frontend expects: id, lat, lng
      const transformedDrivers = locationsRes.data.map(driver => ({
        ...driver,
        id: driver.driver_id || driver.id,
        location: driver.location ? {
          lat: driver.location.latitude,
          lng: driver.location.longitude,
          updated_at: driver.location.updated_at,
          trip_id: driver.location.trip_id
        } : null
      }));
      
      setDriverLocations(transformedDrivers);
      const activeDuties = dutiesRes.data.filter(d => 
        ['ASSIGNED', 'ACCEPTED', 'STARTED'].includes(d.status)
      );
      setDuties(activeDuties);
      setLastUpdated(new Date());
      
      // Center map on first driver with location
      const driversWithLoc = transformedDrivers.filter(d => d.location?.lat && d.location?.lng);
      if (driversWithLoc.length > 0 && !selectedDriver) {
        // Calculate center of all drivers
        const avgLat = driversWithLoc.reduce((sum, d) => sum + d.location.lat, 0) / driversWithLoc.length;
        const avgLng = driversWithLoc.reduce((sum, d) => sum + d.location.lng, 0) / driversWithLoc.length;
        setMapCenter({ lat: avgLat, lng: avgLng });
      }
    } catch (error) {
      toast.error('Failed to load tracking data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'AVAILABLE': { bg: '#22C55E', text: 'Available' },
      'ON_DUTY': { bg: '#3B82F6', text: 'On Duty' },
      'ON_LEAVE': { bg: '#F59E0B', text: 'On Leave' },
      'INACTIVE': { bg: '#6B7280', text: 'Inactive' }
    };
    return colors[status] || { bg: '#6B7280', text: status };
  };

  const getDriverDuty = (driverId) => {
    return duties.find(d => d.driver_id === driverId);
  };

  const isDriverOnActiveTrip = (driverId) => {
    const duty = getDriverDuty(driverId);
    return duty && duty.status === 'STARTED';
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

  // Generate SVG icon data URI for markers
  const getMarkerIcon = (driver) => {
    const duty = getDriverDuty(driver.id);
    const isOnTrip = duty && duty.status === 'STARTED';
    const statusColor = getStatusColor(driver.status);
    const color = isOnTrip ? '#EF4444' : statusColor.bg;
    
    // SVG car marker icon
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="48" viewBox="0 0 40 48">
        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/>
          </filter>
        </defs>
        <g filter="url(#shadow)">
          <circle cx="20" cy="18" r="16" fill="${color}" stroke="white" stroke-width="3"/>
          <path d="M20 38 L12 24 L28 24 Z" fill="${color}"/>
          <g transform="translate(10, 8)">
            <path fill="white" d="M18 7H17V6C17 3.24 14.76 1 12 1S7 3.24 7 6V7H6C4.9 7 4 7.9 4 9V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V9C20 7.9 19.1 7 18 7ZM9 6C9 4.34 10.34 3 12 3S15 4.34 15 6V7H9V6Z" transform="scale(0.7) translate(2, 2)"/>
            <circle cx="10" cy="10" r="5" fill="white"/>
            <path fill="${color}" d="M7 8h6v4H7z"/>
            <circle cx="8" cy="14" r="2" fill="white"/>
            <circle cx="12" cy="14" r="2" fill="white"/>
          </g>
        </g>
      </svg>
    `;
    
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  };

  return (
    <div className="h-full flex flex-col" data-testid="tracking-page">
      <div className="p-6 border-b border-[#E5E5E5] bg-white">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Live Tracking</h1>
            <p className="text-xs text-[#525252] uppercase tracking-widest mt-2">
              Real-time Driver Monitoring • Last updated: {lastUpdated?.toLocaleTimeString() || '-'}
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <div className="px-4 py-2 bg-red-50 border border-red-200">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#525252]">On Trip</p>
              <p className="text-lg font-bold text-red-600">{duties.filter(d => d.status === 'STARTED').length}</p>
            </div>
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
        
        {/* Legend */}
        <div className="mt-4 flex items-center gap-6 text-xs">
          <span className="font-semibold text-[#525252]">LEGEND:</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500"></div>
            <span>On Active Trip (Pulsing)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-500"></div>
            <span>On Duty</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gray-500"></div>
            <span>Other</span>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4">
        {/* Map Section */}
        <div className="lg:col-span-3 relative bg-[#F5F5F5]" style={{ minHeight: '500px' }}>
          {hasValidApiKey ? (
            <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
              <Map
                center={mapCenter}
                zoom={mapZoom}
                onCenterChanged={(e) => setMapCenter(e.detail.center)}
                onZoomChanged={(e) => setMapZoom(e.detail.zoom)}
                style={{ width: '100%', height: '100%' }}
                gestureHandling="greedy"
                disableDefaultUI={false}
              >
                {driversWithLocation.map((driver) => (
                  <Marker
                    key={driver.id}
                    position={{ lat: driver.location.lat, lng: driver.location.lng }}
                    onClick={() => setSelectedDriver(driver)}
                    icon={{
                      url: getMarkerIcon(driver),
                      scaledSize: { width: 40, height: 48 },
                      anchor: { x: 20, y: 48 }
                    }}
                    title={driver.name}
                  />
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
              </div>
            </div>
          )}

          {/* Selected Driver Info Popup */}
          {selectedDriver && (
            <div className="absolute top-4 left-4 bg-white border border-[#E5E5E5] p-4 shadow-lg w-80 z-10">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white"
                    style={{ backgroundColor: getStatusColor(selectedDriver.status).bg }}
                  >
                    <User size={24} weight="fill" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{selectedDriver.name}</p>
                    <p className="text-sm text-[#525252]">{selectedDriver.phone}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedDriver(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-2 text-sm border-t border-[#E5E5E5] pt-3">
                <div className="flex justify-between">
                  <span className="text-[#525252]">Status:</span>
                  <span 
                    className="px-2 py-0.5 text-xs font-semibold text-white rounded"
                    style={{ backgroundColor: getStatusColor(selectedDriver.status).bg }}
                  >
                    {getStatusColor(selectedDriver.status).text}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#525252]">Vehicle:</span>
                  <span>{selectedDriver.vehicle_number || 'Not Assigned'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#525252]">GPS Updated:</span>
                  <span className="font-medium">{formatTimeAgo(selectedDriver.location?.updated_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#525252]">Coordinates:</span>
                  <span className="font-mono text-xs">
                    {selectedDriver.location?.lat?.toFixed(5)}, {selectedDriver.location?.lng?.toFixed(5)}
                  </span>
                </div>
              </div>
              
              {getDriverDuty(selectedDriver.id) && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200">
                  <p className="text-xs font-semibold text-blue-700 mb-2">
                    {getDriverDuty(selectedDriver.id)?.status === 'STARTED' ? '🚗 ON ACTIVE TRIP' : '📋 ASSIGNED TRIP'}
                  </p>
                  <div className="text-xs space-y-1">
                    <p><strong>Passenger:</strong> {getDriverDuty(selectedDriver.id)?.passenger_name || 'N/A'}</p>
                    <p className="flex items-start gap-1">
                      <span className="text-green-600 mt-0.5">●</span>
                      {getDriverDuty(selectedDriver.id)?.pickup_location}
                    </p>
                    <p className="flex items-start gap-1">
                      <span className="text-red-600 mt-0.5">●</span>
                      {getDriverDuty(selectedDriver.id)?.drop_location}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="mt-3 flex gap-2">
                <a 
                  href={`tel:${selectedDriver.phone}`}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-500 text-white text-sm font-semibold hover:bg-green-600 rounded"
                >
                  <Phone size={16} weight="fill" /> Call
                </a>
                {selectedDriver.location && (
                  <a 
                    href={`https://www.google.com/maps?q=${selectedDriver.location.lat},${selectedDriver.location.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 rounded"
                  >
                    <MapPin size={16} weight="fill" /> Open in Maps
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Driver List Sidebar */}
        <div className="border-l border-[#E5E5E5] overflow-hidden flex flex-col bg-white">
          <div className="p-4 border-b border-[#E5E5E5]">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-[#525252]">
              Drivers ({driverLocations.length})
            </h2>
            <p className="text-xs text-[#525252] mt-1">Click to locate on map</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-[#525252]">Loading...</div>
            ) : driverLocations.length === 0 ? (
              <div className="p-8 text-center text-[#525252]">
                <User size={48} className="mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No drivers found</p>
                <p className="text-xs mt-1">Add drivers to start tracking</p>
              </div>
            ) : (
              <div className="divide-y divide-[#E5E5E5]">
                {driverLocations.map((driver) => {
                  const duty = getDriverDuty(driver.id);
                  const isOnTrip = duty && duty.status === 'STARTED';
                  return (
                    <div 
                      key={driver.id} 
                      className={`p-3 hover:bg-[#FAFAFA] cursor-pointer transition-colors ${
                        selectedDriver?.id === driver.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      } ${isOnTrip ? 'bg-red-50' : ''}`}
                      onClick={() => {
                        setSelectedDriver(driver);
                        if (driver.location?.lat && driver.location?.lng) {
                          setMapCenter({ lat: driver.location.lat, lng: driver.location.lng });
                          setMapZoom(15);
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 relative"
                          style={{ backgroundColor: isOnTrip ? '#EF4444' : getStatusColor(driver.status).bg }}
                        >
                          <Car size={18} weight="fill" />
                          {isOnTrip && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse border-2 border-white"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center">
                            <p className="font-semibold truncate text-sm">{driver.name}</p>
                            {driver.location?.lat && driver.location?.lng ? (
                              <span className="text-xs text-green-600 font-medium">GPS ✓</span>
                            ) : (
                              <span className="text-xs text-gray-400">No GPS</span>
                            )}
                          </div>
                          <p className="text-xs text-[#525252]">{driver.vehicle_number || 'No vehicle'}</p>
                          {isOnTrip && (
                            <p className="text-xs text-red-600 font-medium mt-1">
                              🚗 Trip in progress
                            </p>
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
