import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, CreditCard } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

const RateCards = () => {
  const [rateCards, setRateCards] = useState([]);
  const [clients, setClients] = useState([]);
  const [pricingRules, setPricingRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    client_id: '',
    name: '',
    pricing_rules: [],
    additional_charges: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [rateCardsRes, clientsRes, rulesRes] = await Promise.all([
        axios.get(`${API_BASE}/rate-cards`),
        axios.get(`${API_BASE}/clients`),
        axios.get(`${API_BASE}/pricing-rules`)
      ]);
      setRateCards(rateCardsRes.data);
      setClients(clientsRes.data);
      setPricingRules(rulesRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/rate-cards`, formData);
      toast.success('Rate card created successfully');
      setShowModal(false);
      setFormData({ client_id: '', name: '', pricing_rules: [], additional_charges: [] });
      fetchData();
    } catch (error) {
      toast.error('Failed to create rate card');
    }
  };

  const togglePricingRule = (ruleId) => {
    setFormData(prev => ({
      ...prev,
      pricing_rules: prev.pricing_rules.includes(ruleId)
        ? prev.pricing_rules.filter(id => id !== ruleId)
        : [...prev.pricing_rules, ruleId]
    }));
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#0047FF] border-t-transparent rounded-sm animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-[#525252]">Loading rate cards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Rate Cards</h1>
          <p className="text-xs text-[#525252] uppercase tracking-widest mt-2">Client-Specific Pricing</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-[#0047FF] text-white px-6 py-3 font-semibold text-sm hover:bg-[#003BCC] transition-colors duration-150"
        >
          <Plus size={20} weight="bold" />
          Create Rate Card
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {rateCards.map((card) => {
          const client = clients.find(c => c.id === card.client_id);
          return (
            <div key={card.id} className="bg-white border border-[#E5E5E5] p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 bg-green-50 flex items-center justify-center">
                  <CreditCard size={24} weight="bold" className="text-green-700" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1">{card.name}</h3>
                  <p className="text-sm text-[#525252]">{client?.company_name || 'Unknown Client'}</p>
                </div>
                <span className={`text-xs px-2 py-1 font-semibold ${
                  card.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'
                }`}>
                  {card.is_active ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
              <div className="pt-4 border-t border-[#E5E5E5]">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2">Pricing Rules</p>
                <p className="text-sm">{card.pricing_rules?.length || 0} rules configured</p>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Create Rate Card</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                Client
              </label>
              <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value })}>
                <SelectTrigger>
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
                Rate Card Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] text-sm"
                required
                placeholder="e.g., Standard 2026 Rates"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                Select Pricing Rules
              </label>
              <div className="border border-[#E5E5E5] max-h-64 overflow-y-auto">
                {pricingRules.map(rule => (
                  <label
                    key={rule.id}
                    className="flex items-center gap-3 p-3 border-b border-[#E5E5E5] hover:bg-[#FAFAFA] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.pricing_rules.includes(rule.id)}
                      onChange={() => togglePricingRule(rule.id)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-2 py-1 bg-[#E6EFFF] text-[#0047FF] font-semibold">
                          {rule.pricing_type.replace('_', ' ')}
                        </span>
                        <span className="text-xs px-2 py-1 bg-[#E5E5E5] text-[#525252] font-semibold">
                          {rule.vehicle_type}
                        </span>
                      </div>
                      <p className="text-xs text-[#525252]">
                        {rule.pricing_type === 'PER_KM' && `₹${rule.rate_per_km}/km`}
                        {rule.pricing_type === 'TIME_BASED' && `${rule.package_hours}hr/${rule.package_km}km`}
                        {rule.pricing_type === 'ROUTE_BASED' && `${rule.route_from} → ${rule.route_to}`}
                        {rule.pricing_type === 'DAILY_RENTAL' && `₹${rule.daily_rate}/day`}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
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
              >
                Create Rate Card
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RateCards;
