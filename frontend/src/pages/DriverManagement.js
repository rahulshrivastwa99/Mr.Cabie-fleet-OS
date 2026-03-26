import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, Pencil, UserCircle } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DriverManagement = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
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

  const getStatusBadgeClass = (status) => {
    const classes = {
      AVAILABLE: 'status-started',
      ON_DUTY: 'status-accepted',
      OFF_DUTY: 'status-created',
      INACTIVE: 'status-billed'
    };
    return `status-badge ${classes[status] || 'status-created'}`;
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

      <div className="bg-white border border-[#E5E5E5]">
        <table className="w-full">
          <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5]">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Name</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Email</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Phone</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">License</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Status</th>
            </tr>
          </thead>
          <tbody>
            {drivers.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-12">
                  <UserCircle size={48} className="mx-auto mb-4 text-[#E5E5E5]" />
                  <p className="text-sm text-[#525252]">No drivers found. Add your first driver.</p>
                </td>
              </tr>
            ) : (
              drivers.map((driver) => (
                <tr key={driver.id} className="border-b border-[#E5E5E5] hover:bg-[#FAFAFA] transition-colors duration-150">
                  <td className="px-6 py-4 text-sm font-semibold">{driver.name}</td>
                  <td className="px-6 py-4 text-sm">{driver.email}</td>
                  <td className="px-6 py-4 text-sm">{driver.phone}</td>
                  <td className="px-6 py-4 text-sm">{driver.license_number}</td>
                  <td className="px-6 py-4">
                    <span className={getStatusBadgeClass(driver.status)}>{driver.status}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
    </div>
  );
};

export default DriverManagement;