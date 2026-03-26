import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, ArrowRight } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DutyManagement = () => {
  const [duties, setDuties] = useState([]);
  const [clients, setClients] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedDuty, setSelectedDuty] = useState(null);
  const [formData, setFormData] = useState({
    client_id: '',
    pickup_location: '',
    dropoff_location: '',
    pickup_time: '',
    passenger_name: '',
    passenger_phone: '',
    notes: ''
  });
  const [assignData, setAssignData] = useState({
    vehicle_id: '',
    driver_id: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [dutiesRes, clientsRes, vehiclesRes, driversRes] = await Promise.all([
        axios.get(`${API_BASE}/duties`),
        axios.get(`${API_BASE}/clients`),
        axios.get(`${API_BASE}/vehicles`),
        axios.get(`${API_BASE}/drivers`)
      ]);
      setDuties(dutiesRes.data);
      setClients(clientsRes.data);
      setVehicles(vehiclesRes.data);
      setDrivers(driversRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDuty = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/duties`, {
        ...formData,
        pickup_time: new Date(formData.pickup_time).toISOString()
      });
      toast.success('Duty created successfully');
      setShowCreateModal(false);
      setFormData({
        client_id: '',
        pickup_location: '',
        dropoff_location: '',
        pickup_time: '',
        passenger_name: '',
        passenger_phone: '',
        notes: ''
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create duty');
    }
  };

  const handleAssignDuty = async (e) => {
    e.preventDefault();
    if (!selectedDuty) return;
    try {
      await axios.post(`${API_BASE}/duties/${selectedDuty.id}/assign`, assignData);
      toast.success('Duty assigned successfully');
      setShowAssignModal(false);
      setSelectedDuty(null);
      setAssignData({ vehicle_id: '', driver_id: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to assign duty');
    }
  };

  const handleStatusUpdate = async (dutyId, newStatus) => {
    try {
      await axios.patch(`${API_BASE}/duties/${dutyId}/status`, { status: newStatus });
      toast.success('Status updated successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const openAssignModal = (duty) => {
    setSelectedDuty(duty);
    setShowAssignModal(true);
  };

  const getStatusBadgeClass = (status) => {
    const classes = {
      CREATED: 'status-created',
      ASSIGNED: 'status-assigned',
      ACCEPTED: 'status-accepted',
      STARTED: 'status-started',
      COMPLETED: 'status-completed',
      BILLED: 'status-billed',
      CLOSED: 'status-created'
    };
    return `status-badge ${classes[status]}`;
  };

  const getNextStatus = (currentStatus) => {
    const statusFlow = {
      CREATED: null,
      ASSIGNED: 'ACCEPTED',
      ACCEPTED: 'STARTED',
      STARTED: 'COMPLETED',
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
          <p className="text-sm text-[#525252]">Loading duties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="duty-page">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" data-testid="duty-title">Duty Management</h1>
          <p className="text-xs text-[#525252] uppercase tracking-widest mt-2">Trip Lifecycle Management</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-[#0047FF] text-white px-6 py-3 font-semibold text-sm hover:bg-[#003BCC] transition-colors duration-150"
          data-testid="create-duty-button"
        >
          <Plus size={20} weight="bold" />
          Create Duty
        </button>
      </div>

      <div className="space-y-4">
        {duties.length === 0 ? (
          <div className="bg-white border border-[#E5E5E5] p-12 text-center">
            <p className="text-sm text-[#525252]">No duties found. Create your first duty.</p>
          </div>
        ) : (
          duties.map((duty) => {
            const client = clients.find(c => c.id === duty.client_id);
            const vehicle = vehicles.find(v => v.id === duty.vehicle_id);
            const driver = drivers.find(d => d.id === duty.driver_id);
            const nextStatus = getNextStatus(duty.status);

            return (
              <div key={duty.id} className="bg-white border border-[#E5E5E5] p-6 hover:border-[#525252] transition-colors duration-150">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{client?.company_name || 'Unknown Client'}</h3>
                      <span className={getStatusBadgeClass(duty.status)}>{duty.status}</span>
                    </div>
                    <p className="text-sm text-[#525252]">{duty.passenger_name} · {duty.passenger_phone}</p>
                  </div>
                  <p className="text-xs text-[#525252]">{new Date(duty.pickup_time).toLocaleString()}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-1">Pickup</p>
                    <p className="text-sm">{duty.pickup_location}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-1">Dropoff</p>
                    <p className="text-sm">{duty.dropoff_location}</p>
                  </div>
                </div>

                {(vehicle || driver) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pt-4 border-t border-[#E5E5E5]">
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
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-[#E5E5E5]">
                  {duty.status === 'CREATED' && (
                    <button
                      onClick={() => openAssignModal(duty)}
                      className="px-4 py-2 bg-[#0047FF] text-white text-sm font-semibold hover:bg-[#003BCC] transition-colors duration-150"
                      data-testid={`assign-duty-${duty.id}`}
                    >
                      Assign Vehicle & Driver
                    </button>
                  )}
                  {nextStatus && (
                    <button
                      onClick={() => handleStatusUpdate(duty.id, nextStatus)}
                      className="px-4 py-2 border border-[#E5E5E5] text-sm font-medium hover:bg-[#F5F5F5] transition-colors duration-150 flex items-center gap-2"
                      data-testid={`update-status-${duty.id}`}
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

      {/* Create Duty Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Create New Duty</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateDuty} className="space-y-4 mt-4">
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
                rows="3"
                data-testid="notes-input"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-[#E5E5E5] text-sm font-medium hover:bg-[#F5F5F5] transition-colors duration-150"
                data-testid="cancel-create-button"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-[#0047FF] text-white text-sm font-semibold hover:bg-[#003BCC] transition-colors duration-150"
                data-testid="save-duty-button"
              >
                Create Duty
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Duty Modal */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Assign Vehicle & Driver</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAssignDuty} className="space-y-4 mt-4">
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
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="flex-1 px-4 py-2 border border-[#E5E5E5] text-sm font-medium hover:bg-[#F5F5F5] transition-colors duration-150"
                data-testid="cancel-assign-button"
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
    </div>
  );
};

export default DutyManagement;