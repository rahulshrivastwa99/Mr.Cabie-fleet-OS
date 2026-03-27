import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, Gear } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ServicesManagement = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    service_type: 'AIRPORT_TRANSFER',
    description: ''
  });

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await axios.get(`${API_BASE}/services`);
      setServices(response.data);
    } catch (error) {
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/services`, formData);
      toast.success('Service created successfully');
      setShowModal(false);
      setFormData({ name: '', service_type: 'AIRPORT_TRANSFER', description: '' });
      fetchServices();
    } catch (error) {
      toast.error('Failed to create service');
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#0047FF] border-t-transparent rounded-sm animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-[#525252]">Loading services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="services-page">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Services Management</h1>
          <p className="text-xs text-[#525252] uppercase tracking-widest mt-2">Configure Service Types</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-[#0047FF] text-white px-6 py-3 font-semibold text-sm hover:bg-[#003BCC] transition-colors duration-150"
          data-testid="add-service-button"
        >
          <Plus size={20} weight="bold" />
          Add Service
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service) => (
          <div key={service.id} className="bg-white border border-[#E5E5E5] p-6 hover:shadow-sm transition-all duration-150">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 bg-[#E6EFFF] flex items-center justify-center">
                <Gear size={24} weight="bold" className="text-[#0047FF]" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">{service.name}</h3>
                <span className="text-xs px-2 py-1 bg-[#E5E5E5] text-[#525252] font-semibold uppercase tracking-wider">
                  {service.service_type}
                </span>
              </div>
            </div>
            {service.description && (
              <p className="text-sm text-[#525252] mb-4">{service.description}</p>
            )}
            <div className="flex items-center gap-2 pt-4 border-t border-[#E5E5E5]">
              <span className={`text-xs px-2 py-1 font-semibold ${
                service.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'
              }`}>
                {service.is_active ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Add New Service</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                Service Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                required
                placeholder="e.g., Airport Transfer"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                Service Type
              </label>
              <Select value={formData.service_type} onValueChange={(value) => setFormData({ ...formData, service_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AIRPORT_TRANSFER">Airport Transfer</SelectItem>
                  <SelectItem value="LOCAL_DUTY">Local Duty</SelectItem>
                  <SelectItem value="OUTSTATION">Outstation</SelectItem>
                  <SelectItem value="EMPLOYEE_TRANSPORT">Employee Transport</SelectItem>
                  <SelectItem value="CUSTOM">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                rows="3"
                placeholder="Brief description of the service"
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
              >
                Create Service
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServicesManagement;