import React, { useState, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import axios from 'axios';
import { toast } from 'sonner';
import { MapPin } from '@phosphor-icons/react';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY';

const LiveTracking = () => {
  const [duties, setDuties] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [center] = useState({ lat: 28.6139, lng: 77.2090 }); // Delhi default

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [dutiesRes, vehiclesRes] = await Promise.all([
        axios.get(`${API_BASE}/duties`),
        axios.get(`${API_BASE}/vehicles`)
      ]);
      const activeDuties = dutiesRes.data.filter(d => 
        ['ASSIGNED', 'ACCEPTED', 'STARTED'].includes(d.status)
      );
      setDuties(activeDuties);
      setVehicles(vehiclesRes.data);
    } catch (error) {
      toast.error('Failed to load tracking data');
    } finally {
      setLoading(false);
    }
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

  if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') {
    return (
      <div className="p-6" data-testid="tracking-page">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Live Tracking</h1>
          <p className="text-xs text-[#525252] uppercase tracking-widest mt-2">Real-time Vehicle Monitoring</p>
        </div>
        <div className="bg-white border border-[#E5E5E5] p-12 text-center">
          <MapPin size={48} className="mx-auto mb-4 text-[#E5E5E5]" />
          <p className="text-sm text-[#525252] mb-2">Google Maps API key not configured</p>
          <p className="text-xs text-[#525252]">Please add REACT_APP_GOOGLE_MAPS_API_KEY to your .env file</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" data-testid="tracking-page">
      <div className="p-6 border-b border-[#E5E5E5] bg-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Live Tracking</h1>
            <p className="text-xs text-[#525252] uppercase tracking-widest mt-2">
              {duties.length} Active Duties
            </p>
          </div>
          <div className="flex gap-3">
            <div className="px-4 py-2 bg-[#E6EFFF] border border-[#0047FF]">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#525252]">Assigned</p>
              <p className="text-lg font-bold text-[#0047FF]">
                {duties.filter(d => d.status === 'ASSIGNED').length}
              </p>
            </div>
            <div className="px-4 py-2 bg-[#FFF4E0] border border-[#FFB300]">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#525252]">Accepted</p>
              <p className="text-lg font-bold text-[#FFB300]">
                {duties.filter(d => d.status === 'ACCEPTED').length}
              </p>
            </div>
            <div className="px-4 py-2 bg-[#E0F7E9] border border-[#00C853]">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#525252]">Started</p>
              <p className="text-lg font-bold text-[#00C853]">
                {duties.filter(d => d.status === 'STARTED').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2 relative">
          <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
            <Map
              style={{ width: '100%', height: '100%' }}
              defaultCenter={center}
              defaultZoom={12}
              mapId="fleet-os-map"
              gestureHandling="greedy"
              disableDefaultUI={false}
              zoomControl={true}
            >
              {vehicles
                .filter(v => v.current_location)
                .map(vehicle => (
                  <AdvancedMarker
                    key={vehicle.id}
                    position={vehicle.current_location}
                  >
                    <div className="w-8 h-8 bg-[#0047FF] rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                      <span className="text-white text-xs font-bold">🚗</span>
                    </div>
                  </AdvancedMarker>
                ))}
            </Map>
          </APIProvider>
        </div>

        <div className="bg-white border-l border-[#E5E5E5] p-6 overflow-auto">
          <h2 className="text-xl font-semibold tracking-tight mb-4">Active Duties</h2>
          <div className="space-y-4">
            {duties.length === 0 ? (
              <p className="text-sm text-[#525252] text-center py-8">No active duties</p>
            ) : (
              duties.map(duty => {
                const vehicle = vehicles.find(v => v.id === duty.vehicle_id);
                return (
                  <div key={duty.id} className="border border-[#E5E5E5] p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-sm font-semibold">{duty.passenger_name}</p>
                        <p className="text-xs text-[#525252]">{duty.passenger_phone}</p>
                      </div>
                      <span className={`status-badge ${{
                        ASSIGNED: 'status-assigned',
                        ACCEPTED: 'status-accepted',
                        STARTED: 'status-started'
                      }[duty.status]}`}>
                        {duty.status}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-[#525252]">Pickup</p>
                        <p className="text-xs">{duty.pickup_location}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-[#525252]">Dropoff</p>
                        <p className="text-xs">{duty.dropoff_location}</p>
                      </div>
                      {vehicle && (
                        <div className="pt-2 border-t border-[#E5E5E5]">
                          <p className="text-xs font-semibold uppercase tracking-widest text-[#525252]">Vehicle</p>
                          <p className="text-xs">{vehicle.registration_number}</p>
                        </div>
                      )}
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