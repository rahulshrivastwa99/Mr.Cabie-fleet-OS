import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Truck, MapPin, Clock, Phone, User, LogOut, 
  CheckCircle, XCircle, Navigation, Calendar,
  ChevronRight, RefreshCw, AlertCircle
} from 'lucide-react';

const API_BASE = process.env.REACT_APP_BACKEND_URL + '/api';

const DriverDashboard = () => {
  const navigate = useNavigate();
  const [driver, setDriver] = useState(null);
  const [trips, setTrips] = useState([]);
  const [activeTrip, setActiveTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('driver_token');
    return { Authorization: `Bearer ${token}` };
  };

  const fetchData = useCallback(async () => {
    try {
      // Fetch driver profile
      const profileRes = await axios.get(`${API_BASE}/driver/auth/me`, {
        headers: getAuthHeaders()
      });
      setDriver(profileRes.data);

      // Fetch assigned trips
      const tripsRes = await axios.get(`${API_BASE}/driver/trips`, {
        headers: getAuthHeaders()
      });
      setTrips(tripsRes.data || []);

      // Check for active trip (STARTED status)
      const active = (tripsRes.data || []).find(t => t.status === 'STARTED');
      setActiveTrip(active || null);
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        handleLogout();
      } else {
        toast.error('Failed to load data');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('driver_token');
    if (!token) {
      navigate('/driver');
      return;
    }
    fetchData();
  }, [navigate, fetchData]);

  // Location tracking
  useEffect(() => {
    let watchId;
    
    const startLocationTracking = () => {
      if ('geolocation' in navigator) {
        watchId = navigator.geolocation.watchPosition(
          async (position) => {
            setLocationEnabled(true);
            const { latitude, longitude } = position.coords;
            
            // Send location to backend every update
            try {
              await axios.post(`${API_BASE}/driver/location`, {
                latitude,
                longitude
              }, { headers: getAuthHeaders() });
            } catch (err) {
              console.error('Failed to update location:', err);
            }
          },
          (error) => {
            console.error('Location error:', error);
            setLocationEnabled(false);
            if (error.code === 1) {
              toast.error('Please enable location access for tracking');
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 30000
          }
        );
      }
    };

    startLocationTracking();
    
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('driver_token');
    localStorage.removeItem('driver_info');
    navigate('/driver');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  const handleAcceptTrip = async (tripId) => {
    try {
      await axios.patch(`${API_BASE}/driver/trips/${tripId}/accept`, {}, {
        headers: getAuthHeaders()
      });
      toast.success('Trip accepted!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to accept trip');
    }
  };

  const handleRejectTrip = async (tripId) => {
    try {
      await axios.patch(`${API_BASE}/driver/trips/${tripId}/reject`, {}, {
        headers: getAuthHeaders()
      });
      toast.success('Trip rejected');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reject trip');
    }
  };

  const handleStartTrip = async (tripId) => {
    navigate(`/driver/trip/${tripId}/active`);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      'ASSIGNED': 'bg-blue-500',
      'ACCEPTED': 'bg-green-500',
      'STARTED': 'bg-orange-500',
      'COMPLETED': 'bg-gray-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <RefreshCw size={32} className="text-[#FF9800] animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]" data-testid="driver-dashboard">
      {/* Header */}
      <div className="bg-[#1A1A1A] px-4 py-4 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FF9800] rounded-full flex items-center justify-center">
              <User size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-white font-semibold">{driver?.name || 'Driver'}</h1>
              <p className="text-gray-400 text-xs flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${locationEnabled ? 'bg-green-500' : 'bg-red-500'}`}></span>
                {locationEnabled ? 'Location Active' : 'Location Off'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleRefresh}
              className="p-2 text-gray-400 hover:text-white"
              disabled={refreshing}
            >
              <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <button 
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-500"
              data-testid="driver-logout-btn"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Location Warning */}
      {!locationEnabled && (
        <div className="bg-red-500/20 border-b border-red-500/30 px-4 py-3 flex items-center gap-2">
          <AlertCircle size={18} className="text-red-400" />
          <p className="text-red-400 text-sm">Location tracking is required. Please enable GPS.</p>
        </div>
      )}

      {/* Active Trip Banner */}
      {activeTrip && (
        <div 
          className="bg-[#FF9800] px-4 py-4 cursor-pointer"
          onClick={() => navigate(`/driver/trip/${activeTrip.id}/active`)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Navigation size={20} className="text-white" />
              </div>
              <div>
                <p className="text-white font-semibold">Trip In Progress</p>
                <p className="text-white/80 text-sm">{activeTrip.pickup_location?.split(',')[0]}</p>
              </div>
            </div>
            <ChevronRight size={24} className="text-white" />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="p-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-[#1A1A1A] rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{trips.filter(t => t.status === 'ASSIGNED').length}</p>
            <p className="text-gray-400 text-xs mt-1">New</p>
          </div>
          <div className="bg-[#1A1A1A] rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-[#FF9800]">{trips.filter(t => ['ACCEPTED', 'STARTED'].includes(t.status)).length}</p>
            <p className="text-gray-400 text-xs mt-1">Active</p>
          </div>
          <div className="bg-[#1A1A1A] rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-green-500">{trips.filter(t => t.status === 'COMPLETED').length}</p>
            <p className="text-gray-400 text-xs mt-1">Done</p>
          </div>
        </div>

        {/* Trips List */}
        <h2 className="text-white font-semibold mb-3">Your Trips</h2>
        
        {trips.length === 0 ? (
          <div className="bg-[#1A1A1A] rounded-xl p-8 text-center">
            <Truck size={48} className="text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No trips assigned yet</p>
            <p className="text-gray-500 text-sm mt-1">Pull down to refresh</p>
          </div>
        ) : (
          <div className="space-y-3">
            {trips.map((trip) => (
              <div 
                key={trip.id} 
                className="bg-[#1A1A1A] rounded-xl overflow-hidden"
                data-testid={`trip-card-${trip.id}`}
              >
                {/* Trip Header */}
                <div className="px-4 py-3 flex items-center justify-between border-b border-[#333]">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs font-semibold text-white rounded ${getStatusColor(trip.status)}`}>
                      {trip.status}
                    </span>
                    <span className="text-gray-400 text-xs">
                      {trip.booking_type || 'LOCAL'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-400 text-xs">
                    <Calendar size={12} />
                    {formatDate(trip.pickup_time)}
                  </div>
                </div>

                {/* Trip Details */}
                <div className="px-4 py-3">
                  {/* Passenger */}
                  <div className="flex items-center gap-2 mb-3">
                    <User size={16} className="text-gray-400" />
                    <span className="text-white">{trip.passenger_name || 'Guest'}</span>
                    {trip.passenger_phone && (
                      <a 
                        href={`tel:${trip.passenger_phone}`}
                        className="ml-auto p-2 bg-[#333] rounded-full"
                      >
                        <Phone size={14} className="text-[#FF9800]" />
                      </a>
                    )}
                  </div>

                  {/* Locations */}
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500 mt-1"></div>
                      <div className="flex-1">
                        <p className="text-gray-400 text-xs">PICKUP</p>
                        <p className="text-white text-sm">{trip.pickup_location || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500 mt-1"></div>
                      <div className="flex-1">
                        <p className="text-gray-400 text-xs">DROP</p>
                        <p className="text-white text-sm">{trip.drop_location || '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {trip.status === 'ASSIGNED' && (
                  <div className="px-4 py-3 border-t border-[#333] flex gap-2">
                    <button
                      onClick={() => handleRejectTrip(trip.id)}
                      className="flex-1 py-3 bg-[#333] text-gray-400 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-[#444] transition-colors"
                    >
                      <XCircle size={18} />
                      Reject
                    </button>
                    <button
                      onClick={() => handleAcceptTrip(trip.id)}
                      className="flex-1 py-3 bg-green-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-green-700 transition-colors"
                      data-testid={`accept-trip-${trip.id}`}
                    >
                      <CheckCircle size={18} />
                      Accept
                    </button>
                  </div>
                )}

                {trip.status === 'ACCEPTED' && (
                  <div className="px-4 py-3 border-t border-[#333]">
                    <button
                      onClick={() => handleStartTrip(trip.id)}
                      className="w-full py-3 bg-[#FF9800] text-white rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-[#F57C00] transition-colors"
                      data-testid={`start-trip-${trip.id}`}
                    >
                      <Navigation size={18} />
                      Start Trip
                    </button>
                  </div>
                )}

                {trip.status === 'STARTED' && (
                  <div className="px-4 py-3 border-t border-[#333]">
                    <button
                      onClick={() => navigate(`/driver/trip/${trip.id}/active`)}
                      className="w-full py-3 bg-[#FF9800] text-white rounded-lg font-semibold flex items-center justify-center gap-2"
                    >
                      <Navigation size={18} />
                      Continue Trip
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverDashboard;
