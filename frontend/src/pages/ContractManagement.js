import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, Handshake, PencilSimple } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CONTRACT_TYPES = [
  { value: 'FIXED_MONTHLY', label: 'Fixed Monthly', description: 'Fixed monthly amount' },
  { value: 'PER_KM', label: 'Per KM', description: 'Rate per kilometer' },
  { value: 'PER_DAY', label: 'Per Day', description: 'Daily rate' },
  { value: 'PACKAGE', label: 'Package', description: 'e.g., 8hr/80km packages' },
  { value: 'ROUTE_BASED', label: 'Route Based', description: 'Fixed route pricing' },
  { value: 'HYBRID', label: 'Hybrid', description: 'Base + usage' }
];

const BILLING_CYCLES = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Bi-Weekly' },
  { value: 'MONTHLY', label: 'Monthly' }
];

const ContractManagement = () => {
  const [contracts, setContracts] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingContract, setEditingContract] = useState(null);
  const [formData, setFormData] = useState({
    client_id: '',
    name: '',
    contract_type: '',
    start_date: '',
    end_date: '',
    billing_cycle: 'MONTHLY',
    // Fixed Monthly
    monthly_amount: '',
    included_days: '',
    included_km: '',
    // Per KM
    rate_per_km: '',
    minimum_km_per_day: '',
    // Per Day
    daily_rate: '',
    // Package
    package_hours: '',
    package_km: '',
    package_rate: '',
    extra_hour_rate: '',
    extra_km_rate: '',
    // Hybrid
    base_monthly_amount: '',
    usage_rate_per_km: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [contractsRes, clientsRes] = await Promise.all([
        axios.get(`${API_BASE}/contracts`),
        axios.get(`${API_BASE}/clients`)
      ]);
      setContracts(contractsRes.data);
      setClients(clientsRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      name: '',
      contract_type: '',
      start_date: '',
      end_date: '',
      billing_cycle: 'MONTHLY',
      monthly_amount: '',
      included_days: '',
      included_km: '',
      rate_per_km: '',
      minimum_km_per_day: '',
      daily_rate: '',
      package_hours: '',
      package_km: '',
      package_rate: '',
      extra_hour_rate: '',
      extra_km_rate: '',
      base_monthly_amount: '',
      usage_rate_per_km: ''
    });
    setEditingContract(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        client_id: formData.client_id,
        name: formData.name,
        contract_type: formData.contract_type,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
        billing_cycle: formData.billing_cycle,
      };

      // Add type-specific fields
      if (formData.contract_type === 'FIXED_MONTHLY') {
        payload.monthly_amount = parseFloat(formData.monthly_amount) || 0;
        payload.included_days = parseInt(formData.included_days) || null;
        payload.included_km = parseFloat(formData.included_km) || null;
      } else if (formData.contract_type === 'PER_KM') {
        payload.rate_per_km = parseFloat(formData.rate_per_km) || 0;
        payload.minimum_km_per_day = parseFloat(formData.minimum_km_per_day) || null;
      } else if (formData.contract_type === 'PER_DAY') {
        payload.daily_rate = parseFloat(formData.daily_rate) || 0;
      } else if (formData.contract_type === 'PACKAGE') {
        payload.package_hours = parseFloat(formData.package_hours) || 0;
        payload.package_km = parseFloat(formData.package_km) || 0;
        payload.package_rate = parseFloat(formData.package_rate) || 0;
        payload.extra_hour_rate = parseFloat(formData.extra_hour_rate) || 0;
        payload.extra_km_rate = parseFloat(formData.extra_km_rate) || 0;
      } else if (formData.contract_type === 'HYBRID') {
        payload.base_monthly_amount = parseFloat(formData.base_monthly_amount) || 0;
        payload.usage_rate_per_km = parseFloat(formData.usage_rate_per_km) || 0;
      }

      if (editingContract) {
        await axios.put(`${API_BASE}/contracts/${editingContract.id}`, payload);
        toast.success('Contract updated successfully');
      } else {
        await axios.post(`${API_BASE}/contracts`, payload);
        toast.success('Contract created successfully');
      }

      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save contract');
    }
  };

  const openEditModal = (contract) => {
    setEditingContract(contract);
    setFormData({
      client_id: contract.client_id,
      name: contract.name,
      contract_type: contract.contract_type,
      start_date: contract.start_date.split('T')[0],
      end_date: contract.end_date.split('T')[0],
      billing_cycle: contract.billing_cycle,
      monthly_amount: contract.monthly_amount || '',
      included_days: contract.included_days || '',
      included_km: contract.included_km || '',
      rate_per_km: contract.rate_per_km || '',
      minimum_km_per_day: contract.minimum_km_per_day || '',
      daily_rate: contract.daily_rate || '',
      package_hours: contract.package_hours || '',
      package_km: contract.package_km || '',
      package_rate: contract.package_rate || '',
      extra_hour_rate: contract.extra_hour_rate || '',
      extra_km_rate: contract.extra_km_rate || '',
      base_monthly_amount: contract.base_monthly_amount || '',
      usage_rate_per_km: contract.usage_rate_per_km || ''
    });
    setShowModal(true);
  };

  const getContractTypeBadge = (type) => {
    const colors = {
      FIXED_MONTHLY: 'bg-blue-100 text-blue-700',
      PER_KM: 'bg-green-100 text-green-700',
      PER_DAY: 'bg-yellow-100 text-yellow-700',
      PACKAGE: 'bg-purple-100 text-purple-700',
      ROUTE_BASED: 'bg-pink-100 text-pink-700',
      HYBRID: 'bg-orange-100 text-orange-700'
    };
    return `px-3 py-1 text-xs font-semibold uppercase tracking-wider ${colors[type] || colors.FIXED_MONTHLY}`;
  };

  const formatContractSummary = (contract) => {
    switch (contract.contract_type) {
      case 'FIXED_MONTHLY':
        return `₹${contract.monthly_amount?.toLocaleString()}/month`;
      case 'PER_KM':
        return `₹${contract.rate_per_km}/km`;
      case 'PER_DAY':
        return `₹${contract.daily_rate}/day`;
      case 'PACKAGE':
        return `${contract.package_hours}hr/${contract.package_km}km @ ₹${contract.package_rate}`;
      case 'HYBRID':
        return `₹${contract.base_monthly_amount}/month + ₹${contract.usage_rate_per_km}/km`;
      default:
        return '-';
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#0047FF] border-t-transparent rounded-sm animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-[#525252]">Loading contracts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="contracts-page">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" data-testid="contracts-title">Contracts</h1>
          <p className="text-xs text-[#525252] uppercase tracking-widest mt-2">Client Rate Agreements</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 bg-[#0047FF] text-white px-6 py-3 font-semibold text-sm hover:bg-[#003BCC] transition-colors duration-150"
          data-testid="create-contract-button"
        >
          <Plus size={20} weight="bold" />
          Create Contract
        </button>
      </div>

      <div className="space-y-4">
        {contracts.length === 0 ? (
          <div className="bg-white border border-[#E5E5E5] p-12 text-center">
            <Handshake size={48} className="mx-auto mb-4 text-[#525252]" />
            <p className="text-sm text-[#525252]">No contracts found. Create your first contract.</p>
          </div>
        ) : (
          contracts.map((contract) => {
            const client = clients.find(c => c.id === contract.client_id);
            const isActive = contract.is_active && new Date(contract.end_date) > new Date();
            
            return (
              <div key={contract.id} className="bg-white border border-[#E5E5E5] p-6 hover:border-[#525252] transition-colors duration-150">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{contract.name}</h3>
                      <span className={getContractTypeBadge(contract.contract_type)}>
                        {contract.contract_type.replace('_', ' ')}
                      </span>
                      {isActive ? (
                        <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-700">ACTIVE</span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-700">INACTIVE</span>
                      )}
                    </div>
                    <p className="text-sm text-[#525252]">{client?.company_name || 'Unknown Client'}</p>
                  </div>
                  <button
                    onClick={() => openEditModal(contract)}
                    className="p-2 text-[#525252] hover:text-[#0047FF] hover:bg-[#F5F5F5] transition-colors duration-150"
                    data-testid={`edit-contract-${contract.id}`}
                  >
                    <PencilSimple size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-1">Pricing</p>
                    <p className="text-sm font-semibold text-[#0047FF]">{formatContractSummary(contract)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-1">Billing Cycle</p>
                    <p className="text-sm font-semibold">{contract.billing_cycle}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-1">Start Date</p>
                    <p className="text-sm">{new Date(contract.start_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-1">End Date</p>
                    <p className="text-sm">{new Date(contract.end_date).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Extra details based on type */}
                {contract.contract_type === 'PACKAGE' && (
                  <div className="pt-4 border-t border-[#E5E5E5]">
                    <p className="text-xs text-[#525252]">
                      Extra Hour: ₹{contract.extra_hour_rate}/hr | Extra KM: ₹{contract.extra_km_rate}/km
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">
              {editingContract ? 'Edit Contract' : 'Create New Contract'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {/* Client & Name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                  Client
                </label>
                <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value })}>
                  <SelectTrigger data-testid="contract-client-select">
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
                  Contract Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] text-sm"
                  required
                  placeholder="e.g., 2025 Annual Contract"
                  data-testid="contract-name-input"
                />
              </div>
            </div>

            {/* Contract Type & Billing */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                  Contract Type
                </label>
                <Select value={formData.contract_type} onValueChange={(value) => setFormData({ ...formData, contract_type: value })}>
                  <SelectTrigger data-testid="contract-type-select">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTRACT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <span className="font-semibold">{type.label}</span>
                        <span className="text-xs text-[#525252] ml-2">({type.description})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                  Billing Cycle
                </label>
                <Select value={formData.billing_cycle} onValueChange={(value) => setFormData({ ...formData, billing_cycle: value })}>
                  <SelectTrigger data-testid="billing-cycle-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BILLING_CYCLES.map(cycle => (
                      <SelectItem key={cycle.value} value={cycle.value}>{cycle.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] text-sm"
                  required
                  data-testid="start-date-input"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] text-sm"
                  required
                  data-testid="end-date-input"
                />
              </div>
            </div>

            {/* Type-specific pricing fields */}
            {formData.contract_type === 'FIXED_MONTHLY' && (
              <div className="p-4 bg-[#FAFAFA] border border-[#E5E5E5] space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#525252]">Fixed Monthly Pricing</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-[#525252] mb-1 block">Monthly Amount (₹)</label>
                    <input
                      type="number"
                      value={formData.monthly_amount}
                      onChange={(e) => setFormData({ ...formData, monthly_amount: e.target.value })}
                      className="w-full px-3 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] text-sm"
                      required
                      data-testid="monthly-amount-input"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#525252] mb-1 block">Included Days</label>
                    <input
                      type="number"
                      value={formData.included_days}
                      onChange={(e) => setFormData({ ...formData, included_days: e.target.value })}
                      className="w-full px-3 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] text-sm"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#525252] mb-1 block">Included KM</label>
                    <input
                      type="number"
                      value={formData.included_km}
                      onChange={(e) => setFormData({ ...formData, included_km: e.target.value })}
                      className="w-full px-3 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] text-sm"
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </div>
            )}

            {formData.contract_type === 'PER_KM' && (
              <div className="p-4 bg-[#FAFAFA] border border-[#E5E5E5] space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#525252]">Per KM Pricing</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-[#525252] mb-1 block">Rate per KM (₹)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.rate_per_km}
                      onChange={(e) => setFormData({ ...formData, rate_per_km: e.target.value })}
                      className="w-full px-3 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] text-sm"
                      required
                      data-testid="rate-per-km-input"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#525252] mb-1 block">Minimum KM/Day</label>
                    <input
                      type="number"
                      value={formData.minimum_km_per_day}
                      onChange={(e) => setFormData({ ...formData, minimum_km_per_day: e.target.value })}
                      className="w-full px-3 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] text-sm"
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </div>
            )}

            {formData.contract_type === 'PER_DAY' && (
              <div className="p-4 bg-[#FAFAFA] border border-[#E5E5E5] space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#525252]">Per Day Pricing</p>
                <div>
                  <label className="text-xs text-[#525252] mb-1 block">Daily Rate (₹)</label>
                  <input
                    type="number"
                    value={formData.daily_rate}
                    onChange={(e) => setFormData({ ...formData, daily_rate: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] text-sm"
                    required
                    data-testid="daily-rate-input"
                  />
                </div>
              </div>
            )}

            {formData.contract_type === 'PACKAGE' && (
              <div className="p-4 bg-[#FAFAFA] border border-[#E5E5E5] space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#525252]">Package Pricing</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-[#525252] mb-1 block">Package Hours</label>
                    <input
                      type="number"
                      value={formData.package_hours}
                      onChange={(e) => setFormData({ ...formData, package_hours: e.target.value })}
                      className="w-full px-3 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] text-sm"
                      required
                      placeholder="e.g., 8"
                      data-testid="package-hours-input"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#525252] mb-1 block">Package KM</label>
                    <input
                      type="number"
                      value={formData.package_km}
                      onChange={(e) => setFormData({ ...formData, package_km: e.target.value })}
                      className="w-full px-3 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] text-sm"
                      required
                      placeholder="e.g., 80"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#525252] mb-1 block">Package Rate (₹)</label>
                    <input
                      type="number"
                      value={formData.package_rate}
                      onChange={(e) => setFormData({ ...formData, package_rate: e.target.value })}
                      className="w-full px-3 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] text-sm"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-[#525252] mb-1 block">Extra Hour Rate (₹/hr)</label>
                    <input
                      type="number"
                      value={formData.extra_hour_rate}
                      onChange={(e) => setFormData({ ...formData, extra_hour_rate: e.target.value })}
                      className="w-full px-3 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#525252] mb-1 block">Extra KM Rate (₹/km)</label>
                    <input
                      type="number"
                      value={formData.extra_km_rate}
                      onChange={(e) => setFormData({ ...formData, extra_km_rate: e.target.value })}
                      className="w-full px-3 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] text-sm"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {formData.contract_type === 'HYBRID' && (
              <div className="p-4 bg-[#FAFAFA] border border-[#E5E5E5] space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#525252]">Hybrid Pricing (Base + Usage)</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-[#525252] mb-1 block">Base Monthly Amount (₹)</label>
                    <input
                      type="number"
                      value={formData.base_monthly_amount}
                      onChange={(e) => setFormData({ ...formData, base_monthly_amount: e.target.value })}
                      className="w-full px-3 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] text-sm"
                      required
                      data-testid="base-monthly-input"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#525252] mb-1 block">Usage Rate per KM (₹)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.usage_rate_per_km}
                      onChange={(e) => setFormData({ ...formData, usage_rate_per_km: e.target.value })}
                      className="w-full px-3 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] text-sm"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

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
                data-testid="save-contract-button"
              >
                {editingContract ? 'Update Contract' : 'Create Contract'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContractManagement;
