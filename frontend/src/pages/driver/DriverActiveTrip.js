import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import {
  ArrowLeft, Navigation, Phone, MapPin, Clock,
  CheckCircle, AlertCircle, User, Gauge, PenTool, X
} from 'lucide-react';

const API_BASE = process.env.REACT_APP_BACKEND_URL + '/api';

const DriverActiveTrip = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tripPhase, setTripPhase] = useState('pickup'); // 'pickup', 'enroute', 'complete'
  
  // Trip metrics
  const [startKm, setStartKm] = useState('');
  const [endKm, setEndKm] = useState('');
  
  // Duty Slip / Signature state
  const [showDutySlip, setShowDutySlip] = useState(false);
  const [travellerName, setTravellerName] = useState('');
  const [signature, setSignature] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Canvas ref for signature
  const canvasRef = useRef(null);
  const [canvasContext, setCanvasContext] = useState(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('driver_token');
    return { Authorization: `Bearer ${token}` };
  };

  const fetchTrip = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/driver/trips/${tripId}`, {
        headers: getAuthHeaders()
      });
      setTrip(response.data);
      
      // Determine trip phase
      if (response.data.status === 'ACCEPTED') {
        setTripPhase('pickup');
      } else if (response.data.status === 'STARTED') {
        setTripPhase('enroute');
        // Set start KM from duty slip if available
        if (response.data.duty_slip?.opening_km) {
          setStartKm(response.data.duty_slip.opening_km.toString());
        }
      }
    } catch (error) {
      toast.error('Failed to load trip details');
      navigate('/driver/dashboard');
    } finally {
      setLoading(false);
    }
  }, [tripId, navigate]);

  useEffect(() => {
    fetchTrip();
  }, [fetchTrip]);

  // Initialize signature canvas
  useEffect(() => {
    if (showDutySlip && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Set canvas size for mobile
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      ctx.scale(2, 2);
      
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // White background
      ctx.fillStyle = '#FFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      setCanvasContext(ctx);
    }
  }, [showDutySlip]);

  const handleStartTrip = async () => {
    if (!startKm) {
      toast.error('Please enter start KM reading');
      return;
    }

    try {
      await axios.post(`${API_BASE}/driver/trips/${tripId}/start`, {
        opening_km: parseFloat(startKm)
      }, { headers: getAuthHeaders() });
      
      toast.success('Trip started!');
      setTripPhase('enroute');
      fetchTrip();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to start trip');
    }
  };

  const handleCompleteTrip = () => {
    if (!endKm) {
      toast.error('Please enter end KM reading');
      return;
    }
    
    if (parseFloat(endKm) < parseFloat(startKm || trip?.start_km || 0)) {
      toast.error('End KM cannot be less than Start KM');
      return;
    }
    
    setShowDutySlip(true);
  };

  // Signature drawing handlers
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    const { x, y } = getCanvasCoords(e);
    canvasContext.beginPath();
    canvasContext.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { x, y } = getCanvasCoords(e);
    canvasContext.lineTo(x, y);
    canvasContext.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
      setSignature(canvasRef.current.toDataURL('image/png'));
    }
  };

  const clearSignature = () => {
    if (canvasContext && canvasRef.current) {
      const canvas = canvasRef.current;
      canvasContext.fillStyle = '#FFF';
      canvasContext.fillRect(0, 0, canvas.width, canvas.height);
      setSignature(null);
    }
  };

  const handleSubmitDutySlip = async () => {
    if (!travellerName.trim()) {
      toast.error('Traveller name is required');
      return;
    }
    
    if (!signature) {
      toast.error('Signature is required');
      return;
    }

    try {
      // Complete trip with duty slip data
      await axios.post(`${API_BASE}/driver/trips/${tripId}/complete`, {
        closing_km: parseFloat(endKm),
        traveller_name: travellerName.trim(),
        passenger_signature: signature
      }, { headers: getAuthHeaders() });
      
      toast.success('Trip completed and duty slip signed!');
      navigate('/driver/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to complete trip');
    }
  };

  const openNavigation = (address) => {
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <p className="text-gray-400">Loading trip...</p>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <p className="text-gray-400">Trip not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]" data-testid="driver-active-trip">
      {/* Header */}
      <div className="bg-[#1A1A1A] px-4 py-4 flex items-center gap-3 sticky top-0 z-50">
        <button onClick={() => navigate('/driver/dashboard')} className="text-gray-400">
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1">
          <h1 className="text-white font-semibold">
            {tripPhase === 'pickup' ? 'Pickup Passenger' : 'Trip In Progress'}
          </h1>
          <p className="text-gray-400 text-xs">{trip.booking_type || 'LOCAL'} Trip</p>
        </div>
      </div>

      {/* Passenger Info */}
      <div className="bg-[#1A1A1A] mx-4 mt-4 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#333] rounded-full flex items-center justify-center">
              <User size={24} className="text-gray-400" />
            </div>
            <div>
              <p className="text-white font-semibold">{trip.passenger_name || 'Guest'}</p>
              <p className="text-gray-400 text-sm">{trip.passenger_phone || '-'}</p>
            </div>
          </div>
          {trip.passenger_phone && (
            <a
              href={`tel:${trip.passenger_phone}`}
              className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center"
            >
              <Phone size={20} className="text-white" />
            </a>
          )}
        </div>
      </div>

      {/* Locations */}
      <div className="mx-4 mt-4 space-y-3">
        {/* Pickup */}
        <div 
          className={`bg-[#1A1A1A] rounded-xl p-4 ${tripPhase === 'pickup' ? 'border-2 border-green-500' : ''}`}
          onClick={() => tripPhase === 'pickup' && openNavigation(trip.pickup_location)}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
              <MapPin size={20} className="text-green-500" />
            </div>
            <div className="flex-1">
              <p className="text-gray-400 text-xs mb-1">PICKUP LOCATION</p>
              <p className="text-white">{trip.pickup_location}</p>
              {tripPhase === 'pickup' && (
                <button className="mt-2 text-green-500 text-sm font-semibold flex items-center gap-1">
                  <Navigation size={14} /> Navigate
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Drop */}
        <div 
          className={`bg-[#1A1A1A] rounded-xl p-4 ${tripPhase === 'enroute' ? 'border-2 border-red-500' : ''}`}
          onClick={() => tripPhase === 'enroute' && openNavigation(trip.drop_location)}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
              <MapPin size={20} className="text-red-500" />
            </div>
            <div className="flex-1">
              <p className="text-gray-400 text-xs mb-1">DROP LOCATION</p>
              <p className="text-white">{trip.drop_location}</p>
              {tripPhase === 'enroute' && (
                <button className="mt-2 text-red-500 text-sm font-semibold flex items-center gap-1">
                  <Navigation size={14} /> Navigate
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KM Entry */}
      <div className="mx-4 mt-4 bg-[#1A1A1A] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Gauge size={20} className="text-[#FF9800]" />
          <p className="text-white font-semibold">Odometer Reading</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Start KM</label>
            <input
              type="number"
              value={startKm || trip?.start_km || ''}
              onChange={(e) => setStartKm(e.target.value)}
              placeholder="Enter KM"
              disabled={tripPhase !== 'pickup'}
              className="w-full bg-[#333] text-white px-4 py-3 rounded-lg disabled:opacity-50"
              data-testid="start-km-input"
            />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">End KM</label>
            <input
              type="number"
              value={endKm}
              onChange={(e) => setEndKm(e.target.value)}
              placeholder="Enter KM"
              disabled={tripPhase !== 'enroute'}
              className="w-full bg-[#333] text-white px-4 py-3 rounded-lg disabled:opacity-50"
              data-testid="end-km-input"
            />
          </div>
        </div>
        
        {tripPhase === 'enroute' && startKm && endKm && (
          <div className="mt-3 pt-3 border-t border-[#333] flex justify-between">
            <span className="text-gray-400">Total Distance</span>
            <span className="text-[#FF9800] font-bold">
              {Math.max(0, parseFloat(endKm) - parseFloat(startKm || trip?.start_km || 0)).toFixed(1)} km
            </span>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="mx-4 mt-6 mb-8">
        {tripPhase === 'pickup' && (
          <button
            onClick={handleStartTrip}
            className="w-full py-4 bg-green-600 text-white rounded-xl font-semibold text-lg flex items-center justify-center gap-2"
            data-testid="start-trip-btn"
          >
            <CheckCircle size={24} />
            Passenger Picked Up - Start Trip
          </button>
        )}
        
        {tripPhase === 'enroute' && (
          <button
            onClick={handleCompleteTrip}
            className="w-full py-4 bg-[#FF9800] text-white rounded-xl font-semibold text-lg flex items-center justify-center gap-2"
            data-testid="complete-trip-btn"
          >
            <PenTool size={24} />
            Complete Trip & Get Signature
          </button>
        )}
      </div>

      {/* Duty Slip Modal */}
      {showDutySlip && (
        <div className="fixed inset-0 bg-black/90 z-50 overflow-y-auto" data-testid="duty-slip-modal">
          <div className="min-h-screen p-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-xl font-bold">Duty Slip</h2>
              <button onClick={() => setShowDutySlip(false)} className="text-gray-400">
                <X size={24} />
              </button>
            </div>

            {/* Trip Summary */}
            <div className="bg-[#1A1A1A] rounded-xl p-4 mb-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Start KM</p>
                  <p className="text-white font-semibold">{startKm || trip?.start_km}</p>
                </div>
                <div>
                  <p className="text-gray-400">End KM</p>
                  <p className="text-white font-semibold">{endKm}</p>
                </div>
                <div>
                  <p className="text-gray-400">Total Distance</p>
                  <p className="text-[#FF9800] font-bold">
                    {Math.max(0, parseFloat(endKm) - parseFloat(startKm || trip?.start_km || 0)).toFixed(1)} km
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Date</p>
                  <p className="text-white font-semibold">{new Date().toLocaleDateString('en-IN')}</p>
                </div>
              </div>
            </div>

            {/* Traveller Name */}
            <div className="bg-[#1A1A1A] rounded-xl p-4 mb-4">
              <label className="text-gray-400 text-sm mb-2 block">
                Traveller's Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={travellerName}
                onChange={(e) => setTravellerName(e.target.value)}
                placeholder="Enter traveller's full name"
                className="w-full bg-[#333] text-white px-4 py-3 rounded-lg text-lg"
                data-testid="traveller-name-input"
              />
              <p className="text-gray-500 text-xs mt-2">
                To be filled by the traveller for legal record
              </p>
            </div>

            {/* Signature Pad */}
            <div className="bg-[#1A1A1A] rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-gray-400 text-sm">
                  Traveller's Signature <span className="text-red-500">*</span>
                </label>
                <button
                  onClick={clearSignature}
                  className="text-[#FF9800] text-sm font-semibold"
                >
                  Clear
                </button>
              </div>
              
              <div className="relative bg-white rounded-lg overflow-hidden" style={{ height: '200px' }}>
                <canvas
                  ref={canvasRef}
                  className="w-full h-full touch-none"
                  style={{ touchAction: 'none' }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  data-testid="signature-canvas"
                />
                {!signature && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-gray-400">Sign here</p>
                  </div>
                )}
              </div>
              <p className="text-gray-500 text-xs mt-2">
                Traveller must sign to confirm trip completion
              </p>
            </div>

            {/* Warning */}
            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-4 mb-6 flex gap-3">
              <AlertCircle size={20} className="text-yellow-500 flex-shrink-0 mt-0.5" />
              <p className="text-yellow-500 text-sm">
                This duty slip is a legal document. Ensure all details are accurate before submission.
              </p>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmitDutySlip}
              disabled={!travellerName.trim() || !signature}
              className="w-full py-4 bg-green-600 text-white rounded-xl font-semibold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="submit-duty-slip-btn"
            >
              <CheckCircle size={24} />
              Submit Duty Slip
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverActiveTrip;
