import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, Calendar, Upload } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCorporateAuth } from '../../context/CorporateAuthContext';
import CSVUploader from '../../components/CSVUploader';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api/corporate`;

const CorporateBookings = () => {
  const { user } = useCorporateAuth();
  const [bookings, setBookings] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    pickup_location: '',
    dropoff_location: '',
    pickup_time: '',
    cost_center: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [bookingsRes, employeesRes] = await Promise.all([
        axios.get(`${API_BASE}/bookings`),
        user.role !== 'FINANCE' ? axios.get(`${API_BASE}/employees`) : Promise.resolve({ data: [] })
      ]);
      setBookings(bookingsRes.data);
      setEmployees(employeesRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/bookings`, {
        ...formData,
        pickup_time: new Date(formData.pickup_time).toISOString()
      });
      toast.success('Booking created successfully');
      setShowModal(false);
      setFormData({
        employee_id: '',
        pickup_location: '',
        dropoff_location: '',
        pickup_time: '',
        cost_center: '',
        notes: ''
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create booking');
    }
  };

  const handleBulkUpload = async (csvData) => {
    try {
      const bookingsData = csvData.map(row => {
        // Find employee by employee_id from CSV
        const employee = employees.find(e => e.employee_id === row.employee_id);
        if (!employee) {
          throw new Error(`Employee ${row.employee_id} not found`);
        }

        return {
          employee_id: employee.id,
          pickup_location: row.pickup_location,
          dropoff_location: row.dropoff_location,
          pickup_time: new Date(row.pickup_datetime).toISOString(),
          cost_center: row.cost_center || undefined,
          notes: row.notes || undefined
        };
      });

      const response = await axios.post(`${API_BASE}/bookings/bulk-create`, bookingsData);
      
      if (response.data.created > 0) {
        toast.success(`${response.data.created} bookings created successfully`);
      }
      
      if (response.data.failed > 0) {
        toast.warning(`${response.data.failed} bookings failed`);
      }
      
      setShowBulkUpload(false);
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Bulk upload failed');
    }
  };

  const getStatusBadgeClass = (status) => {
    const classes = {
      PENDING: 'bg-[#E5E5E5] text-[#525252]',
      CONFIRMED: 'bg-[#E6EFFF] text-[#0047FF]',
      IN_PROGRESS: 'bg-[#E0F7E9] text-[#00C853]',
      COMPLETED: 'bg-[#F5F5F5] text-[#0A0A0A]',
      CANCELLED: 'bg-[#FFE5E5] text-[#E00000]'
    };
    return `px-3 py-1 text-xs font-semibold uppercase tracking-wider ${classes[status] || classes.PENDING}`;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#0047FF] border-t-transparent rounded-sm animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-[#525252]">Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="corporate-bookings-page">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Bookings</h1>
          <p className="text-xs text-[#525252] uppercase tracking-widest mt-2">Manage Transportation</p>
        </div>
        {user.role !== 'VIEWER' && (
          <div className="flex gap-3">
            <button
              onClick={() => setShowBulkUpload(true)}
              className="flex items-center gap-2 border-2 border-[#0047FF] text-[#0047FF] px-6 py-3 font-semibold text-sm hover:bg-[#E6EFFF] transition-colors duration-150"
              data-testid="bulk-upload-bookings-button"
            >
              <Upload size={20} weight="bold" />
              Bulk Upload
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-[#0047FF] text-white px-6 py-3 font-semibold text-sm hover:bg-[#003BCC] transition-colors duration-150"
              data-testid="create-booking-button"
            >
              <Plus size={20} weight="bold" />
              Create Booking
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {bookings.length === 0 ? (
          <div className="bg-white border border-[#E5E5E5] p-12 text-center">
            <Calendar size={48} className="mx-auto mb-4 text-[#E5E5E5]" />
            <p className="text-sm text-[#525252]">No bookings found. Create your first booking.</p>
          </div>
        ) : (
          bookings.map((booking) => {
            const employee = employees.find(e => e.id === booking.employee_id);
            return (
              <div key={booking.id} className="bg-white border border-[#E5E5E5] p-6 hover:shadow-sm transition-all duration-150">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{booking.passenger_name}</h3>
                      <span className={getStatusBadgeClass(booking.status)}>{booking.status}</span>
                    </div>
                    <p className="text-sm text-[#525252]">{booking.passenger_phone}</p>
                  </div>
                  <p className="text-xs text-[#525252]">{new Date(booking.pickup_time).toLocaleString()}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-1">Pickup</p>
                    <p className="text-sm">{booking.pickup_location}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-1">Dropoff</p>
                    <p className="text-sm">{booking.dropoff_location}</p>
                  </div>
                </div>

                {booking.cost_center && (
                  <div className="pt-4 border-t border-[#E5E5E5]">
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-1">Cost Center</p>
                    <p className="text-sm">{booking.cost_center}</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Create New Booking</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                Employee
              </label>
              <Select value={formData.employee_id} onValueChange={(value) => setFormData({ ...formData, employee_id: value })}>
                <SelectTrigger data-testid="employee-select">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name} - {emp.employee_id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                data-testid="pickup-input"
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
                data-testid="dropoff-input"
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
                Cost Center (Optional)
              </label>
              <input
                type="text"
                value={formData.cost_center}
                onChange={(e) => setFormData({ ...formData, cost_center: e.target.value })}
                className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                data-testid="cost-center-input"
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
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-[#E5E5E5] text-sm font-medium hover:bg-[#F5F5F5] transition-colors duration-150"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-[#0047FF] text-white text-sm font-semibold hover:bg-[#003BCC] transition-colors duration-150"
                data-testid="save-booking-button"
              >
                Create Booking
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Modal */}
      <Dialog open={showBulkUpload} onOpenChange={setShowBulkUpload}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Bulk Upload Bookings</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <CSVUploader
              onUpload={handleBulkUpload}
              templateHeaders={['employee_id', 'pickup_location', 'dropoff_location', 'pickup_datetime', 'cost_center', 'notes']}
              sampleData={['EMP001', 'Sector 62 Noida', 'Connaught Place Delhi', '2026-03-27T09:00:00', 'ENG-001', 'Client meeting']}
              title="Upload Bookings CSV"
            />
            <div className="mt-4 bg-yellow-50 border border-[#FFB300] p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2">Important Notes</p>
              <ul className="text-xs text-[#525252] space-y-1">
                <li>• employee_id should match existing employee IDs in the system</li>
                <li>• pickup_datetime format: YYYY-MM-DDTHH:MM:SS (e.g., 2026-03-27T09:00:00)</li>
                <li>• Bookings will automatically create duties in the admin panel</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CorporateBookings;
