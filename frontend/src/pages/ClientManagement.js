import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, Building, UserPlus, Users, Trash, Copy } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CORPORATE_ROLES = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'HR', label: 'HR Manager' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'VIEWER', label: 'Viewer' }
];

const ClientManagement = () => {
  const [clients, setClients] = useState([]);
  const [corporateUsers, setCorporateUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [newCredentials, setNewCredentials] = useState(null);
  const [formData, setFormData] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    gstin: ''
  });
  const [userFormData, setUserFormData] = useState({
    email: '',
    password: '',
    name: '',
    display_name: '',
    role: 'VIEWER',
    department: ''
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const [clientsRes, usersRes] = await Promise.all([
        axios.get(`${API_BASE}/clients`),
        axios.get(`${API_BASE}/admin/corporate-users`)
      ]);
      setClients(clientsRes.data);
      setCorporateUsers(usersRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/clients`, formData);
      toast.success('Client added successfully');
      setShowModal(false);
      setFormData({
        company_name: '',
        contact_person: '',
        email: '',
        phone: '',
        gstin: ''
      });
      fetchClients();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add client');
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#0047FF] border-t-transparent rounded-sm animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-[#525252]">Loading clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="clients-page">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" data-testid="clients-title">Client Management</h1>
          <p className="text-xs text-[#525252] uppercase tracking-widest mt-2">Corporate Accounts</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-[#0047FF] text-white px-6 py-3 font-semibold text-sm hover:bg-[#003BCC] transition-colors duration-150"
          data-testid="add-client-button"
        >
          <Plus size={20} weight="bold" />
          Add Client
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.length === 0 ? (
          <div className="col-span-full bg-white border border-[#E5E5E5] p-12 text-center">
            <Building size={48} className="mx-auto mb-4 text-[#E5E5E5]" />
            <p className="text-sm text-[#525252]">No clients found. Add your first client.</p>
          </div>
        ) : (
          clients.map(client => (
            <div
              key={client.id}
              className="bg-white border border-[#E5E5E5] p-6 hover:border-[#525252] transition-colors duration-150"
              data-testid={`client-card-${client.id}`}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-[#E5E5E5] flex items-center justify-center">
                  <Building size={24} weight="regular" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1">{client.company_name}</h3>
                  <p className="text-xs text-[#525252] uppercase tracking-wider">Corporate Account</p>
                </div>
              </div>
              
              <div className="space-y-3 border-t border-[#E5E5E5] pt-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-1">Contact Person</p>
                  <p className="text-sm">{client.contact_person}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-1">Email</p>
                  <p className="text-sm">{client.email}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-1">Phone</p>
                  <p className="text-sm">{client.phone}</p>
                </div>
                {client.gstin && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-1">GSTIN</p>
                    <p className="text-sm">{client.gstin}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Add New Client</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                Company Name
              </label>
              <input
                type="text"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                required
                data-testid="company-name-input"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                Contact Person
              </label>
              <input
                type="text"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                required
                data-testid="contact-person-input"
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
                data-testid="client-email-input"
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
                data-testid="client-phone-input"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                GSTIN (Optional)
              </label>
              <input
                type="text"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                data-testid="gstin-input"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-[#E5E5E5] text-sm font-medium hover:bg-[#F5F5F5] transition-colors duration-150"
                data-testid="cancel-client-button"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-[#0047FF] text-white text-sm font-semibold hover:bg-[#003BCC] transition-colors duration-150"
                data-testid="save-client-button"
              >
                Add Client
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientManagement;