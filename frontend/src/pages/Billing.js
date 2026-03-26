import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, Receipt } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Billing = () => {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [duties, setDuties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDuties, setSelectedDuties] = useState([]);
  const [formData, setFormData] = useState({
    client_id: '',
    amount: 0,
    gst_percentage: 18,
    due_days: 30
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [invoicesRes, clientsRes, dutiesRes] = await Promise.all([
        axios.get(`${API_BASE}/invoices`),
        axios.get(`${API_BASE}/clients`),
        axios.get(`${API_BASE}/duties`)
      ]);
      setInvoices(invoicesRes.data);
      setClients(clientsRes.data);
      // Only show completed duties that aren't billed yet
      const completedDuties = dutiesRes.data.filter(d => d.status === 'COMPLETED');
      setDuties(completedDuties);
    } catch (error) {
      toast.error('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const handleClientChange = (clientId) => {
    setFormData({ ...formData, client_id: clientId });
    // Filter duties by selected client
    setSelectedDuties([]);
  };

  const toggleDutySelection = (dutyId) => {
    setSelectedDuties(prev => 
      prev.includes(dutyId) ? prev.filter(id => id !== dutyId) : [...prev, dutyId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedDuties.length === 0) {
      toast.error('Please select at least one duty');
      return;
    }
    try {
      await axios.post(`${API_BASE}/invoices`, {
        ...formData,
        duties: selectedDuties
      });
      toast.success('Invoice generated successfully');
      setShowModal(false);
      setFormData({ client_id: '', amount: 0, gst_percentage: 18, due_days: 30 });
      setSelectedDuties([]);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate invoice');
    }
  };

  const getStatusBadgeClass = (status) => {
    const classes = {
      DRAFT: 'status-created',
      SENT: 'status-assigned',
      PAID: 'status-started',
      OVERDUE: 'status-billed',
      CANCELLED: 'status-created'
    };
    return `status-badge ${classes[status]}`;
  };

  const clientDuties = duties.filter(d => d.client_id === formData.client_id);

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
          <p className="text-xs text-[#525252] uppercase tracking-widest mt-2">Invoice Management</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-[#0047FF] text-white px-6 py-3 font-semibold text-sm hover:bg-[#003BCC] transition-colors duration-150"
          data-testid="generate-invoice-button"
        >
          <Plus size={20} weight="bold" />
          Generate Invoice
        </button>
      </div>

      <div className="bg-white border border-[#E5E5E5]">
        <table className="w-full">
          <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5]">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Invoice #</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Client</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Amount</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Total</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Date</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-12">
                  <Receipt size={48} className="mx-auto mb-4 text-[#E5E5E5]" />
                  <p className="text-sm text-[#525252]">No invoices found. Generate your first invoice.</p>
                </td>
              </tr>
            ) : (
              invoices.map(invoice => {
                const client = clients.find(c => c.id === invoice.client_id);
                return (
                  <tr key={invoice.id} className="border-b border-[#E5E5E5] hover:bg-[#FAFAFA] transition-colors duration-150">
                    <td className="px-6 py-4 text-sm font-semibold">{invoice.invoice_number}</td>
                    <td className="px-6 py-4 text-sm">{client?.company_name || 'Unknown'}</td>
                    <td className="px-6 py-4 text-sm">₹{invoice.amount.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-sm font-semibold">₹{invoice.total_amount.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-sm">{new Date(invoice.invoice_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className={getStatusBadgeClass(invoice.status)}>{invoice.status}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Generate Invoice</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                Client
              </label>
              <Select value={formData.client_id} onValueChange={handleClientChange}>
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

            {formData.client_id && clientDuties.length > 0 && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                  Select Completed Duties
                </label>
                <div className="border border-[#E5E5E5] max-h-48 overflow-y-auto">
                  {clientDuties.map(duty => (
                    <label
                      key={duty.id}
                      className="flex items-center gap-3 p-3 border-b border-[#E5E5E5] hover:bg-[#FAFAFA] cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDuties.includes(duty.id)}
                        onChange={() => toggleDutySelection(duty.id)}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{duty.passenger_name}</p>
                        <p className="text-xs text-[#525252]">
                          {duty.pickup_location} → {duty.dropoff_location}
                        </p>
                        <p className="text-xs text-[#525252]">{new Date(duty.pickup_time).toLocaleDateString()}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                  Base Amount (₹)
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                  required
                  data-testid="invoice-amount-input"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                  GST %
                </label>
                <input
                  type="number"
                  value={formData.gst_percentage}
                  onChange={(e) => setFormData({ ...formData, gst_percentage: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                  required
                  data-testid="gst-input"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                Payment Due (Days)
              </label>
              <input
                type="number"
                value={formData.due_days}
                onChange={(e) => setFormData({ ...formData, due_days: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                required
                data-testid="due-days-input"
              />
            </div>

            {formData.amount > 0 && (
              <div className="bg-[#FAFAFA] border border-[#E5E5E5] p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-sm">Base Amount:</span>
                  <span className="text-sm font-semibold">₹{formData.amount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">GST ({formData.gst_percentage}%):</span>
                  <span className="text-sm font-semibold">₹{(formData.amount * formData.gst_percentage / 100).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#E5E5E5]">
                  <span className="text-sm font-bold">Total Amount:</span>
                  <span className="text-sm font-bold">₹{(formData.amount + (formData.amount * formData.gst_percentage / 100)).toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-[#E5E5E5] text-sm font-medium hover:bg-[#F5F5F5] transition-colors duration-150"
                data-testid="cancel-invoice-button"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-[#0047FF] text-white text-sm font-semibold hover:bg-[#003BCC] transition-colors duration-150"
                data-testid="save-invoice-button"
              >
                Generate Invoice
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Billing;