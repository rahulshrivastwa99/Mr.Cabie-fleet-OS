import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, Building, UserPlus, Users, Trash, Copy, Eye, EyeSlash } from '@phosphor-icons/react';
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
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('clients'); // 'clients' or 'users'
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
    department: '',
    client_id: ''
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

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_BASE}/admin/onboard-corporate-user`, userFormData);
      toast.success('Corporate user created successfully');
      setNewCredentials({
        email: userFormData.email,
        password: userFormData.password,
        name: userFormData.name,
        display_name: userFormData.display_name
      });
      setShowUserModal(false);
      setShowCredentialsModal(true);
      setUserFormData({
        email: '',
        password: '',
        name: '',
        display_name: '',
        role: 'VIEWER',
        department: '',
        client_id: ''
      });
      fetchClients();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create corporate user');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await axios.delete(`${API_BASE}/admin/corporate-users/${userId}`);
      toast.success('User deleted successfully');
      fetchClients();
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setUserFormData({ ...userFormData, password });
  };

  const openUserModal = (client = null) => {
    setSelectedClient(client);
    setUserFormData({
      ...userFormData,
      client_id: client?.id || ''
    });
    setShowUserModal(true);
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
          <p className="text-xs text-[#525252] uppercase tracking-widest mt-2">Corporate Accounts & Users</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => openUserModal()}
            className="flex items-center gap-2 border-2 border-[#0047FF] text-[#0047FF] px-6 py-3 font-semibold text-sm hover:bg-[#E6EFFF] transition-colors duration-150"
            data-testid="add-corporate-user-button"
          >
            <UserPlus size={20} weight="bold" />
            Add Corporate User
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-[#0047FF] text-white px-6 py-3 font-semibold text-sm hover:bg-[#003BCC] transition-colors duration-150"
            data-testid="add-client-button"
          >
            <Plus size={20} weight="bold" />
            Add Client
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-[#E5E5E5]">
        <button
          onClick={() => setActiveTab('clients')}
          className={`pb-3 px-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'clients' 
              ? 'border-[#0047FF] text-[#0047FF]' 
              : 'border-transparent text-[#525252] hover:text-[#0A0A0A]'
          }`}
          data-testid="tab-clients"
        >
          <div className="flex items-center gap-2">
            <Building size={18} />
            Clients ({clients.length})
          </div>
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 px-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'users' 
              ? 'border-[#0047FF] text-[#0047FF]' 
              : 'border-transparent text-[#525252] hover:text-[#0A0A0A]'
          }`}
          data-testid="tab-users"
        >
          <div className="flex items-center gap-2">
            <Users size={18} />
            Corporate Users ({corporateUsers.length})
          </div>
        </button>
      </div>

      {/* Clients Tab */}
      {activeTab === 'clients' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.length === 0 ? (
            <div className="col-span-full bg-white border border-[#E5E5E5] p-12 text-center">
              <Building size={48} className="mx-auto mb-4 text-[#E5E5E5]" />
              <p className="text-sm text-[#525252]">No clients found. Add your first client.</p>
            </div>
          ) : (
            clients.map(client => {
              const clientUsers = corporateUsers.filter(u => u.client_id === client.id);
              return (
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

                  {/* Client Users Summary */}
                  <div className="mt-4 pt-4 border-t border-[#E5E5E5]">
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-semibold uppercase tracking-widest text-[#525252]">
                        Users: {clientUsers.length}
                      </p>
                      <button
                        onClick={() => openUserModal(client)}
                        className="text-xs text-[#0047FF] font-semibold hover:underline flex items-center gap-1"
                        data-testid={`add-user-for-${client.id}`}
                      >
                        <UserPlus size={14} />
                        Add User
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Corporate Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {corporateUsers.length === 0 ? (
            <div className="bg-white border border-[#E5E5E5] p-12 text-center">
              <Users size={48} className="mx-auto mb-4 text-[#E5E5E5]" />
              <p className="text-sm text-[#525252]">No corporate users found. Create your first user.</p>
            </div>
          ) : (
            <div className="bg-white border border-[#E5E5E5]">
              <table className="w-full">
                <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#525252]">User</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#525252]">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#525252]">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#525252]">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#525252]">Department</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#525252]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5]">
                  {corporateUsers.map(user => {
                    const client = clients.find(c => c.id === user.client_id);
                    return (
                      <tr key={user.id} className="hover:bg-[#FAFAFA]" data-testid={`user-row-${user.id}`}>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-semibold">{user.name}</p>
                            {user.display_name && (
                              <p className="text-xs text-[#525252]">Display: {user.display_name}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">{user.email}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-semibold ${
                            user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                            user.role === 'HR' ? 'bg-blue-100 text-blue-700' :
                            user.role === 'FINANCE' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">{client?.company_name || '-'}</td>
                        <td className="px-6 py-4 text-sm">{user.department || '-'}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-500 hover:text-red-700 p-2"
                            data-testid={`delete-user-${user.id}`}
                          >
                            <Trash size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

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

      {/* Create Corporate User Modal */}
      <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">
              {selectedClient ? `Add User for ${selectedClient.company_name}` : 'Create Corporate User'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUserSubmit} className="space-y-4 mt-4">
            {!selectedClient && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                  Client Company
                </label>
                <Select 
                  value={userFormData.client_id} 
                  onValueChange={(value) => setUserFormData({ ...userFormData, client_id: value })}
                >
                  <SelectTrigger data-testid="user-client-select">
                    <SelectValue placeholder="Select client company" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>{client.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                  Full Name
                </label>
                <input
                  type="text"
                  value={userFormData.name}
                  onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                  required
                  placeholder="John Doe"
                  data-testid="user-name-input"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                  Display Name
                </label>
                <input
                  type="text"
                  value={userFormData.display_name}
                  onChange={(e) => setUserFormData({ ...userFormData, display_name: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                  placeholder="John (Optional)"
                  data-testid="user-display-name-input"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                Email
              </label>
              <input
                type="email"
                value={userFormData.email}
                onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                required
                placeholder="john@company.com"
                data-testid="user-email-input"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                Password
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                    className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm pr-10"
                    required
                    placeholder="Enter password"
                    data-testid="user-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#525252] hover:text-[#0A0A0A]"
                  >
                    {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={generatePassword}
                  className="px-4 py-2 border border-[#E5E5E5] text-sm font-medium hover:bg-[#F5F5F5] transition-colors"
                  data-testid="generate-password-button"
                >
                  Generate
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                  Role
                </label>
                <Select 
                  value={userFormData.role} 
                  onValueChange={(value) => setUserFormData({ ...userFormData, role: value })}
                >
                  <SelectTrigger data-testid="user-role-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CORPORATE_ROLES.map(role => (
                      <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                  Department (Optional)
                </label>
                <input
                  type="text"
                  value={userFormData.department}
                  onChange={(e) => setUserFormData({ ...userFormData, department: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                  placeholder="Engineering"
                  data-testid="user-department-input"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowUserModal(false);
                  setSelectedClient(null);
                }}
                className="flex-1 px-4 py-2 border border-[#E5E5E5] text-sm font-medium hover:bg-[#F5F5F5] transition-colors duration-150"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-[#0047FF] text-white text-sm font-semibold hover:bg-[#003BCC] transition-colors duration-150"
                data-testid="save-user-button"
              >
                Create User
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Credentials Display Modal */}
      <Dialog open={showCredentialsModal} onOpenChange={setShowCredentialsModal}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight text-green-600">User Created Successfully</DialogTitle>
          </DialogHeader>
          {newCredentials && (
            <div className="mt-4 space-y-4">
              <div className="p-4 bg-green-50 border border-green-200">
                <p className="text-xs font-semibold uppercase tracking-wider text-green-700 mb-3">Login Credentials</p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#525252]">Email:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-semibold">{newCredentials.email}</span>
                      <button 
                        onClick={() => copyToClipboard(newCredentials.email)}
                        className="text-[#525252] hover:text-[#0047FF]"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#525252]">Password:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-semibold">{newCredentials.password}</span>
                      <button 
                        onClick={() => copyToClipboard(newCredentials.password)}
                        className="text-[#525252] hover:text-[#0047FF]"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-yellow-50 border border-yellow-200">
                <p className="text-xs text-yellow-700">
                  <strong>Important:</strong> Share these credentials securely with the user. They can change their password after logging in.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCredentialsModal(false);
                  setNewCredentials(null);
                }}
                className="w-full px-4 py-2 bg-[#0047FF] text-white text-sm font-semibold hover:bg-[#003BCC] transition-colors duration-150"
                data-testid="close-credentials-button"
              >
                Done
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientManagement;