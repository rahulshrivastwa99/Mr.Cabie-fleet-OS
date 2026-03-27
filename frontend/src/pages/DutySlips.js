import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { FileText, Check, Download, PencilSimple, X } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SignaturePad = ({ onSave, onCancel }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#0A0A0A';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
  }, []);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const saveSignature = () => {
    if (!hasSignature) {
      toast.error('Please provide a signature');
      return;
    }
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-[#E5E5E5] p-2 bg-white">
        <canvas
          ref={canvasRef}
          width={400}
          height={150}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="cursor-crosshair w-full"
          data-testid="signature-canvas"
        />
      </div>
      <p className="text-xs text-[#525252] text-center">Draw your signature above</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={clearSignature}
          className="flex-1 px-4 py-2 border border-[#E5E5E5] text-sm font-medium hover:bg-[#F5F5F5] transition-colors duration-150"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-[#E5E5E5] text-sm font-medium hover:bg-[#F5F5F5] transition-colors duration-150"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={saveSignature}
          className="flex-1 px-4 py-2 bg-[#0047FF] text-white text-sm font-semibold hover:bg-[#003BCC] transition-colors duration-150"
          data-testid="confirm-signature-button"
        >
          Confirm Signature
        </button>
      </div>
    </div>
  );
};

const DutySlips = () => {
  const [dutySlips, setDutySlips] = useState([]);
  const [clients, setClients] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [filters, setFilters] = useState({
    client_id: '',
    driver_id: '',
    date_from: '',
    date_to: ''
  });
  const [completeData, setCompleteData] = useState({
    closing_km: '',
    driver_remarks: ''
  });
  const [signedBy, setSignedBy] = useState('');

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.client_id) params.append('client_id', filters.client_id);
      if (filters.driver_id) params.append('driver_id', filters.driver_id);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);

      const [slipsRes, clientsRes, driversRes] = await Promise.all([
        axios.get(`${API_BASE}/duty-slips?${params.toString()}`),
        axios.get(`${API_BASE}/clients`),
        axios.get(`${API_BASE}/drivers`)
      ]);
      setDutySlips(slipsRes.data);
      setClients(clientsRes.data);
      setDrivers(driversRes.data);
    } catch (error) {
      toast.error('Failed to load duty slips');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (e) => {
    e.preventDefault();
    if (!selectedSlip) return;
    try {
      await axios.patch(`${API_BASE}/duty-slips/${selectedSlip.id}/complete`, {
        closing_km: parseFloat(completeData.closing_km),
        driver_remarks: completeData.driver_remarks || undefined
      });
      toast.success('Duty slip completed');
      setShowCompleteModal(false);
      setSelectedSlip(null);
      setCompleteData({ closing_km: '', driver_remarks: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to complete duty slip');
    }
  };

  const handleSign = async (signatureDataUrl) => {
    if (!selectedSlip || !signedBy) {
      toast.error('Please enter passenger name');
      return;
    }
    try {
      await axios.patch(`${API_BASE}/duty-slips/${selectedSlip.id}/sign`, {
        passenger_signature: signatureDataUrl,
        signed_by: signedBy
      });
      toast.success('Duty slip signed and locked');
      setShowSignModal(false);
      setSelectedSlip(null);
      setSignedBy('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to sign duty slip');
    }
  };

  const getStatusBadge = (status) => {
    const classes = {
      DRAFT: 'bg-[#FFF3E0] text-[#FF9800]',
      SIGNED: 'bg-[#E0F7E9] text-[#00C853]',
      DISPUTED: 'bg-red-100 text-red-700'
    };
    return `px-3 py-1 text-xs font-semibold uppercase tracking-wider ${classes[status] || classes.DRAFT}`;
  };

  const openCompleteModal = (slip) => {
    setSelectedSlip(slip);
    setShowCompleteModal(true);
  };

  const openSignModal = (slip) => {
    setSelectedSlip(slip);
    setSignedBy(slip.passenger_name || '');
    setShowSignModal(true);
  };

  const openViewModal = (slip) => {
    setSelectedSlip(slip);
    setShowViewModal(true);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#0047FF] border-t-transparent rounded-sm animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-[#525252]">Loading duty slips...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="duty-slips-page">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" data-testid="duty-slips-title">Duty Slips</h1>
          <p className="text-xs text-[#525252] uppercase tracking-widest mt-2">Execution Proof & Trip Records</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#E5E5E5] p-4 mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-3">Filters</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select value={filters.client_id} onValueChange={(value) => setFilters({ ...filters, client_id: value === 'all' ? '' : value })}>
            <SelectTrigger data-testid="filter-client">
              <SelectValue placeholder="All Clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map(client => (
                <SelectItem key={client.id} value={client.id}>{client.company_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.driver_id} onValueChange={(value) => setFilters({ ...filters, driver_id: value === 'all' ? '' : value })}>
            <SelectTrigger data-testid="filter-driver">
              <SelectValue placeholder="All Drivers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Drivers</SelectItem>
              {drivers.map(driver => (
                <SelectItem key={driver.id} value={driver.id}>{driver.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            type="date"
            value={filters.date_from}
            onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
            className="px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] text-sm"
            placeholder="From Date"
            data-testid="filter-date-from"
          />
          <input
            type="date"
            value={filters.date_to}
            onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
            className="px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] text-sm"
            placeholder="To Date"
            data-testid="filter-date-to"
          />
        </div>
      </div>

      {/* Duty Slips List */}
      <div className="space-y-4">
        {dutySlips.length === 0 ? (
          <div className="bg-white border border-[#E5E5E5] p-12 text-center">
            <FileText size={48} className="mx-auto mb-4 text-[#525252]" />
            <p className="text-sm text-[#525252]">No duty slips found. Start a trip to create a duty slip.</p>
          </div>
        ) : (
          dutySlips.map((slip) => (
            <div key={slip.id} className="bg-white border border-[#E5E5E5] p-6 hover:border-[#525252] transition-colors duration-150">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{slip.corporate_name}</h3>
                    <span className={getStatusBadge(slip.status)}>{slip.status}</span>
                    {slip.status === 'SIGNED' && (
                      <span className="text-xs text-[#525252]">Locked</span>
                    )}
                  </div>
                  <p className="text-sm text-[#525252]">Duty Slip ID: {slip.id.slice(0, 8).toUpperCase()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{new Date(slip.date).toLocaleDateString()}</p>
                  {slip.start_time && (
                    <p className="text-xs text-[#525252]">{new Date(slip.start_time).toLocaleTimeString()}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-1">Driver</p>
                  <p className="text-sm font-semibold">{slip.driver_name}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-1">Vehicle</p>
                  <p className="text-sm font-semibold">{slip.vehicle_number}</p>
                  <p className="text-xs text-[#525252]">{slip.vehicle_type}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-1">Passenger</p>
                  <p className="text-sm font-semibold">{slip.passenger_name}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pt-4 border-t border-[#E5E5E5]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-1">Route</p>
                  <p className="text-sm">{slip.pickup_location} → {slip.dropoff_location}</p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-1">Opening KM</p>
                    <p className="text-sm font-semibold">{slip.opening_km}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-1">Closing KM</p>
                    <p className="text-sm font-semibold">{slip.closing_km || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-1">Total KM</p>
                    <p className="text-sm font-bold text-[#0047FF]">{slip.total_km || '-'}</p>
                  </div>
                </div>
              </div>

              {slip.driver_remarks && (
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-1">Driver Remarks</p>
                  <p className="text-sm text-[#525252]">{slip.driver_remarks}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-[#E5E5E5]">
                <button
                  onClick={() => openViewModal(slip)}
                  className="px-4 py-2 border border-[#E5E5E5] text-sm font-medium hover:bg-[#F5F5F5] transition-colors duration-150 flex items-center gap-2"
                  data-testid={`view-slip-${slip.id}`}
                >
                  <FileText size={16} />
                  View Details
                </button>
                {slip.status === 'DRAFT' && !slip.closing_km && (
                  <button
                    onClick={() => openCompleteModal(slip)}
                    className="px-4 py-2 bg-[#FF9800] text-white text-sm font-semibold hover:bg-[#F57C00] transition-colors duration-150 flex items-center gap-2"
                    data-testid={`complete-slip-${slip.id}`}
                  >
                    <PencilSimple size={16} weight="bold" />
                    Complete Trip
                  </button>
                )}
                {slip.status === 'DRAFT' && slip.closing_km && (
                  <button
                    onClick={() => openSignModal(slip)}
                    className="px-4 py-2 bg-[#00C853] text-white text-sm font-semibold hover:bg-[#00A843] transition-colors duration-150 flex items-center gap-2"
                    data-testid={`sign-slip-${slip.id}`}
                  >
                    <Check size={16} weight="bold" />
                    Get Passenger Signature
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Complete Modal */}
      <Dialog open={showCompleteModal} onOpenChange={setShowCompleteModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Complete Trip</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleComplete} className="space-y-4 mt-4">
            <div className="p-4 bg-[#FAFAFA] border border-[#E5E5E5]">
              <p className="text-sm font-semibold">{selectedSlip?.passenger_name}</p>
              <p className="text-xs text-[#525252]">{selectedSlip?.pickup_location} → {selectedSlip?.dropoff_location}</p>
              <p className="text-xs text-[#525252] mt-2">Opening KM: {selectedSlip?.opening_km}</p>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                Closing KM (Odometer Reading)
              </label>
              <input
                type="number"
                step="0.1"
                value={completeData.closing_km}
                onChange={(e) => setCompleteData({ ...completeData, closing_km: e.target.value })}
                className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                required
                placeholder="e.g., 45280"
                data-testid="closing-km-input"
              />
              {completeData.closing_km && selectedSlip?.opening_km && (
                <p className="text-sm text-[#0047FF] mt-2 font-semibold">
                  Total KM: {(parseFloat(completeData.closing_km) - selectedSlip.opening_km).toFixed(1)} km
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                Driver Remarks (Optional)
              </label>
              <textarea
                value={completeData.driver_remarks}
                onChange={(e) => setCompleteData({ ...completeData, driver_remarks: e.target.value })}
                className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                rows="2"
                placeholder="Any remarks about the trip"
                data-testid="complete-remarks-input"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowCompleteModal(false)}
                className="flex-1 px-4 py-2 border border-[#E5E5E5] text-sm font-medium hover:bg-[#F5F5F5] transition-colors duration-150"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-[#FF9800] text-white text-sm font-semibold hover:bg-[#F57C00] transition-colors duration-150"
                data-testid="complete-trip-confirm-button"
              >
                Complete Trip
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sign Modal */}
      <Dialog open={showSignModal} onOpenChange={setShowSignModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Passenger Signature</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="p-4 bg-[#FAFAFA] border border-[#E5E5E5]">
              <p className="text-sm font-semibold">{selectedSlip?.passenger_name}</p>
              <p className="text-xs text-[#525252]">{selectedSlip?.pickup_location} → {selectedSlip?.dropoff_location}</p>
              <p className="text-xs text-[#0047FF] mt-2 font-semibold">Total KM: {selectedSlip?.total_km} km</p>
            </div>
            <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs">
              <p className="font-semibold mb-1">Important Note:</p>
              <p>{selectedSlip?.note}</p>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                Passenger Name (Signing)
              </label>
              <input
                type="text"
                value={signedBy}
                onChange={(e) => setSignedBy(e.target.value)}
                className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                required
                placeholder="Enter passenger name"
                data-testid="signed-by-input"
              />
            </div>
            <SignaturePad 
              onSave={handleSign}
              onCancel={() => setShowSignModal(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Duty Slip Details</DialogTitle>
          </DialogHeader>
          {selectedSlip && (
            <div className="space-y-4 mt-4">
              <div className="text-center pb-4 border-b border-[#E5E5E5]">
                <h2 className="text-2xl font-bold">DUTY SLIP</h2>
                <p className="text-sm text-[#525252]">ID: {selectedSlip.id.slice(0, 8).toUpperCase()}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#525252]">Date</p>
                  <p className="text-sm font-semibold">{new Date(selectedSlip.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#525252]">Trip Type</p>
                  <p className="text-sm font-semibold">{selectedSlip.trip_type?.replace('_', ' ')}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#E5E5E5]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#525252]">Driver</p>
                  <p className="text-sm font-semibold">{selectedSlip.driver_name}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#525252]">Vehicle</p>
                  <p className="text-sm font-semibold">{selectedSlip.vehicle_number}</p>
                  <p className="text-xs text-[#525252]">{selectedSlip.vehicle_type}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E5E5E5]">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#525252]">Corporate</p>
                <p className="text-sm font-semibold">{selectedSlip.corporate_name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#E5E5E5]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#525252]">Pickup</p>
                  <p className="text-sm">{selectedSlip.pickup_location}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#525252]">Dropoff</p>
                  <p className="text-sm">{selectedSlip.dropoff_location}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[#E5E5E5] bg-[#FAFAFA] p-4">
                <div className="text-center">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#525252]">Opening KM</p>
                  <p className="text-xl font-bold">{selectedSlip.opening_km}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#525252]">Closing KM</p>
                  <p className="text-xl font-bold">{selectedSlip.closing_km || '-'}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#525252]">Total KM</p>
                  <p className="text-xl font-bold text-[#0047FF]">{selectedSlip.total_km || '-'}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E5E5E5]">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#525252]">Passengers</p>
                <div className="mt-2 space-y-1">
                  {selectedSlip.passengers?.map((p, idx) => (
                    <p key={idx} className="text-sm">{p.name} - {p.phone}</p>
                  ))}
                </div>
              </div>

              {selectedSlip.driver_remarks && (
                <div className="pt-4 border-t border-[#E5E5E5]">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#525252]">Driver Remarks</p>
                  <p className="text-sm text-[#525252]">{selectedSlip.driver_remarks}</p>
                </div>
              )}

              {selectedSlip.passenger_signature && (
                <div className="pt-4 border-t border-[#E5E5E5]">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-2">Passenger Signature</p>
                  <div className="border border-[#E5E5E5] p-2 bg-white inline-block">
                    <img src={selectedSlip.passenger_signature} alt="Signature" className="max-h-20" />
                  </div>
                  <p className="text-xs text-[#525252] mt-1">Signed by: {selectedSlip.signed_by}</p>
                  <p className="text-xs text-[#525252]">Signed at: {new Date(selectedSlip.signed_at).toLocaleString()}</p>
                </div>
              )}

              <div className="pt-4 border-t border-[#E5E5E5]">
                <p className="text-xs text-[#525252] italic">{selectedSlip.note}</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="flex-1 px-4 py-2 border border-[#E5E5E5] text-sm font-medium hover:bg-[#F5F5F5] transition-colors duration-150"
                >
                  Close
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex-1 px-4 py-2 bg-[#0047FF] text-white text-sm font-semibold hover:bg-[#003BCC] transition-colors duration-150 flex items-center justify-center gap-2"
                  data-testid="download-pdf-button"
                >
                  <Download size={16} weight="bold" />
                  Print / PDF
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DutySlips;
