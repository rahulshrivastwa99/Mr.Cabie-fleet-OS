import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, ArrowRight, FileText, X, FunnelSimple, SortAscending, CalendarBlank, MagnifyingGlass } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LocationAutocomplete from '../components/LocationAutocomplete';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TRIP_STATUSES = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'CREATED', label: 'Created (Unassigned)' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'STARTED', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'BILLED', label: 'Billed' },
  { value: 'CANCELLED', label: 'Cancelled' }
];

const QUICK_FILTERS = [
  { value: 'all', label: 'All Trips' },
  { value: 'today', label: "Today's Trips" },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'unassigned', label: 'Unassigned' },
  { value: 'completed_today', label: 'Completed Today' },
  { value: 'upcoming', label: 'Upcoming (Next 7 Days)' }
];

const SORT_OPTIONS = [
  { value: 'pickup_time_desc', label: 'Pickup Time (Latest First)' },
  { value: 'pickup_time_asc', label: 'Pickup Time (Earliest First)' },
  { value: 'company_asc', label: 'Company (A-Z)' },
  { value: 'company_desc', label: 'Company (Z-A)' },
  { value: 'status', label: 'Status' },
  { value: 'created_desc', label: 'Recently Created' }
];

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
  
  // Filter & Sort State
  const [showFilters, setShowFilters] = useState(false);
  const [quickFilter, setQuickFilter] = useState('all');
  const [filters, setFilters] = useState({
    status: 'ALL',
    client_id: '',
    driver_id: '',
    date_from: '',
    date_to: '',
    search: ''
  });
  const [sortBy, setSortBy] = useState('pickup_time_desc');
  
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

  // Filtering and Sorting Logic
  const filteredAndSortedTrips = useMemo(() => {
    let result = [...trips];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Apply Quick Filter
    if (quickFilter !== 'all') {
      switch (quickFilter) {
        case 'today':
          result = result.filter(t => {
            const pickupDate = new Date(t.pickup_time);
            return pickupDate >= today && pickupDate <= todayEnd;
          });
          break;
        case 'ongoing':
          result = result.filter(t => ['STARTED'].includes(t.status));
          break;
        case 'unassigned':
          result = result.filter(t => t.status === 'CREATED' && !t.driver_id);
          break;
        case 'completed_today':
          result = result.filter(t => {
            if (t.status !== 'COMPLETED') return false;
            const endTime = t.end_time ? new Date(t.end_time) : null;
            return endTime && endTime >= today && endTime <= todayEnd;
          });
          break;
        case 'upcoming':
          result = result.filter(t => {
            const pickupDate = new Date(t.pickup_time);
            return pickupDate > today && pickupDate <= nextWeek && !['COMPLETED', 'CANCELLED', 'BILLED'].includes(t.status);
          });
          break;
      }
    }

    // Apply Status Filter
    if (filters.status && filters.status !== 'ALL') {
      result = result.filter(t => t.status === filters.status);
    }

    // Apply Client Filter
    if (filters.client_id) {
      result = result.filter(t => t.client_id === filters.client_id);
    }

    // Apply Driver Filter
    if (filters.driver_id) {
      result = result.filter(t => t.driver_id === filters.driver_id);
    }

    // Apply Date Range Filter
    if (filters.date_from) {
      const fromDate = new Date(filters.date_from);
      fromDate.setHours(0, 0, 0, 0);
      result = result.filter(t => new Date(t.pickup_time) >= fromDate);
    }
    if (filters.date_to) {
      const toDate = new Date(filters.date_to);
      toDate.setHours(23, 59, 59, 999);
      result = result.filter(t => new Date(t.pickup_time) <= toDate);
    }

    // Apply Search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(t => 
        t.passenger_name?.toLowerCase().includes(searchLower) ||
        t.passenger_phone?.includes(searchLower) ||
        t.pickup_location?.toLowerCase().includes(searchLower) ||
        t.dropoff_location?.toLowerCase().includes(searchLower) ||
        clients.find(c => c.id === t.client_id)?.company_name?.toLowerCase().includes(searchLower)
      );
    }

    // Apply Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'pickup_time_asc':
          return new Date(a.pickup_time) - new Date(b.pickup_time);
        case 'pickup_time_desc':
          return new Date(b.pickup_time) - new Date(a.pickup_time);
        case 'company_asc':
          const clientA = clients.find(c => c.id === a.client_id)?.company_name || '';
          const clientB = clients.find(c => c.id === b.client_id)?.company_name || '';
          return clientA.localeCompare(clientB);
        case 'company_desc':
          const clientA2 = clients.find(c => c.id === a.client_id)?.company_name || '';
          const clientB2 = clients.find(c => c.id === b.client_id)?.company_name || '';
          return clientB2.localeCompare(clientA2);
        case 'status':
          const statusOrder = ['CREATED', 'ASSIGNED', 'ACCEPTED', 'STARTED', 'COMPLETED', 'BILLED', 'CANCELLED'];
          return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
        case 'created_desc':
          return new Date(b.created_at || b.pickup_time) - new Date(a.created_at || a.pickup_time);
        default:
          return 0;
      }
    });

    return result;
  }, [trips, clients, quickFilter, filters, sortBy]);

  const resetFilters = () => {
    setQuickFilter('all');
    setFilters({
      status: 'ALL',
      client_id: '',
      driver_id: '',
      date_from: '',
      date_to: '',
      search: ''
    });
    setSortBy('pickup_time_desc');
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (quickFilter !== 'all') count++;
    if (filters.status !== 'ALL') count++;
    if (filters.client_id) count++;
    if (filters.driver_id) count++;
    if (filters.date_from) count++;
    if (filters.date_to) count++;
    if (filters.search) count++;
    return count;
  }, [quickFilter, filters]);

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

  const handleCancelTrip = async (tripId) => {
    if (!window.confirm('Are you sure you want to cancel this trip?')) return;
    try {
      await axios.patch(`${API_BASE}/duties/${tripId}/cancel`);
      toast.success('Trip cancelled successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to cancel trip');
    }
  };

  const canCancelTrip = (trip) => {
    // Admin can cancel any trip that hasn't started
    return !['STARTED', 'COMPLETED', 'BILLED', 'CLOSED'].includes(trip.status);
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
      <div className="flex justify-between items-start mb-6">
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

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {QUICK_FILTERS.map(qf => (
          <button
            key={qf.value}
            onClick={() => setQuickFilter(qf.value)}
            className={`px-4 py-2 text-sm font-medium border transition-colors ${
              quickFilter === qf.value
                ? 'bg-[#0047FF] text-white border-[#0047FF]'
                : 'bg-white text-[#525252] border-[#E5E5E5] hover:border-[#0047FF] hover:text-[#0047FF]'
            }`}
            data-testid={`quick-filter-${qf.value}`}
          >
            {qf.label}
          </button>
        ))}
      </div>

      {/* Search and Advanced Filters */}
      <div className="bg-white border border-[#E5E5E5] p-4 mb-4">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-1 block">Search</label>
            <div className="relative">
              <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#525252]" />
              <input
                type="text"
                placeholder="Passenger, phone, location, company..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#0047FF]"
                data-testid="search-input"
              />
            </div>
          </div>

          {/* Company Filter */}
          <div className="w-48">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-1 block">Company</label>
            <Select value={filters.client_id} onValueChange={(val) => setFilters({ ...filters, client_id: val === 'all' ? '' : val })}>
              <SelectTrigger data-testid="company-filter">
                <SelectValue placeholder="All Companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="w-40">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-1 block">Status</label>
            <Select value={filters.status} onValueChange={(val) => setFilters({ ...filters, status: val })}>
              <SelectTrigger data-testid="status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIP_STATUSES.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Toggle Advanced Filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border text-sm font-medium ${
              showFilters || activeFilterCount > 0 
                ? 'border-[#0047FF] text-[#0047FF] bg-[#E6EFFF]' 
                : 'border-[#E5E5E5] text-[#525252] hover:border-[#0047FF]'
            }`}
          >
            <FunnelSimple size={18} />
            More Filters
            {activeFilterCount > 0 && (
              <span className="bg-[#0047FF] text-white text-xs px-2 py-0.5 rounded-full">{activeFilterCount}</span>
            )}
          </button>

          {/* Sort */}
          <div className="w-48">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-1 block">Sort By</label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger data-testid="sort-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {activeFilterCount > 0 && (
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-[#E5E5E5] grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Driver Filter */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-1 block">Driver</label>
              <Select value={filters.driver_id} onValueChange={(val) => setFilters({ ...filters, driver_id: val === 'all' ? '' : val })}>
                <SelectTrigger data-testid="driver-filter">
                  <SelectValue placeholder="All Drivers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Drivers</SelectItem>
                  {drivers.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date From */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-1 block">Date From</label>
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                className="w-full px-4 py-2 border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#0047FF]"
                data-testid="date-from-filter"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-1 block">Date To</label>
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                className="w-full px-4 py-2 border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#0047FF]"
                data-testid="date-to-filter"
              />
            </div>
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-[#525252]">
          Showing <span className="font-semibold text-[#0A0A0A]">{filteredAndSortedTrips.length}</span> of {trips.length} trips
        </p>
      </div>

      <div className="space-y-4">
        {filteredAndSortedTrips.length === 0 ? (
          <div className="bg-white border border-[#E5E5E5] p-12 text-center">
            <p className="text-sm text-[#525252]">
              {trips.length === 0 ? 'No trips found. Create your first trip.' : 'No trips match your filters.'}
            </p>
            {activeFilterCount > 0 && (
              <button onClick={resetFilters} className="mt-4 text-[#0047FF] text-sm font-semibold hover:underline">
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          filteredAndSortedTrips.map((trip) => {
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
                  {/* Admin Cancel Trip Button */}
                  {canCancelTrip(trip) && (
                    <button
                      onClick={() => handleCancelTrip(trip.id)}
                      className="px-4 py-2 border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors duration-150 flex items-center gap-2"
                      data-testid={`cancel-trip-${trip.id}`}
                    >
                      <X size={16} weight="bold" />
                      Cancel Trip
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
            <LocationAutocomplete
              label="Pickup Location"
              value={formData.pickup_location}
              onChange={(value) => setFormData({ ...formData, pickup_location: value })}
              onPlaceSelect={(place) => {
                if (place) {
                  setFormData({ 
                    ...formData, 
                    pickup_location: place.address,
                    pickup_lat: place.lat,
                    pickup_lng: place.lng
                  });
                }
              }}
              placeholder="Search pickup location..."
              required
            />
            <LocationAutocomplete
              label="Dropoff Location"
              value={formData.dropoff_location}
              onChange={(value) => setFormData({ ...formData, dropoff_location: value })}
              onPlaceSelect={(place) => {
                if (place) {
                  setFormData({ 
                    ...formData, 
                    dropoff_location: place.address,
                    dropoff_lat: place.lat,
                    dropoff_lng: place.lng
                  });
                }
              }}
              placeholder="Search dropoff location..."
              required
            />
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
