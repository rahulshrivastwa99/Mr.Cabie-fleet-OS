import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, ArrowRight, FileText } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TripManagement = () => {
  const [trips, setTrips] = useState([]);
  const [clients, setClients] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDutySlipModal, setShowDutySlipModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [formData, setFormData] = useState({
    client_id: '',
    contract_id: '',
    trip_type: 'ONE_WAY',
    pickup_location: '',
    dropoff_location: '',
    pickup_time: '',
    passenger_name: '',
    passenger_phone: '',
    notes: ''
  });
  const [assignData, setAssignData] = useState({
    vehicle_id: '',
    driver_id: '',
    contract_id: ''
  });
  const [dutySlipData, setDutySlipData] = useState({
    opening_km: '',
    driver_remarks: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [tripsRes, clientsRes, vehiclesRes, driversRes, contractsRes] = await Promise.all([
        axios.get(`${API_BASE}/duties`),
        axios.get(`${API_BASE}/clients`),
        axios.get(`${API_BASE}/vehicles`),
        axios.get(`${API_BASE}/drivers`),
        axios.get(`${API_BASE}/contracts`)
      ]);
      setTrips(tripsRes.data);
      setClients(clientsRes.data);
      setVehicles(vehiclesRes.data);
      setDrivers(driversRes.data);
      setContracts(contractsRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrip = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/duties`, {
        ...formData,
        pickup_time: new Date(formData.pickup_time).toISOString()
      });
      toast.success('Trip created successfully');
      setShowCreateModal(false);
      setFormData({
        client_id: '',
        contract_id: '',
        trip_type: 'ONE_WAY',
        pickup_location: '',
        dropoff_location: '',
        pickup_time: '',
        passenger_name: '',
        passenger_phone: '',
        notes: ''
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create trip');
    }
  };

  const handleAssignTrip = async (e) => {
    e.preventDefault();
    if (!selectedTrip) return;
    try {
      const payload = {
        vehicle_id: assignData.vehicle_id,
        driver_id: assignData.driver_id
      };
      if (assignData.contract_id) {
        payload.contract_id = assignData.contract_id;
      }
      await axios.post(`${API_BASE}/duties/${selectedTrip.id}/assign`, payload);
      toast.success('Trip assigned successfully');
      setShowAssignModal(false);
      setSelectedTrip(null);
      setAssignData({ vehicle_id: '', driver_id: '', contract_id: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to assign trip');
    }
  };

  const handleCreateDutySlip = async (e) => {
    e.preventDefault();
    if (!selectedTrip) return;
    try {
      await axios.post(`${API_BASE}/duty-slips`, {
        trip_id: selectedTrip.id,
        opening_km: parseFloat(dutySlipData.opening_km),
        driver_remarks: dutySlipData.driver_remarks || undefined
      });
      toast.success('Duty slip created - Trip started');
      setShowDutySlipModal(false);
      setSelectedTrip(null);
      setDutySlipData({ opening_km: '', driver_remarks: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create duty slip');
    }
  };

  const handleStatusUpdate = async (tripId, newStatus) => {
    try {
      await axios.patch(`${API_BASE}/duties/${tripId}/status`, { status: newStatus });
      toast.success('Status updated successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const openAssignModal = (trip) => {
    setSelectedTrip(trip);
    setShowAssignModal(true);
  };

  const openDutySlipModal = (trip) => {
    setSelectedTrip(trip);
    setShowDutySlipModal(true);
  };

  const getStatusBadgeClass = (status) => {
    const classes = {
      CREATED: 'bg-[#E5E5E5] text-[#525252]',
      ASSIGNED: 'bg-[#E6EFFF] text-[#0047FF]',
      ACCEPTED: 'bg-[#FFF3E0] text-[#FF9800]',
      STARTED: 'bg-[#E0F7E9] text-[#00C853]',
      COMPLETED: 'bg-[#F5F5F5] text-[#0A0A0A]',
      BILLED: 'bg-purple-100 text-purple-700',
      CLOSED: 'bg-gray-100 text-gray-700'
    };
    return `px-3 py-1 text-xs font-semibold uppercase tracking-wider ${classes[status] || classes.CREATED}`;
  };

  const getNextStatus = (currentStatus) => {
    const statusFlow = {
      CREATED: null,
      ASSIGNED: 'ACCEPTED',
      ACCEPTED: null, // Will start via duty slip
      STARTED: null, // Will complete via duty slip
      COMPLETED: null,
      BILLED: 'CLOSED',
      CLOSED: null
    };
    return statusFlow[currentStatus];
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#0047FF] border-t-transparent rounded-sm animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-[#525252]">Loading trips...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="trip-page">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" data-testid="trip-title">Trip Management</h1>
          <p className="text-xs text-[#525252] uppercase tracking-widest mt-2">Trip Lifecycle Management</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-[#0047FF] text-white px-6 py-3 font-semibold text-sm hover:bg-[#003BCC] transition-colors duration-150"
          data-testid="create-trip-button"
        >
          <Plus size={20} weight="bold" />
          Create Trip
        </button>
      </div>

      <div className="space-y-4">
        {trips.length === 0 ? (
          <div className="bg-white border border-[#E5E5E5] p-12 text-center">
            <p className="text-sm text-[#525252]">No trips found. Create your first trip.</p>
          </div>
        ) : (
          trips.map((trip) => {
            const client = clients.find(c => c.id === trip.client_id);
            const vehicle = vehicles.find(v => v.id === trip.vehicle_id);
            const driver = drivers.find(d => d.id === trip.driver_id);
            const contract = contracts.find(c => c.id === trip.contract_id);
            const nextStatus = getNextStatus(trip.status);

            return (
              <div key={trip.id} className="bg-white border border-[#E5E5E5] p-6 hover:border-[#525252] transition-colors duration-150">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{client?.company_name || 'Unknown Client'}</h3>
                      <span className={getStatusBadgeClass(trip.status)}>{trip.status}</span>
                      {trip.trip_type === 'ROUND_TRIP' && (
                        <span className="px-2 py-1 text-xs font-semibold bg-[#FFF3E0] text-[#FF9800]">ROUND TRIP</span>
                      )}
                      {trip.duty_slip_id && (
                        <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-700">DUTY SLIP</span>
                      )}
                    </div>
                    <p className="text-sm text-[#525252]">{trip.passenger_name} · {trip.passenger_phone}</p>
                  </div>
                  <p className="text-xs text-[#525252]">{new Date(trip.pickup_time).toLocaleString()}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-1">Pickup</p>
                    <p className="text-sm">{trip.pickup_location}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-1">Dropoff</p>
                    <p className="text-sm">{trip.dropoff_location}</p>
                  </div>
                </div>

                {(vehicle || driver || contract) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 pt-4 border-t border-[#E5E5E5]">
                    {vehicle && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-1">Vehicle</p>
                        <p className="text-sm font-semibold">{vehicle.registration_number}</p>
                        <p className="text-xs text-[#525252]">{vehicle.manufacturer} {vehicle.model}</p>
                      </div>
                    )}
                    {driver && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-1">Driver</p>
                        <p className="text-sm font-semibold">{driver.name}</p>
                        <p className="text-xs text-[#525252]">{driver.phone}</p>
                      </div>
                    )}
                    {contract && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-1">Contract</p>
                        <p className="text-sm font-semibold">{contract.name}</p>
                        <p className="text-xs text-[#525252]">{contract.contract_type}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-[#E5E5E5]">
                  {trip.status === 'CREATED' && (
                    <button
                      onClick={() => openAssignModal(trip)}
                      className="px-4 py-2 bg-[#0047FF] text-white text-sm font-semibold hover:bg-[#003BCC] transition-colors duration-150"
                      data-testid={`assign-trip-${trip.id}`}
                    >
                      Assign Vehicle & Driver
                    </button>
                  )}
                  {trip.status === 'ACCEPTED' && !trip.duty_slip_id && (
                    <button
                      onClick={() => openDutySlipModal(trip)}
                      className="px-4 py-2 bg-[#00C853] text-white text-sm font-semibold hover:bg-[#00A843] transition-colors duration-150 flex items-center gap-2"
                      data-testid={`start-trip-${trip.id}`}
                    >
                      <FileText size={16} weight="bold" />
                      Start Trip (Create Duty Slip)
                    </button>
                  )}
                  {nextStatus && (
                    <button
                      onClick={() => handleStatusUpdate(trip.id, nextStatus)}
                      className="px-4 py-2 border border-[#E5E5E5] text-sm font-medium hover:bg-[#F5F5F5] transition-colors duration-150 flex items-center gap-2"
                      data-testid={`update-status-${trip.id}`}
                    >
                      Move to {nextStatus}
                      <ArrowRight size={16} weight="bold" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Trip Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Create New Trip</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTrip} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                  Client
                </label>
                <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value })}>
                  <SelectTrigger data-testid="client-select">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>{client.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                  Trip Type
                </label>
                <Select value={formData.trip_type} onValueChange={(value) => setFormData({ ...formData, trip_type: value })}>
                  <SelectTrigger data-testid="trip-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ONE_WAY">One Way</SelectItem>
                    <SelectItem value="ROUND_TRIP">Round Trip</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                  Passenger Name
                </label>
                <input
                  type="text"
                  value={formData.passenger_name}
                  onChange={(e) => setFormData({ ...formData, passenger_name: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                  required
                  data-testid="passenger-name-input"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                  Passenger Phone
                </label>
                <input
                  type="tel"
                  value={formData.passenger_phone}
                  onChange={(e) => setFormData({ ...formData, passenger_phone: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                  required
                  data-testid="passenger-phone-input"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                Pickup Location
              </label>
              <input
                type="text"
                value={formData.pickup_location}
                onChange={(e) => setFormData({ ...formData, pickup_location: e.target.value })}
                className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                required
                data-testid="pickup-location-input"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                Dropoff Location
              </label>
              <input
                type="text"
                value={formData.dropoff_location}
                onChange={(e) => setFormData({ ...formData, dropoff_location: e.target.value })}
                className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                required
                data-testid="dropoff-location-input"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                Pickup Time
              </label>
              <input
                type="datetime-local"
                value={formData.pickup_time}
                onChange={(e) => setFormData({ ...formData, pickup_time: e.target.value })}
                className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                required
                data-testid="pickup-time-input"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                rows="2"
                data-testid="notes-input"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-[#E5E5E5] text-sm font-medium hover:bg-[#F5F5F5] transition-colors duration-150"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-[#0047FF] text-white text-sm font-semibold hover:bg-[#003BCC] transition-colors duration-150"
                data-testid="save-trip-button"
              >
                Create Trip
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Trip Modal */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Assign Vehicle, Driver & Contract</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAssignTrip} className="space-y-4 mt-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                Vehicle
              </label>
              <Select value={assignData.vehicle_id} onValueChange={(value) => setAssignData({ ...assignData, vehicle_id: value })}>
                <SelectTrigger data-testid="vehicle-select">
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.filter(v => v.status === 'AVAILABLE').map(vehicle => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.registration_number} - {vehicle.vehicle_type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                Driver
              </label>
              <Select value={assignData.driver_id} onValueChange={(value) => setAssignData({ ...assignData, driver_id: value })}>
                <SelectTrigger data-testid="driver-select">
                  <SelectValue placeholder="Select driver" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.filter(d => d.status === 'AVAILABLE').map(driver => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.name} - {driver.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                Contract (for Billing)
              </label>
              <Select value={assignData.contract_id || 'none'} onValueChange={(value) => setAssignData({ ...assignData, contract_id: value === 'none' ? '' : value })}>
                <SelectTrigger data-testid="contract-select">
                  <SelectValue placeholder="Select contract (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Contract (On-Call / Manual Rate)</SelectItem>
                  {contracts
                    .filter(c => c.client_id === selectedTrip?.client_id && c.is_active)
                    .map(contract => (
                      <SelectItem key={contract.id} value={contract.id}>
                        {contract.name} - {contract.contract_type.replace('_', ' ')}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-[#525252] mt-1">Select contract to apply pricing during invoicing</p>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="flex-1 px-4 py-2 border border-[#E5E5E5] text-sm font-medium hover:bg-[#F5F5F5] transition-colors duration-150"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-[#0047FF] text-white text-sm font-semibold hover:bg-[#003BCC] transition-colors duration-150"
                data-testid="save-assign-button"
              >
                Assign
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Duty Slip Modal */}
      <Dialog open={showDutySlipModal} onOpenChange={setShowDutySlipModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Start Trip - Create Duty Slip</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateDutySlip} className="space-y-4 mt-4">
            <div className="p-4 bg-[#FAFAFA] border border-[#E5E5E5]">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2">Trip Details</p>
              <p className="text-sm font-semibold">{selectedTrip?.passenger_name}</p>
              <p className="text-xs text-[#525252]">{selectedTrip?.pickup_location} → {selectedTrip?.dropoff_location}</p>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                Opening KM (Odometer Reading)
              </label>
              <input
                type="number"
                step="0.1"
                value={dutySlipData.opening_km}
                onChange={(e) => setDutySlipData({ ...dutySlipData, opening_km: e.target.value })}
                className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                required
                placeholder="e.g., 45230"
                data-testid="opening-km-input"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                Driver Remarks (Optional)
              </label>
              <textarea
                value={dutySlipData.driver_remarks}
                onChange={(e) => setDutySlipData({ ...dutySlipData, driver_remarks: e.target.value })}
                className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                rows="2"
                placeholder="Any initial remarks"
                data-testid="driver-remarks-input"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowDutySlipModal(false)}
                className="flex-1 px-4 py-2 border border-[#E5E5E5] text-sm font-medium hover:bg-[#F5F5F5] transition-colors duration-150"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-[#00C853] text-white text-sm font-semibold hover:bg-[#00A843] transition-colors duration-150"
                data-testid="start-trip-confirm-button"
              >
                Start Trip
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TripManagement;
