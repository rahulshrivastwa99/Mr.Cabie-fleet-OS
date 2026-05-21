import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, Receipt, PencilSimple, FileText, X, Check, PaperPlaneTilt } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Billing = () => {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [dutySlips, setDutySlips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedSlips, setSelectedSlips] = useState([]);
  
  const [generateForm, setGenerateForm] = useState({
    client_id: '',
    contract_id: '',
    billing_period_start: '',
    billing_period_end: '',
    gst_percentage: 18,
    due_days: 30
  });
  
  const [extraCharges, setExtraCharges] = useState([]);
  const [editLineItems, setEditLineItems] = useState([]);
  const [editExtraCharges, setEditExtraCharges] = useState([]);
  const [editGst, setEditGst] = useState(18);
  
  // Manual Pricing State
  const [isManualPricing, setIsManualPricing] = useState(false);
  const [manualPricing, setManualPricing] = useState({
    base_fare: '',
    toll: '',
    parking: '',
    driver_allowance: '',
    extras: '',
    custom_items: []
  });
  
  // Manual Trip Entry (for invoices without duty slips)
  const [manualTrips, setManualTrips] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [invoicesRes, clientsRes, contractsRes, slipsRes] = await Promise.all([
        axios.get(`${API_BASE}/invoices`),
        axios.get(`${API_BASE}/clients`),
        axios.get(`${API_BASE}/contracts`),
        axios.get(`${API_BASE}/duty-slips`)
      ]);
      setInvoices(invoicesRes.data);
      setClients(clientsRes.data);
      setContracts(contractsRes.data);
      // Only show SIGNED duty slips that can be billed
      setDutySlips(slipsRes.data.filter(ds => ds.status === 'SIGNED'));
    } catch (error) {
      toast.error('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const handleClientChange = (clientId) => {
    setGenerateForm({ ...generateForm, client_id: clientId, contract_id: '' });
    setSelectedSlips([]);
    
    // Check if client's contract is MANUAL type
    const clientContracts = contracts.filter(c => c.client_id === clientId && c.is_active);
    if (clientContracts.length > 0 && clientContracts[0].contract_type === 'MANUAL') {
      setIsManualPricing(true);
    } else {
      setIsManualPricing(false);
    }
  };

  const handleContractChange = (contractId) => {
    setGenerateForm({ ...generateForm, contract_id: contractId });
    const contract = contracts.find(c => c.id === contractId);
    if (contract?.contract_type === 'MANUAL') {
      setIsManualPricing(true);
    } else {
      setIsManualPricing(false);
    }
  };

  const addManualCustomItem = () => {
    setManualPricing({
      ...manualPricing,
      custom_items: [...manualPricing.custom_items, { description: '', amount: '' }]
    });
  };

  const updateManualCustomItem = (index, field, value) => {
    const updated = [...manualPricing.custom_items];
    updated[index][field] = value;
    setManualPricing({ ...manualPricing, custom_items: updated });
  };

  const removeManualCustomItem = (index) => {
    setManualPricing({
      ...manualPricing,
      custom_items: manualPricing.custom_items.filter((_, i) => i !== index)
    });
  };

  const calculateManualTotal = () => {
    let total = 0;
    if (manualPricing.base_fare) total += parseFloat(manualPricing.base_fare) || 0;
    if (manualPricing.toll) total += parseFloat(manualPricing.toll) || 0;
    if (manualPricing.parking) total += parseFloat(manualPricing.parking) || 0;
    if (manualPricing.driver_allowance) total += parseFloat(manualPricing.driver_allowance) || 0;
    if (manualPricing.extras) total += parseFloat(manualPricing.extras) || 0;
    manualPricing.custom_items.forEach(item => {
      total += parseFloat(item.amount) || 0;
    });
    return total;
  };

  const toggleSlipSelection = (slipId) => {
    setSelectedSlips(prev => 
      prev.includes(slipId) ? prev.filter(id => id !== slipId) : [...prev, slipId]
    );
  };

  const addExtraCharge = () => {
    setExtraCharges([...extraCharges, { name: '', amount: 0, description: '' }]);
  };

  const updateExtraCharge = (index, field, value) => {
    const updated = [...extraCharges];
    updated[index][field] = field === 'amount' ? parseFloat(value) || 0 : value;
    setExtraCharges(updated);
  };

  const removeExtraCharge = (index) => {
    setExtraCharges(extraCharges.filter((_, i) => i !== index));
  };

  const handleGenerateInvoice = async (e) => {
    e.preventDefault();
    
    // Allow invoice without duty slips ONLY if manual pricing is enabled
    if (selectedSlips.length === 0 && !isManualPricing) {
      toast.error('Please select at least one duty slip, or enable manual pricing');
      return;
    }
    
    // If manual pricing, require at least some amount entered
    if (isManualPricing && calculateManualTotal() === 0 && manualTrips.length === 0) {
      toast.error('Please enter pricing details or add manual trip entries');
      return;
    }
    
    try {
      const payload = {
        client_id: generateForm.client_id,
        contract_id: generateForm.contract_id || undefined,
        duty_slip_ids: selectedSlips.length > 0 ? selectedSlips : [],
        billing_period_start: generateForm.billing_period_start ? new Date(generateForm.billing_period_start).toISOString() : undefined,
        billing_period_end: generateForm.billing_period_end ? new Date(generateForm.billing_period_end).toISOString() : undefined,
        extra_charges: extraCharges.filter(ec => ec.name && ec.amount > 0),
        gst_percentage: generateForm.gst_percentage,
        due_days: generateForm.due_days,
        // Manual Pricing Fields
        is_manual_pricing: isManualPricing,
        manual_base_fare: isManualPricing && manualPricing.base_fare ? parseFloat(manualPricing.base_fare) : undefined,
        manual_toll: isManualPricing && manualPricing.toll ? parseFloat(manualPricing.toll) : undefined,
        manual_parking: isManualPricing && manualPricing.parking ? parseFloat(manualPricing.parking) : undefined,
        manual_driver_allowance: isManualPricing && manualPricing.driver_allowance ? parseFloat(manualPricing.driver_allowance) : undefined,
        manual_extras: isManualPricing && manualPricing.extras ? parseFloat(manualPricing.extras) : undefined,
        manual_line_items: isManualPricing ? [
          ...manualPricing.custom_items.filter(item => item.description && item.amount).map(item => ({
            description: item.description,
            amount: parseFloat(item.amount) || 0
          })),
          // Add manual trips as line items
          ...manualTrips.filter(trip => trip.description).map(trip => ({
            description: `${trip.description}${trip.date ? ` (${trip.date})` : ''}${trip.km ? ` - ${trip.km} km` : ''}`,
            amount: parseFloat(trip.amount) || 0
          }))
        ] : undefined,
        manual_total: isManualPricing ? calculateManualTotal() + manualTrips.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0) : undefined,
        // Store manual trip details for record-keeping
        manual_trip_entries: isManualPricing && manualTrips.length > 0 ? manualTrips : undefined
      };
      
      await axios.post(`${API_BASE}/invoices`, payload);
      toast.success('Invoice generated successfully');
      setShowGenerateModal(false);
      resetGenerateForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate invoice');
    }
  };

  const resetGenerateForm = () => {
    setGenerateForm({
      client_id: '',
      contract_id: '',
      billing_period_start: '',
      billing_period_end: '',
      gst_percentage: 18,
      due_days: 30
    });
    setSelectedSlips([]);
    setExtraCharges([]);
    setIsManualPricing(false);
    setManualPricing({
      base_fare: '',
      toll: '',
      parking: '',
      driver_allowance: '',
      extras: '',
      custom_items: []
    });
    setManualTrips([]);
  };
  
  // Manual Trip Entry Helpers
  const addManualTrip = () => {
    setManualTrips([...manualTrips, { 
      description: '', 
      date: '', 
      passenger_name: '',
      pickup: '',
      dropoff: '',
      km: '',
      amount: '' 
    }]);
  };
  
  const updateManualTrip = (index, field, value) => {
    const updated = [...manualTrips];
    updated[index][field] = value;
    setManualTrips(updated);
  };
  
  const removeManualTrip = (index) => {
    setManualTrips(manualTrips.filter((_, i) => i !== index));
  };
  
  const calculateManualTripsTotal = () => {
    return manualTrips.reduce((sum, trip) => sum + (parseFloat(trip.amount) || 0), 0);
  };

  const openViewModal = async (invoice) => {
    try {
      const response = await axios.get(`${API_BASE}/invoices/${invoice.id}`);
      setSelectedInvoice(response.data);
      setShowViewModal(true);
    } catch (error) {
      toast.error('Failed to load invoice details');
    }
  };

  const openEditModal = (invoice) => {
    setSelectedInvoice(invoice);
    setEditLineItems(invoice.line_items || []);
    setEditExtraCharges(invoice.extra_charges || []);
    setEditGst(invoice.gst_percentage || 18);
    setShowEditModal(true);
  };

  const handleUpdateInvoice = async () => {
    try {
      await axios.put(`${API_BASE}/invoices/${selectedInvoice.id}`, {
        line_items: editLineItems,
        extra_charges: editExtraCharges,
        gst_percentage: editGst
      });
      toast.success('Invoice updated successfully');
      setShowEditModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update invoice');
    }
  };

  const handleSendInvoice = async (invoiceId) => {
    try {
      await axios.patch(`${API_BASE}/invoices/${invoiceId}/send`);
      toast.success('Invoice sent to corporate client');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send invoice');
    }
  };

  const updateLineItem = (index, field, value) => {
    const updated = [...editLineItems];
    if (field === 'rate' || field === 'quantity') {
      updated[index][field] = parseFloat(value) || 0;
      updated[index].amount = updated[index].rate * updated[index].quantity;
    } else if (field === 'amount') {
      updated[index][field] = parseFloat(value) || 0;
    } else {
      updated[index][field] = value;
    }
    setEditLineItems(updated);
  };

  const addEditExtraCharge = () => {
    setEditExtraCharges([...editExtraCharges, { name: '', amount: 0, description: '' }]);
  };

  const updateEditExtraCharge = (index, field, value) => {
    const updated = [...editExtraCharges];
    updated[index][field] = field === 'amount' ? parseFloat(value) || 0 : value;
    setEditExtraCharges(updated);
  };

  const removeEditExtraCharge = (index) => {
    setEditExtraCharges(editExtraCharges.filter((_, i) => i !== index));
  };

  const calculateEditTotals = () => {
    const baseAmount = editLineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const extraAmount = editExtraCharges.reduce((sum, ec) => sum + (ec.amount || 0), 0);
    const subtotal = baseAmount + extraAmount;
    const gstAmount = subtotal * (editGst / 100);
    return { baseAmount, extraAmount, subtotal, gstAmount, total: subtotal + gstAmount };
  };

  const getStatusBadgeClass = (status) => {
    const classes = {
      DRAFT: 'bg-[#E5E5E5] text-[#525252]',
      SENT: 'bg-[#E6EFFF] text-[#0047FF]',
      PAID: 'bg-[#E0F7E9] text-[#00C853]',
      OVERDUE: 'bg-[#FFEBEE] text-[#F44336]',
      CANCELLED: 'bg-gray-100 text-gray-500'
    };
    return `px-3 py-1 text-xs font-semibold uppercase tracking-wider ${classes[status] || classes.DRAFT}`;
  };

  // Filter duty slips by selected client
  const clientSlips = dutySlips.filter(ds => ds.client_id === generateForm.client_id);
  const clientContracts = contracts.filter(c => c.client_id === generateForm.client_id && c.is_active);

  // Calculate totals for preview
  const selectedSlipsData = clientSlips.filter(ds => selectedSlips.includes(ds.id));
  const totalKm = selectedSlipsData.reduce((sum, ds) => sum + (ds.total_km || 0), 0);
  const totalTrips = selectedSlips.length;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#0047FF] border-t-transparent rounded-sm animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-[#525252]">Loading billing data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="billing-page">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" data-testid="billing-title">Billing & Invoices</h1>
          <p className="text-xs text-[#525252] uppercase tracking-widest mt-2">Invoice Management & Duty Slip Billing</p>
        </div>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="flex items-center gap-2 bg-[#0047FF] text-white px-6 py-3 font-semibold text-sm hover:bg-[#003BCC] transition-colors duration-150"
          data-testid="generate-invoice-button"
        >
          <Plus size={20} weight="bold" />
          Generate Invoice
        </button>
      </div>

      {/* Unbilled Duty Slips Summary */}
      <div className="bg-[#FFF3E0] border border-[#FF9800] p-4 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-semibold text-[#FF9800]">{dutySlips.length} Signed Duty Slips Awaiting Billing</p>
            <p className="text-xs text-[#525252]">Total KM: {dutySlips.reduce((sum, ds) => sum + (ds.total_km || 0), 0).toFixed(1)} km</p>
          </div>
          <FileText size={32} className="text-[#FF9800]" />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white border border-[#E5E5E5]">
        <table className="w-full">
          <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5]">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Invoice #</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Client</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Duty Slips</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Amount</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Total</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Date</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Status</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-12">
                  <Receipt size={48} className="mx-auto mb-4 text-[#E5E5E5]" />
                  <p className="text-sm text-[#525252]">No invoices found. Generate your first invoice from duty slips.</p>
                </td>
              </tr>
            ) : (
              invoices.map(invoice => {
                const client = clients.find(c => c.id === invoice.client_id);
                const slipCount = invoice.duty_slip_ids?.length || invoice.duties?.length || 0;
                return (
                  <tr key={invoice.id} className="border-b border-[#E5E5E5] hover:bg-[#FAFAFA] transition-colors duration-150">
                    <td className="px-6 py-4 text-sm font-semibold">{invoice.invoice_number}</td>
                    <td className="px-6 py-4 text-sm">{client?.company_name || 'Unknown'}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-2 py-1 bg-[#E6EFFF] text-[#0047FF] text-xs font-semibold">
                        {slipCount} slips
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">₹{(invoice.subtotal || invoice.amount || 0).toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-sm font-semibold">₹{(invoice.total_amount || 0).toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-sm">{new Date(invoice.invoice_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className={getStatusBadgeClass(invoice.status)}>{invoice.status}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openViewModal(invoice)}
                          className="p-2 text-[#525252] hover:text-[#0047FF] hover:bg-[#F5F5F5] transition-colors duration-150"
                          title="View Details"
                          data-testid={`view-invoice-${invoice.id}`}
                        >
                          <FileText size={18} />
                        </button>
                        <button
                          onClick={() => openEditModal(invoice)}
                          className="p-2 text-[#525252] hover:text-[#FF9800] hover:bg-[#F5F5F5] transition-colors duration-150"
                          title="Edit Invoice"
                          data-testid={`edit-invoice-${invoice.id}`}
                        >
                          <PencilSimple size={18} />
                        </button>
                        {invoice.status === 'DRAFT' && (
                          <button
                            onClick={() => handleSendInvoice(invoice.id)}
                            className="p-2 text-white bg-[#00C853] hover:bg-[#00A843] transition-colors duration-150"
                            title="Send to Corporate"
                            data-testid={`send-invoice-${invoice.id}`}
                          >
                            <PaperPlaneTilt size={18} weight="bold" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Generate Invoice Modal */}
      <Dialog open={showGenerateModal} onOpenChange={setShowGenerateModal}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Generate Invoice from Duty Slips</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleGenerateInvoice} className="space-y-4 mt-4">
            {/* Client & Contract Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                  Client
                </label>
                <Select value={generateForm.client_id} onValueChange={handleClientChange}>
                  <SelectTrigger data-testid="invoice-client-select">
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
                  Contract (Optional)
                </label>
                <Select value={generateForm.contract_id || 'none'} onValueChange={(value) => handleContractChange(value === 'none' ? '' : value)}>
                  <SelectTrigger data-testid="invoice-contract-select">
                    <SelectValue placeholder="Select contract for pricing" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Contract (Manual Pricing)</SelectItem>
                    {clientContracts.map(contract => (
                      <SelectItem key={contract.id} value={contract.id}>
                        {contract.name} - {contract.contract_type.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* Manual Pricing Toggle */}
                {!generateForm.contract_id && (
                  <div className="mt-2 flex items-center gap-2">
                    <Checkbox
                      checked={isManualPricing}
                      onCheckedChange={setIsManualPricing}
                      data-testid="manual-pricing-toggle"
                    />
                    <label className="text-xs text-[#525252]">Enable itemized manual pricing</label>
                  </div>
                )}
              </div>
            </div>

            {/* Billing Period */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                  Billing Period Start
                </label>
                <input
                  type="date"
                  value={generateForm.billing_period_start}
                  onChange={(e) => setGenerateForm({ ...generateForm, billing_period_start: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] text-sm"
                  data-testid="billing-start-input"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                  Billing Period End
                </label>
                <input
                  type="date"
                  value={generateForm.billing_period_end}
                  onChange={(e) => setGenerateForm({ ...generateForm, billing_period_end: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] text-sm"
                  data-testid="billing-end-input"
                />
              </div>
            </div>

            {/* Duty Slips Selection */}
            {generateForm.client_id && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                  Select Signed Duty Slips ({clientSlips.length} available)
                </label>
                {clientSlips.length === 0 ? (
                  <div className="border border-[#E5E5E5] p-8 text-center">
                    <p className="text-sm text-[#525252]">No signed duty slips available for this client</p>
                  </div>
                ) : (
                  <div className="border border-[#E5E5E5] max-h-64 overflow-y-auto">
                    {clientSlips.map(slip => (
                      <label
                        key={slip.id}
                        className="flex items-center gap-3 p-3 border-b border-[#E5E5E5] hover:bg-[#FAFAFA] cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedSlips.includes(slip.id)}
                          onCheckedChange={() => toggleSlipSelection(slip.id)}
                          data-testid={`slip-checkbox-${slip.id}`}
                        />
                        <div className="flex-1 grid grid-cols-4 gap-2 items-center">
                          <div>
                            <p className="text-xs font-semibold text-[#0047FF]">#{slip.id.slice(0, 8).toUpperCase()}</p>
                            <p className="text-xs text-[#525252]">{new Date(slip.date).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-sm">{slip.passenger_name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-[#525252]">{slip.pickup_location} → {slip.dropoff_location}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-[#0047FF]">{slip.total_km} km</p>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                
                {/* Selection Summary */}
                {selectedSlips.length > 0 && (
                  <div className="mt-2 p-3 bg-[#E6EFFF] border border-[#0047FF]">
                    <p className="text-sm font-semibold text-[#0047FF]">
                      Selected: {totalTrips} trips | Total KM: {totalKm.toFixed(1)} km
                    </p>
                  </div>
                )}
                
                {/* No Duty Slips Warning with Manual Option */}
                {clientSlips.length === 0 && isManualPricing && (
                  <div className="mt-2 p-3 bg-[#FFF8E1] border border-[#FF9800]">
                    <p className="text-sm text-[#FF9800]">
                      <strong>No signed duty slips found.</strong> You can still create an invoice by adding manual trip entries below.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Manual Trip Entry Section - For trips without duty slips */}
            {isManualPricing && generateForm.client_id && (
              <div className="p-4 bg-[#E8F5E9] border border-[#4CAF50]" data-testid="manual-trip-entry-section">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Plus size={20} className="text-[#4CAF50]" />
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-[#525252]">
                      Manual Trip Entries
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={addManualTrip}
                    className="text-xs text-[#4CAF50] font-semibold hover:underline flex items-center gap-1"
                    data-testid="add-manual-trip-btn"
                  >
                    <Plus size={14} /> Add Trip
                  </button>
                </div>
                <p className="text-xs text-[#525252] mb-4">
                  For trips where duty slips weren't signed or recorded. Add trip details manually for billing.
                </p>
                
                {manualTrips.length === 0 ? (
                  <div className="text-center py-4 text-sm text-[#525252]">
                    No manual trips added. Click "Add Trip" to enter trip details.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {manualTrips.map((trip, idx) => (
                      <div key={idx} className="p-3 bg-white border border-[#E5E5E5] rounded">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-semibold text-[#4CAF50]">Trip #{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeManualTrip(idx)}
                            className="text-red-500 hover:bg-red-50 p-1"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <input
                            type="date"
                            value={trip.date}
                            onChange={(e) => updateManualTrip(idx, 'date', e.target.value)}
                            className="px-2 py-1 border border-[#E5E5E5] text-sm"
                            placeholder="Date"
                          />
                          <input
                            type="text"
                            value={trip.passenger_name}
                            onChange={(e) => updateManualTrip(idx, 'passenger_name', e.target.value)}
                            placeholder="Passenger Name"
                            className="px-2 py-1 border border-[#E5E5E5] text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <input
                            type="text"
                            value={trip.pickup}
                            onChange={(e) => updateManualTrip(idx, 'pickup', e.target.value)}
                            placeholder="Pickup Location"
                            className="px-2 py-1 border border-[#E5E5E5] text-sm"
                          />
                          <input
                            type="text"
                            value={trip.dropoff}
                            onChange={(e) => updateManualTrip(idx, 'dropoff', e.target.value)}
                            placeholder="Drop-off Location"
                            className="px-2 py-1 border border-[#E5E5E5] text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            type="number"
                            value={trip.km}
                            onChange={(e) => updateManualTrip(idx, 'km', e.target.value)}
                            placeholder="KM"
                            className="px-2 py-1 border border-[#E5E5E5] text-sm"
                          />
                          <input
                            type="text"
                            value={trip.description}
                            onChange={(e) => updateManualTrip(idx, 'description', e.target.value)}
                            placeholder="Description/Notes"
                            className="px-2 py-1 border border-[#E5E5E5] text-sm"
                          />
                          <input
                            type="number"
                            value={trip.amount}
                            onChange={(e) => updateManualTrip(idx, 'amount', e.target.value)}
                            placeholder="Amount ₹"
                            className="px-2 py-1 border border-[#E5E5E5] text-sm font-semibold"
                          />
                        </div>
                      </div>
                    ))}
                    
                    {/* Manual Trips Total */}
                    <div className="mt-2 pt-2 border-t border-[#4CAF50] flex justify-between">
                      <span className="text-sm font-semibold text-[#525252]">Manual Trips Total:</span>
                      <span className="text-sm font-bold text-[#4CAF50]">₹{calculateManualTripsTotal().toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Manual Pricing Section - Shows when manual pricing is enabled */}
            {isManualPricing && generateForm.client_id && (
              <div className="p-4 bg-[#FFF8E1] border border-[#FFB300]" data-testid="manual-pricing-section">
                <div className="flex items-center gap-2 mb-4">
                  <Receipt size={20} className="text-[#FF9800]" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-[#525252]">
                    Manual Pricing Breakdown
                  </h3>
                </div>
                <p className="text-xs text-[#525252] mb-4">
                  Enter itemized amounts for this invoice. All amounts will be totaled and GST applied.
                </p>
                
                {/* Standard Charge Items */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs text-[#525252] mb-1 block">Base Fare (₹)</label>
                    <input
                      type="number"
                      value={manualPricing.base_fare}
                      onChange={(e) => setManualPricing({ ...manualPricing, base_fare: e.target.value })}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9800]"
                      data-testid="manual-base-fare"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#525252] mb-1 block">Toll Charges (₹)</label>
                    <input
                      type="number"
                      value={manualPricing.toll}
                      onChange={(e) => setManualPricing({ ...manualPricing, toll: e.target.value })}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9800]"
                      data-testid="manual-toll"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#525252] mb-1 block">Parking Charges (₹)</label>
                    <input
                      type="number"
                      value={manualPricing.parking}
                      onChange={(e) => setManualPricing({ ...manualPricing, parking: e.target.value })}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9800]"
                      data-testid="manual-parking"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#525252] mb-1 block">Driver Allowance (₹)</label>
                    <input
                      type="number"
                      value={manualPricing.driver_allowance}
                      onChange={(e) => setManualPricing({ ...manualPricing, driver_allowance: e.target.value })}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9800]"
                      data-testid="manual-driver-allowance"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#525252] mb-1 block">Other Extras (₹)</label>
                    <input
                      type="number"
                      value={manualPricing.extras}
                      onChange={(e) => setManualPricing({ ...manualPricing, extras: e.target.value })}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9800]"
                      data-testid="manual-extras"
                    />
                  </div>
                </div>
                
                {/* Custom Line Items */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
                      Custom Items
                    </label>
                    <button
                      type="button"
                      onClick={addManualCustomItem}
                      className="text-xs text-[#FF9800] font-semibold hover:underline"
                    >
                      + Add Custom Item
                    </button>
                  </div>
                  {manualPricing.custom_items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-3 gap-2 mb-2">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateManualCustomItem(idx, 'description', e.target.value)}
                        placeholder="Description"
                        className="col-span-2 px-3 py-2 border border-[#E5E5E5] text-sm"
                      />
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={item.amount}
                          onChange={(e) => updateManualCustomItem(idx, 'amount', e.target.value)}
                          placeholder="Amount"
                          className="flex-1 px-3 py-2 border border-[#E5E5E5] text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => removeManualCustomItem(idx)}
                          className="px-2 py-2 text-red-500 hover:bg-red-50"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Total Preview */}
                <div className="mt-4 pt-4 border-t border-[#FFB300]">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-[#525252]">Manual Pricing Total:</span>
                    <span className="text-sm font-semibold text-[#FF9800]">
                      ₹{calculateManualTotal().toLocaleString('en-IN')}
                    </span>
                  </div>
                  {manualTrips.length > 0 && (
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-[#525252]">Manual Trips Total:</span>
                      <span className="text-sm font-semibold text-[#4CAF50]">
                        ₹{calculateManualTripsTotal().toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-[#FFB300]">
                    <span className="text-sm font-semibold text-[#525252]">Subtotal (Before GST):</span>
                    <span className="text-lg font-bold text-[#FF9800]" data-testid="manual-subtotal">
                      ₹{(calculateManualTotal() + calculateManualTripsTotal()).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <p className="text-xs text-[#525252] mt-1">GST @ {generateForm.gst_percentage}% will be added</p>
                </div>
              </div>
            )}

            {/* Extra Charges */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
                  Extra Charges (Toll, Parking, etc.)
                </label>
                <button
                  type="button"
                  onClick={addExtraCharge}
                  className="text-xs text-[#0047FF] font-semibold hover:underline"
                >
                  + Add Charge
                </button>
              </div>
              {extraCharges.map((charge, idx) => (
                <div key={idx} className="grid grid-cols-4 gap-2 mb-2">
                  <input
                    type="text"
                    value={charge.name}
                    onChange={(e) => updateExtraCharge(idx, 'name', e.target.value)}
                    placeholder="Charge name (e.g., Toll)"
                    className="px-3 py-2 border border-[#E5E5E5] text-sm"
                  />
                  <input
                    type="number"
                    value={charge.amount}
                    onChange={(e) => updateExtraCharge(idx, 'amount', e.target.value)}
                    placeholder="Amount"
                    className="px-3 py-2 border border-[#E5E5E5] text-sm"
                  />
                  <input
                    type="text"
                    value={charge.description}
                    onChange={(e) => updateExtraCharge(idx, 'description', e.target.value)}
                    placeholder="Description (optional)"
                    className="px-3 py-2 border border-[#E5E5E5] text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeExtraCharge(idx)}
                    className="px-3 py-2 text-red-500 hover:bg-red-50"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>

            {/* GST & Due Days */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                  GST %
                </label>
                <input
                  type="number"
                  value={generateForm.gst_percentage}
                  onChange={(e) => setGenerateForm({ ...generateForm, gst_percentage: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] text-sm"
                  data-testid="gst-input"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                  Payment Due (Days)
                </label>
                <input
                  type="number"
                  value={generateForm.due_days}
                  onChange={(e) => setGenerateForm({ ...generateForm, due_days: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] text-sm"
                  data-testid="due-days-input"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => { setShowGenerateModal(false); resetGenerateForm(); }}
                className="flex-1 px-4 py-2 border border-[#E5E5E5] text-sm font-medium hover:bg-[#F5F5F5] transition-colors duration-150"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-[#0047FF] text-white text-sm font-semibold hover:bg-[#003BCC] transition-colors duration-150"
                data-testid="generate-invoice-submit"
              >
                Generate Invoice
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Invoice Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">
              Invoice {selectedInvoice?.invoice_number}
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4 mt-4">
              {/* Client & Contract Info */}
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-[#E5E5E5]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#525252]">Client</p>
                  <p className="text-sm font-semibold">{selectedInvoice.client_detail?.company_name}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#525252]">Contract</p>
                  <p className="text-sm">{selectedInvoice.contract_detail?.name || 'No Contract'}</p>
                </div>
              </div>

              {/* Billing Period */}
              {(selectedInvoice.billing_period_start || selectedInvoice.billing_period_end) && (
                <div className="pb-4 border-b border-[#E5E5E5]">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-1">Billing Period</p>
                  <p className="text-sm">
                    {selectedInvoice.billing_period_start && new Date(selectedInvoice.billing_period_start).toLocaleDateString()} 
                    {' - '} 
                    {selectedInvoice.billing_period_end && new Date(selectedInvoice.billing_period_end).toLocaleDateString()}
                  </p>
                </div>
              )}

              {/* Duty Slips */}
              {selectedInvoice.duty_slips_detail && selectedInvoice.duty_slips_detail.length > 0 && (
                <div className="pb-4 border-b border-[#E5E5E5]">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-2">
                    Duty Slips ({selectedInvoice.duty_slips_detail.length})
                  </p>
                  <div className="bg-[#FAFAFA] border border-[#E5E5E5] max-h-40 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-white sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 text-xs font-semibold">Slip ID</th>
                          <th className="text-left px-3 py-2 text-xs font-semibold">Date</th>
                          <th className="text-left px-3 py-2 text-xs font-semibold">Passenger</th>
                          <th className="text-right px-3 py-2 text-xs font-semibold">KM</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInvoice.duty_slips_detail.map(slip => (
                          <tr key={slip.id} className="border-t border-[#E5E5E5]">
                            <td className="px-3 py-2 text-xs font-semibold text-[#0047FF]">#{slip.id.slice(0, 8).toUpperCase()}</td>
                            <td className="px-3 py-2 text-xs">{new Date(slip.date).toLocaleDateString()}</td>
                            <td className="px-3 py-2 text-xs">{slip.passenger_name}</td>
                            <td className="px-3 py-2 text-xs text-right font-semibold">{slip.total_km}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Line Items */}
              {selectedInvoice.line_items && selectedInvoice.line_items.length > 0 && (
                <div className="pb-4 border-b border-[#E5E5E5]">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-2">Line Items</p>
                  {selectedInvoice.line_items.map((item, idx) => (
                    <div key={idx} className="flex justify-between py-2 border-b border-[#E5E5E5] last:border-0">
                      <span className="text-sm">{item.description}</span>
                      <span className="text-sm font-semibold">₹{item.amount?.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Extra Charges */}
              {selectedInvoice.extra_charges && selectedInvoice.extra_charges.length > 0 && (
                <div className="pb-4 border-b border-[#E5E5E5]">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-2">Extra Charges</p>
                  {selectedInvoice.extra_charges.map((charge, idx) => (
                    <div key={idx} className="flex justify-between py-2 border-b border-[#E5E5E5] last:border-0">
                      <span className="text-sm">{charge.name}</span>
                      <span className="text-sm font-semibold">₹{charge.amount?.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Totals */}
              <div className="bg-[#FAFAFA] p-4 border border-[#E5E5E5]">
                <div className="flex justify-between mb-2">
                  <span className="text-sm">Base Amount:</span>
                  <span className="text-sm font-semibold">₹{(selectedInvoice.base_amount || 0).toLocaleString('en-IN')}</span>
                </div>
                {selectedInvoice.extra_charges_amount > 0 && (
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Extra Charges:</span>
                    <span className="text-sm font-semibold">₹{selectedInvoice.extra_charges_amount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between mb-2">
                  <span className="text-sm">GST ({selectedInvoice.gst_percentage}%):</span>
                  <span className="text-sm font-semibold">₹{(selectedInvoice.gst_amount || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#E5E5E5]">
                  <span className="text-sm font-bold">Total Amount:</span>
                  <span className="text-lg font-bold text-[#0047FF]">₹{(selectedInvoice.total_amount || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <button
                onClick={() => setShowViewModal(false)}
                className="w-full px-4 py-2 border border-[#E5E5E5] text-sm font-medium hover:bg-[#F5F5F5] transition-colors duration-150"
              >
                Close
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Invoice Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">
              Edit Invoice {selectedInvoice?.invoice_number}
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4 mt-4">
              {/* Edit Line Items */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-2">Line Items</p>
                {editLineItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-4 gap-2 mb-2 items-center">
                    <input
                      type="text"
                      value={item.description || ''}
                      onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                      placeholder="Description"
                      className="col-span-2 px-3 py-2 border border-[#E5E5E5] text-sm"
                    />
                    <input
                      type="number"
                      value={item.amount || 0}
                      onChange={(e) => updateLineItem(idx, 'amount', e.target.value)}
                      placeholder="Amount"
                      className="px-3 py-2 border border-[#E5E5E5] text-sm"
                    />
                    <span className="text-sm text-right font-semibold">₹{(item.amount || 0).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>

              {/* Edit Extra Charges */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#525252]">Extra Charges</p>
                  <button
                    type="button"
                    onClick={addEditExtraCharge}
                    className="text-xs text-[#0047FF] font-semibold hover:underline"
                  >
                    + Add Charge
                  </button>
                </div>
                {editExtraCharges.map((charge, idx) => (
                  <div key={idx} className="grid grid-cols-4 gap-2 mb-2">
                    <input
                      type="text"
                      value={charge.name}
                      onChange={(e) => updateEditExtraCharge(idx, 'name', e.target.value)}
                      placeholder="Charge name"
                      className="px-3 py-2 border border-[#E5E5E5] text-sm"
                    />
                    <input
                      type="number"
                      value={charge.amount}
                      onChange={(e) => updateEditExtraCharge(idx, 'amount', e.target.value)}
                      placeholder="Amount"
                      className="px-3 py-2 border border-[#E5E5E5] text-sm"
                    />
                    <input
                      type="text"
                      value={charge.description || ''}
                      onChange={(e) => updateEditExtraCharge(idx, 'description', e.target.value)}
                      placeholder="Description"
                      className="px-3 py-2 border border-[#E5E5E5] text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeEditExtraCharge(idx)}
                      className="px-3 py-2 text-red-500 hover:bg-red-50"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {/* GST */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                  GST %
                </label>
                <input
                  type="number"
                  value={editGst}
                  onChange={(e) => setEditGst(parseFloat(e.target.value))}
                  className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] text-sm"
                />
              </div>

              {/* Updated Totals Preview */}
              <div className="bg-[#FAFAFA] p-4 border border-[#E5E5E5]">
                {(() => {
                  const totals = calculateEditTotals();
                  return (
                    <>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">Base Amount:</span>
                        <span className="text-sm font-semibold">₹{totals.baseAmount.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">Extra Charges:</span>
                        <span className="text-sm font-semibold">₹{totals.extraAmount.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">GST ({editGst}%):</span>
                        <span className="text-sm font-semibold">₹{totals.gstAmount.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-[#E5E5E5]">
                        <span className="text-sm font-bold">Total Amount:</span>
                        <span className="text-lg font-bold text-[#0047FF]">₹{totals.total.toLocaleString('en-IN')}</span>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-[#E5E5E5] text-sm font-medium hover:bg-[#F5F5F5] transition-colors duration-150"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateInvoice}
                  className="flex-1 px-4 py-2 bg-[#FF9800] text-white text-sm font-semibold hover:bg-[#F57C00] transition-colors duration-150 flex items-center justify-center gap-2"
                  data-testid="update-invoice-button"
                >
                  <Check size={16} weight="bold" />
                  Update Invoice
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Billing;
