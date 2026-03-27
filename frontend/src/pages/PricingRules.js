import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, CurrencyDollar } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PricingRules = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    pricing_type: 'PER_KM',
    vehicle_type: 'SEDAN',
    // Per KM fields
    rate_per_km: '',
    minimum_km: '',
    extra_km_charge: '',
    // Time-Based fields
    package_hours: '',
    package_km: '',
    base_fare: '',
    extra_hour_charge: '',
    extra_km_charge_package: '',
    // Route-Based fields
    route_from: '',
    route_to: '',
    one_way_price: '',
    round_trip_price: '',
    // Daily Rental fields
    daily_rate: '',
    included_km: '',
    included_hours: ''
  });

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const response = await axios.get(`${API_BASE}/pricing-rules`);
      setRules(response.data);
    } catch (error) {
      toast.error('Failed to load pricing rules');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Clean up empty fields
      const cleanData = Object.fromEntries(
        Object.entries(formData).filter(([_, v]) => v !== '' && v !== null)
      );
      
      await axios.post(`${API_BASE}/pricing-rules`, cleanData);
      toast.success('Pricing rule created successfully');
      setShowModal(false);
      resetForm();
      fetchRules();
    } catch (error) {
      toast.error('Failed to create pricing rule');
    }
  };

  const resetForm = () => {
    setFormData({
      pricing_type: 'PER_KM',
      vehicle_type: 'SEDAN',
      rate_per_km: '',
      minimum_km: '',
      extra_km_charge: '',
      package_hours: '',
      package_km: '',
      base_fare: '',
      extra_hour_charge: '',
      extra_km_charge_package: '',
      route_from: '',
      route_to: '',
      one_way_price: '',
      round_trip_price: '',
      daily_rate: '',
      included_km: '',
      included_hours: ''
    });
  };

  const getRuleDisplay = (rule) => {
    switch (rule.pricing_type) {
      case 'PER_KM':
        return `₹${rule.rate_per_km}/km (Min: ${rule.minimum_km}km)`;
      case 'TIME_BASED':
        return `${rule.package_hours}hr/${rule.package_km}km @ ₹${rule.base_fare}`;
      case 'ROUTE_BASED':
        return `${rule.route_from} → ${rule.route_to}`;
      case 'DAILY_RENTAL':
        return `₹${rule.daily_rate}/day (${rule.included_km}km, ${rule.included_hours}hr)`;
      default:
        return 'Custom';
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#0047FF] border-t-transparent rounded-sm animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-[#525252]">Loading pricing rules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Pricing Rules</h1>
          <p className="text-xs text-[#525252] uppercase tracking-widest mt-2">Configure Pricing Logic</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-[#0047FF] text-white px-6 py-3 font-semibold text-sm hover:bg-[#003BCC] transition-colors duration-150"
        >
          <Plus size={20} weight="bold" />
          Add Pricing Rule
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {rules.map((rule) => (
          <div key={rule.id} className="bg-white border border-[#E5E5E5] p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 bg-yellow-50 flex items-center justify-center">
                <CurrencyDollar size={24} weight="bold" className="text-yellow-700" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-1 bg-[#E6EFFF] text-[#0047FF] font-semibold uppercase tracking-wider">
                    {rule.pricing_type.replace('_', ' ')}
                  </span>
                  <span className="text-xs px-2 py-1 bg-[#E5E5E5] text-[#525252] font-semibold uppercase tracking-wider">
                    {rule.vehicle_type}
                  </span>
                </div>
                <p className="text-sm font-semibold">{getRuleDisplay(rule)}</p>
              </div>
            </div>
            
            <div className="pt-4 border-t border-[#E5E5E5] space-y-2">
              {rule.pricing_type === 'PER_KM' && rule.extra_km_charge && (
                <p className="text-xs text-[#525252]">Extra KM: ₹{rule.extra_km_charge}/km</p>
              )}
              {rule.pricing_type === 'TIME_BASED' && (
                <>
                  {rule.extra_hour_charge && <p className="text-xs text-[#525252]">Extra Hour: ₹{rule.extra_hour_charge}</p>}
                  {rule.extra_km_charge_package && <p className="text-xs text-[#525252]">Extra KM: ₹{rule.extra_km_charge_package}/km</p>}
                </>
              )}
              {rule.pricing_type === 'ROUTE_BASED' && (
                <>
                  <p className="text-xs text-[#525252]">One Way: ₹{rule.one_way_price}</p>
                  {rule.round_trip_price && <p className="text-xs text-[#525252]">Round Trip: ₹{rule.round_trip_price}</p>}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Add Pricing Rule</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                  Pricing Type
                </label>
                <Select value={formData.pricing_type} onValueChange={(value) => setFormData({ ...formData, pricing_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PER_KM">Per KM</SelectItem>
                    <SelectItem value="TIME_BASED">Time-Based Package</SelectItem>
                    <SelectItem value="ROUTE_BASED">Route-Based</SelectItem>
                    <SelectItem value="DAILY_RENTAL">Daily Rental</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                  Vehicle Type
                </label>
                <Select value={formData.vehicle_type} onValueChange={(value) => setFormData({ ...formData, vehicle_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SEDAN">Sedan</SelectItem>
                    <SelectItem value="SUV">SUV</SelectItem>
                    <SelectItem value="HATCHBACK">Hatchback</SelectItem>
                    <SelectItem value="EV">Electric Vehicle</SelectItem>
                    <SelectItem value="LUXURY">Luxury</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Per KM Pricing */}
            {formData.pricing_type === 'PER_KM' && (
              <div className="space-y-4 p-4 bg-[#F5F5F5] border border-[#E5E5E5]">
                <h3 className="text-sm font-semibold">Per KM Pricing</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                      Rate per KM (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.rate_per_km}
                      onChange={(e) => setFormData({ ...formData, rate_per_km: e.target.value })}
                      className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                      Minimum KM
                    </label>
                    <input
                      type="number"
                      value={formData.minimum_km}
                      onChange={(e) => setFormData({ ...formData, minimum_km: e.target.value })}
                      className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                      Extra KM Charge (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.extra_km_charge}
                      onChange={(e) => setFormData({ ...formData, extra_km_charge: e.target.value })}
                      className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Time-Based Package */}
            {formData.pricing_type === 'TIME_BASED' && (
              <div className="space-y-4 p-4 bg-[#F5F5F5] border border-[#E5E5E5]">
                <h3 className="text-sm font-semibold">Time-Based Package</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                      Package Hours
                    </label>
                    <input
                      type="number"
                      value={formData.package_hours}
                      onChange={(e) => setFormData({ ...formData, package_hours: e.target.value })}
                      className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                      Package KM
                    </label>
                    <input
                      type="number"
                      value={formData.package_km}
                      onChange={(e) => setFormData({ ...formData, package_km: e.target.value })}
                      className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                      Base Fare (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.base_fare}
                      onChange={(e) => setFormData({ ...formData, base_fare: e.target.value })}
                      className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                      Extra Hour Charge (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.extra_hour_charge}
                      onChange={(e) => setFormData({ ...formData, extra_hour_charge: e.target.value })}
                      className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                      Extra KM Charge (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.extra_km_charge_package}
                      onChange={(e) => setFormData({ ...formData, extra_km_charge_package: e.target.value })}
                      className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Route-Based Pricing */}
            {formData.pricing_type === 'ROUTE_BASED' && (
              <div className="space-y-4 p-4 bg-[#F5F5F5] border border-[#E5E5E5]">
                <h3 className="text-sm font-semibold">Route-Based Pricing</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                      Route From
                    </label>
                    <input
                      type="text"
                      value={formData.route_from}
                      onChange={(e) => setFormData({ ...formData, route_from: e.target.value })}
                      className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] text-sm"
                      required
                      placeholder="e.g., Delhi"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                      Route To
                    </label>
                    <input
                      type="text"
                      value={formData.route_to}
                      onChange={(e) => setFormData({ ...formData, route_to: e.target.value })}
                      className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] text-sm"
                      required
                      placeholder="e.g., Gurugram"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                      One Way Price (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.one_way_price}
                      onChange={(e) => setFormData({ ...formData, one_way_price: e.target.value })}
                      className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                      Round Trip Price (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.round_trip_price}
                      onChange={(e) => setFormData({ ...formData, round_trip_price: e.target.value })}
                      className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Daily Rental */}
            {formData.pricing_type === 'DAILY_RENTAL' && (
              <div className="space-y-4 p-4 bg-[#F5F5F5] border border-[#E5E5E5]">
                <h3 className="text-sm font-semibold">Daily Rental Pricing</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                      Daily Rate (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.daily_rate}
                      onChange={(e) => setFormData({ ...formData, daily_rate: e.target.value })}
                      className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                      Included KM
                    </label>
                    <input
                      type="number"
                      value={formData.included_km}
                      onChange={(e) => setFormData({ ...formData, included_km: e.target.value })}
                      className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                      Included Hours
                    </label>
                    <input
                      type="number"
                      value={formData.included_hours}
                      onChange={(e) => setFormData({ ...formData, included_hours: e.target.value })}
                      className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] text-sm"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="flex-1 px-4 py-2 border border-[#E5E5E5] text-sm font-medium hover:bg-[#F5F5F5] transition-colors duration-150"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-[#0047FF] text-white text-sm font-semibold hover:bg-[#003BCC] transition-colors duration-150"
              >
                Create Rule
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PricingRules;
