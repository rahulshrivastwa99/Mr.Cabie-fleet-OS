import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, Calendar, Upload, ArrowsLeftRight, CaretDown, Users } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useCorporateAuth } from '../../context/CorporateAuthContext';
import CSVUploader from '../../components/CSVUploader';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api/corporate`;
const ADMIN_API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

const VEHICLE_TYPES = [
  { value: 'SEDAN', label: 'Sedan' },
  { value: 'SUV', label: 'SUV' },
  { value: 'HATCHBACK', label: 'Hatchback' },
  { value: 'EV', label: 'Electric Vehicle' },
  { value: 'LUXURY', label: 'Luxury' }
];

const SERVICE_TYPES = [
  { value: 'AIRPORT_TRANSFER', label: 'Airport Transfer' },
  { value: 'LOCAL_DUTY', label: 'Local Duty' },
  { value: 'OUTSTATION', label: 'Outstation' },
  { value: 'EMPLOYEE_TRANSPORT', label: 'Employee Transport' },
  { value: 'CUSTOM', label: 'Custom' }
];

const RECURRING_TYPES = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' }
];

const WEEKDAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' }
];

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
    notes: '',
    // New fields
    trip_type: 'ONE_WAY',
    return_time: '',
    booking_type: 'ONE_TIME',
    recurring_type: '',
    recurring_days: [],
    recurring_end_date: '',
    vehicle_type_requested: '',
    service_type: '',
    passengers: [] // Additional employees for multi-employee booking
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

  const resetForm = () => {
    setFormData({
      employee_id: '',
      pickup_location: '',
      dropoff_location: '',
      pickup_time: '',
      cost_center: '',
      notes: '',
      trip_type: 'ONE_WAY',
      return_time: '',
      booking_type: 'ONE_TIME',
      recurring_type: '',
      recurring_days: [],
      recurring_end_date: '',
      vehicle_type_requested: '',
      service_type: '',
      passengers: []
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        employee_id: formData.employee_id,
        pickup_location: formData.pickup_location,
        dropoff_location: formData.dropoff_location,
        pickup_time: new Date(formData.pickup_time).toISOString(),
        trip_type: formData.trip_type,
        booking_type: formData.booking_type,
        cost_center: formData.cost_center || undefined,
        notes: formData.notes || undefined,
        passengers: formData.passengers.length > 0 ? formData.passengers : undefined
      };

      // Add return time for round trips
      if (formData.trip_type === 'ROUND_TRIP' && formData.return_time) {
        payload.return_time = new Date(formData.return_time).toISOString();
      }

      // Add recurring options
      if (formData.booking_type === 'RECURRING') {
        payload.recurring_type = formData.recurring_type || undefined;
        payload.recurring_days = formData.recurring_days.length > 0 ? formData.recurring_days : undefined;
        if (formData.recurring_end_date) {
          payload.recurring_end_date = new Date(formData.recurring_end_date).toISOString();
        }
      }

      // Add vehicle and service preferences
      if (formData.vehicle_type_requested) {
        payload.vehicle_type_requested = formData.vehicle_type_requested;
      }
      if (formData.service_type) {
        payload.service_type = formData.service_type;
      }

      await axios.post(`${API_BASE}/bookings`, payload);
      toast.success('Booking created successfully');
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create booking');
    }
  };

  const togglePassenger = (empId) => {
    setFormData(prev => ({
      ...prev,
      passengers: prev.passengers.includes(empId)
        ? prev.passengers.filter(id => id !== empId)
        : [...prev.passengers, empId]
    }));
  };

  const toggleRecurringDay = (day) => {
    setFormData(prev => ({
      ...prev,
      recurring_days: prev.recurring_days.includes(day)
        ? prev.recurring_days.filter(d => d !== day)
        : [...prev.recurring_days, day]
    }));
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
                      {booking.trip_type && (
                        <span className="px-2 py-1 text-xs font-semibold bg-[#F5F5F5] text-[#525252]">
                          {booking.trip_type === 'ROUND_TRIP' ? 'Round Trip' : 'One Way'}
                        </span>
                      )}
                      {booking.booking_type === 'RECURRING' && (
                        <span className="px-2 py-1 text-xs font-semibold bg-[#FFF3E0] text-[#FF9800]">
                          RECURRING
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#525252]">{booking.passenger_phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#525252]">{new Date(booking.pickup_time).toLocaleString()}</p>
                    {booking.return_time && (
                      <p className="text-xs text-[#0047FF] mt-1">
                        Return: {new Date(booking.return_time).toLocaleString()}
                      </p>
                    )}
                  </div>
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

                <div className="flex flex-wrap gap-4 pt-4 border-t border-[#E5E5E5]">
                  {booking.vehicle_type_requested && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-1">Vehicle</p>
                      <p className="text-sm">{booking.vehicle_type_requested}</p>
                    </div>
                  )}
                  {booking.service_type && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-1">Service</p>
                      <p className="text-sm">{booking.service_type.replace('_', ' ')}</p>
                    </div>
                  )}
                  {booking.cost_center && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-1">Cost Center</p>
                      <p className="text-sm">{booking.cost_center}</p>
                    </div>
                  )}
                  {booking.passengers && booking.passengers.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-1">Passengers</p>
                      <p className="text-sm">{booking.passengers.length + 1} people</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Create New Booking</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {/* Primary Employee Selection */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                Primary Employee
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

            {/* Trip Type & Service Type Row */}
            <div className="grid grid-cols-2 gap-4">
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
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                  Service Type
                </label>
                <Select value={formData.service_type} onValueChange={(value) => setFormData({ ...formData, service_type: value })}>
                  <SelectTrigger data-testid="service-type-select">
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Vehicle Type Preference */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                Vehicle Preference
              </label>
              <Select value={formData.vehicle_type_requested} onValueChange={(value) => setFormData({ ...formData, vehicle_type_requested: value })}>
                <SelectTrigger data-testid="vehicle-type-select">
                  <SelectValue placeholder="Any vehicle (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLE_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location Fields */}
            <div className="grid grid-cols-2 gap-4">
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
                  placeholder="e.g., Sector 62 Noida"
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
                  placeholder="e.g., IGI Airport T3"
                  data-testid="dropoff-input"
                />
              </div>
            </div>

            {/* Time Fields */}
            <div className="grid grid-cols-2 gap-4">
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
              {formData.trip_type === 'ROUND_TRIP' && (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                    Return Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.return_time}
                    onChange={(e) => setFormData({ ...formData, return_time: e.target.value })}
                    className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                    data-testid="return-time-input"
                  />
                </div>
              )}
            </div>

            {/* Booking Type (One-time / Recurring) */}
            <div className="p-4 bg-[#FAFAFA] border border-[#E5E5E5]">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-3 block">
                Booking Schedule
              </label>
              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="booking_type"
                    value="ONE_TIME"
                    checked={formData.booking_type === 'ONE_TIME'}
                    onChange={(e) => setFormData({ ...formData, booking_type: e.target.value })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">One-Time Booking</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="booking_type"
                    value="RECURRING"
                    checked={formData.booking_type === 'RECURRING'}
                    onChange={(e) => setFormData({ ...formData, booking_type: e.target.value })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Recurring Booking</span>
                </label>
              </div>

              {formData.booking_type === 'RECURRING' && (
                <div className="space-y-4 pt-4 border-t border-[#E5E5E5]">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                        Recurrence Pattern
                      </label>
                      <Select value={formData.recurring_type} onValueChange={(value) => setFormData({ ...formData, recurring_type: value })}>
                        <SelectTrigger data-testid="recurring-type-select">
                          <SelectValue placeholder="Select pattern" />
                        </SelectTrigger>
                        <SelectContent>
                          {RECURRING_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={formData.recurring_end_date}
                        onChange={(e) => setFormData({ ...formData, recurring_end_date: e.target.value })}
                        className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] text-sm"
                        data-testid="recurring-end-date-input"
                      />
                    </div>
                  </div>

                  {formData.recurring_type === 'WEEKLY' && (
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                        Repeat on Days
                      </label>
                      <div className="flex gap-2 flex-wrap">
                        {WEEKDAYS.map(day => (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => toggleRecurringDay(day.value)}
                            className={`px-3 py-1.5 text-xs font-semibold border transition-colors ${
                              formData.recurring_days.includes(day.value)
                                ? 'bg-[#0047FF] text-white border-[#0047FF]'
                                : 'bg-white text-[#525252] border-[#E5E5E5] hover:bg-[#F5F5F5]'
                            }`}
                            data-testid={`day-${day.label.toLowerCase()}`}
                          >
                            {day.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Multi-Employee Booking */}
            <div className="p-4 bg-[#FAFAFA] border border-[#E5E5E5]">
              <div className="flex items-center gap-2 mb-3">
                <Users size={18} className="text-[#525252]" />
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
                  Additional Passengers (Optional)
                </label>
              </div>
              <p className="text-xs text-[#525252] mb-3">Select other employees traveling together</p>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {employees
                  .filter(emp => emp.id !== formData.employee_id)
                  .map(emp => (
                    <label
                      key={emp.id}
                      className="flex items-center gap-2 p-2 border border-[#E5E5E5] bg-white hover:bg-[#FAFAFA] cursor-pointer text-sm"
                    >
                      <Checkbox
                        checked={formData.passengers.includes(emp.id)}
                        onCheckedChange={() => togglePassenger(emp.id)}
                        data-testid={`passenger-${emp.employee_id}`}
                      />
                      <span className="truncate">{emp.name}</span>
                    </label>
                  ))}
              </div>
              {formData.passengers.length > 0 && (
                <p className="text-xs text-[#0047FF] mt-2 font-medium">
                  {formData.passengers.length + 1} passengers selected
                </p>
              )}
            </div>

            {/* Cost Center & Notes */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                  Cost Center (Optional)
                </label>
                <input
                  type="text"
                  value={formData.cost_center}
                  onChange={(e) => setFormData({ ...formData, cost_center: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                  placeholder="e.g., ENG-001"
                  data-testid="cost-center-input"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                  placeholder="Special instructions"
                  data-testid="notes-input"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => { setShowModal(false); resetForm(); }}
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
