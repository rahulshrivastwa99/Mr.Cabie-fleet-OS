import React, { useState, useEffect } from 'react';
import { corporateAxios } from '../../context/CorporateAuthContext';
import { toast } from 'sonner';
import { FileText, Download, Calendar, ChartLineUp } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCorporateAuth } from '../../context/CorporateAuthContext';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api/corporate`;

const CorporateDutySlips = () => {
  const { user } = useCorporateAuth();
  const [dutySlips, setDutySlips] = useState([]);
  const [monthlySummary, setMonthlySummary] = useState(null);
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [filters, setFilters] = useState({
    date_from: '',
    date_to: ''
  });

  useEffect(() => {
    fetchData();
    fetchMonthlySummary();
    fetchContract();
  }, []);

  useEffect(() => {
    fetchDutySlips();
  }, [filters]);

  const fetchData = async () => {
    await fetchDutySlips();
    setLoading(false);
  };

  const fetchDutySlips = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);

      const response = await corporateAxios.get(`${API_BASE}/duty-slips?${params.toString()}`);
      setDutySlips(response.data);
    } catch (error) {
      toast.error('Failed to load duty slips');
    }
  };

  const fetchMonthlySummary = async () => {
    try {
      const now = new Date();
      const response = await corporateAxios.get(`${API_BASE}/monthly-summary?year=${now.getFullYear()}&month=${now.getMonth() + 1}`);
      setMonthlySummary(response.data);
    } catch (error) {
      console.error('Failed to fetch monthly summary');
    }
  };

  const fetchContract = async () => {
    try {
      const response = await corporateAxios.get(`${API_BASE}/contract`);
      setContract(response.data.contract);
    } catch (error) {
      console.error('Failed to fetch contract');
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
    <div className="p-6" data-testid="corporate-duty-slips-page">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" data-testid="duty-slips-title">Duty Slips</h1>
          <p className="text-xs text-[#525252] uppercase tracking-widest mt-2">Trip Execution Records</p>
        </div>
      </div>

      {/* Monthly Summary Card */}
      {monthlySummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-[#E5E5E5] p-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar size={24} className="text-[#0047FF]" />
              <p className="text-xs font-semibold uppercase tracking-widest text-[#525252]">This Month</p>
            </div>
            <p className="text-2xl font-bold">{monthlySummary.total_trips} Trips</p>
          </div>
          <div className="bg-white border border-[#E5E5E5] p-6">
            <div className="flex items-center gap-3 mb-2">
              <FileText size={24} className="text-[#00C853]" />
              <p className="text-xs font-semibold uppercase tracking-widest text-[#525252]">Signed Slips</p>
            </div>
            <p className="text-2xl font-bold">{monthlySummary.signed_trips}</p>
          </div>
          <div className="bg-white border border-[#E5E5E5] p-6">
            <div className="flex items-center gap-3 mb-2">
              <ChartLineUp size={24} className="text-[#FF9800]" />
              <p className="text-xs font-semibold uppercase tracking-widest text-[#525252]">Total KM</p>
            </div>
            <p className="text-2xl font-bold">{monthlySummary.total_km?.toFixed(1)} km</p>
          </div>
          <div className="bg-white border border-[#E5E5E5] p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-2">Total Payable</p>
            <p className="text-2xl font-bold text-[#0047FF]">₹{monthlySummary.total_payable?.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Active Contract Info */}
      {contract && (
        <div className="bg-[#E6EFFF] border border-[#0047FF] p-4 mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#0047FF] mb-2">Active Contract</p>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-semibold">{contract.name}</p>
              <p className="text-xs text-[#525252]">{contract.contract_type?.replace('_', ' ')}</p>
            </div>
            <p className="text-sm text-[#525252]">
              Valid: {new Date(contract.start_date).toLocaleDateString()} - {new Date(contract.end_date).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-[#E5E5E5] p-4 mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-3">Filter by Date</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <p className="text-sm text-[#525252]">No duty slips found for the selected period.</p>
          </div>
        ) : (
          dutySlips.map((slip) => (
            <div key={slip.id} className="bg-white border border-[#E5E5E5] p-6 hover:border-[#525252] transition-colors duration-150">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-semibold text-[#0047FF]">#{slip.id.slice(0, 8).toUpperCase()}</span>
                    <span className={getStatusBadge(slip.status)}>{slip.status}</span>
                  </div>
                  <p className="text-sm text-[#525252]">{slip.passenger_name}</p>
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
                  <p className="text-sm">{slip.driver_name}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-1">Vehicle</p>
                  <p className="text-sm">{slip.vehicle_number}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-1">Total KM</p>
                  <p className="text-sm font-bold text-[#0047FF]">{slip.total_km || '-'}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E5E5E5]">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-1">Route</p>
                <p className="text-sm">{slip.pickup_location} → {slip.dropoff_location}</p>
              </div>

              <div className="flex gap-3 pt-4 mt-4 border-t border-[#E5E5E5]">
                <button
                  onClick={() => openViewModal(slip)}
                  className="px-4 py-2 border border-[#E5E5E5] text-sm font-medium hover:bg-[#F5F5F5] transition-colors duration-150 flex items-center gap-2"
                  data-testid={`view-slip-${slip.id}`}
                >
                  <FileText size={16} />
                  View Details
                </button>
                {slip.status === 'SIGNED' && (
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-[#0047FF] text-white text-sm font-semibold hover:bg-[#003BCC] transition-colors duration-150 flex items-center gap-2"
                    data-testid={`download-slip-${slip.id}`}
                  >
                    <Download size={16} />
                    Download PDF
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* View Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Duty Slip</DialogTitle>
          </DialogHeader>
          {selectedSlip && (
            <div className="space-y-4 mt-4" id="duty-slip-print">
              <div className="text-center pb-4 border-b border-[#E5E5E5]">
                <h2 className="text-2xl font-bold">DUTY SLIP</h2>
                <p className="text-sm text-[#525252]">ID: {selectedSlip.id.slice(0, 8).toUpperCase()}</p>
                <span className={getStatusBadge(selectedSlip.status)}>{selectedSlip.status}</span>
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
                {selectedSlip.status === 'SIGNED' && (
                  <button
                    onClick={() => window.print()}
                    className="flex-1 px-4 py-2 bg-[#0047FF] text-white text-sm font-semibold hover:bg-[#003BCC] transition-colors duration-150 flex items-center justify-center gap-2"
                    data-testid="print-slip-button"
                  >
                    <Download size={16} weight="bold" />
                    Print / PDF
                  </button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CorporateDutySlips;
