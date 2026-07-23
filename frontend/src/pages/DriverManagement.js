import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, Pencil, UserCircle, MapPin, CaretDown } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DRIVER_STATUSES = [
  { value: 'AVAILABLE', label: 'Available', color: 'bg-green-100 text-green-700' },
  { value: 'ON_DUTY', label: 'On Duty', color: 'bg-blue-100 text-blue-700' },
  { value: 'OFF_DUTY', label: 'Off Duty', color: 'bg-gray-100 text-gray-700' },
  { value: 'ON_LEAVE', label: 'On Leave', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'INACTIVE', label: 'Inactive', color: 'bg-red-100 text-red-700' }
];

const DriverManagement = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [statusData, setStatusData] = useState({ status: '', reason: '' });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    license_number: ''
  });

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      const response = await axios.get(`${API_BASE}/drivers`);
      setDrivers(response.data);
    } catch (error) {
      toast.error('Failed to load drivers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/drivers`, formData);
      toast.success('Driver added successfully');
      setShowModal(false);
      setFormData({ name: '', email: '', phone: '', license_number: '' });
      fetchDrivers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const openStatusModal = (driver) => {
    setSelectedDriver(driver);
    setStatusData({ status: driver.status, reason: '' });
    setShowStatusModal(true);
  };

  const handleStatusUpdate = async () => {
    if (!selectedDriver) return;
    try {
      await axios.patch(`${API_BASE}/drivers/${selectedDriver.id}/status`, statusData);
      toast.success(`Driver status updated to ${statusData.status}`);
      setShowStatusModal(false);
      setSelectedDriver(null);
      fetchDrivers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update status');
    }
  };

  const getStatusBadgeClass = (status) => {
    const found = DRIVER_STATUSES.find(s => s.value === status);
    return found ? found.color : 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#0047FF] border-t-transparent rounded-sm animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-[#525252]">Loading drivers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="drivers-page">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" data-testid="drivers-title">Driver Management</h1>
          <p className="text-xs text-[#525252] uppercase tracking-widest mt-2">Driver Operations</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-[#0047FF] text-white px-6 py-3 font-semibold text-sm hover:bg-[#003BCC] transition-colors duration-150"
          data-testid="add-driver-button"
        >
          <Plus size={20} weight="bold" />
          Add Driver
        </button>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {DRIVER_STATUSES.map(status => {
          const count = drivers.filter(d => d.status === status.value).length;
          return (
            <div key={status.value} className="bg-white border border-[#E5E5E5] p-4">
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs text-[#525252] uppercase tracking-wider">{status.label}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white border border-[#E5E5E5]">
        <table className="w-full">
          <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5]">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Name</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Phone</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">License</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Status</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Location</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {drivers.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-12">
                  <UserCircle size={48} className="mx-auto mb-4 text-[#E5E5E5]" />
                  <p className="text-sm text-[#525252]">No drivers found. Add your first driver.</p>
                </td>
              </tr>
            ) : (
              drivers.map((driver) => (
                <tr key={driver.id} className="border-b border-[#E5E5E5] hover:bg-[#FAFAFA] transition-colors duration-150" data-testid={`driver-row-${driver.id}`}>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-semibold">{driver.name}</p>
                      <p className="text-xs text-[#525252]">{driver.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">{driver.phone}</td>
                  <td className="px-6 py-4 text-sm">{driver.license_number}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(driver.status)}`}>
                      {driver.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {driver.current_location ? (
                      <div className="flex items-center gap-1 text-xs text-green-600">
                        <MapPin size={14} />
                        <span>Online</span>
                      </div>
                    ) : (
                      <span className="text-xs text-[#525252]">No data</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => openStatusModal(driver)}
                      className="text-xs text-[#0047FF] font-semibold hover:underline flex items-center gap-1"
                      data-testid={`change-status-${driver.id}`}
                    >
                      Change Status
                      <CaretDown size={12} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Driver Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Add New Driver</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                Full Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                required
                data-testid="driver-name-input"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                required
                data-testid="driver-email-input"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                required
                data-testid="driver-phone-input"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                License Number
              </label>
              <input
                type="text"
                value={formData.license_number}
                onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                required
                data-testid="driver-license-input"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-[#E5E5E5] text-sm font-medium hover:bg-[#F5F5F5] transition-colors duration-150"
                data-testid="cancel-button"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-[#0047FF] text-white text-sm font-semibold hover:bg-[#003BCC] transition-colors duration-150"
                data-testid="save-driver-button"
              >
                Add Driver
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Status Modal */}
      <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Change Driver Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {selectedDriver && (
              <div className="p-3 bg-[#FAFAFA] border border-[#E5E5E5]">
                <p className="text-sm font-semibold">{selectedDriver.name}</p>
                <p className="text-xs text-[#525252]">{selectedDriver.phone}</p>
              </div>
            )}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                New Status
              </label>
              <Select value={statusData.status} onValueChange={(value) => setStatusData({ ...statusData, status: value })}>
                <SelectTrigger data-testid="status-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DRIVER_STATUSES.map(status => (
                    <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                Reason (Optional)
              </label>
              <textarea
                value={statusData.reason}
                onChange={(e) => setStatusData({ ...statusData, reason: e.target.value })}
                className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                rows="2"
                placeholder="e.g., On leave until Dec 15"
                data-testid="status-reason-input"
              />
            </div>
            {(statusData.status === 'ON_LEAVE' || statusData.status === 'INACTIVE') && (
              <div className="p-3 bg-yellow-50 border border-yellow-200">
                <p className="text-xs text-yellow-700">
                  <strong>Note:</strong> Driver cannot be set to this status if they have active trips.
                </p>
              </div>
            )}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="flex-1 px-4 py-2 border border-[#E5E5E5] text-sm font-medium hover:bg-[#F5F5F5] transition-colors duration-150"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusUpdate}
                className="flex-1 px-4 py-2 bg-[#0047FF] text-white text-sm font-semibold hover:bg-[#003BCC] transition-colors duration-150"
                data-testid="save-status-button"
              >
                Update Status
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DriverManagement;