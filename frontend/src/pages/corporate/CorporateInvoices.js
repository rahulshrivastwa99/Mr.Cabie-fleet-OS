import React, { useState, useEffect } from 'react';
import { corporateAxios } from '../../context/CorporateAuthContext';
import { toast } from 'sonner';
import { Receipt, Download, FileText } from '@phosphor-icons/react';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api/corporate`;

const CorporateInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await corporateAxios.get(`${API_BASE}/invoices`);
      setInvoices(response.data);
    } catch (error) {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    const classes = {
      DRAFT: 'bg-[#E5E5E5] text-[#525252]',
      SENT: 'bg-[#E6EFFF] text-[#0047FF]',
      PAID: 'bg-[#E0F7E9] text-[#00C853]',
      OVERDUE: 'bg-[#FFE5E5] text-[#E00000]',
      CANCELLED: 'bg-[#F5F5F5] text-[#525252]'
    };
    return `px-3 py-1 text-xs font-semibold uppercase tracking-wider ${classes[status]}`;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#0047FF] border-t-transparent rounded-sm animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-[#525252]">Loading invoices...</p>
        </div>
      </div>
    );
  }

  const totalAmount = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
  const paidAmount = invoices.filter(inv => inv.status === 'PAID').reduce((sum, inv) => sum + inv.total_amount, 0);
  const pendingAmount = totalAmount - paidAmount;

  return (
    <div className="p-6" data-testid="corporate-invoices-page">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Invoices & Billing</h1>
        <p className="text-xs text-[#525252] uppercase tracking-widest mt-2">Payment History</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-[#E5E5E5] p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-2">Total Billed</p>
          <p className="text-3xl font-bold tracking-tight">₹{totalAmount.toLocaleString('en-IN')}</p>
          <p className="text-xs text-[#525252] mt-2">{invoices.length} invoices</p>
        </div>
        <div className="bg-green-50 border border-[#00C853] p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-2">Paid</p>
          <p className="text-3xl font-bold tracking-tight text-[#00C853]">₹{paidAmount.toLocaleString('en-IN')}</p>
          <p className="text-xs text-[#525252] mt-2">{invoices.filter(i => i.status === 'PAID').length} paid</p>
        </div>
        <div className="bg-yellow-50 border border-[#FFB300] p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-2">Pending</p>
          <p className="text-3xl font-bold tracking-tight text-[#FFB300]">₹{pendingAmount.toLocaleString('en-IN')}</p>
          <p className="text-xs text-[#525252] mt-2">{invoices.filter(i => i.status !== 'PAID').length} pending</p>
        </div>
      </div>

      <div className="bg-white border border-[#E5E5E5]">
        <table className="w-full">
          <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5]">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Invoice #</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Date</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Amount</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">GST</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Total</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Due Date</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Status</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-12">
                  <Receipt size={48} className="mx-auto mb-4 text-[#E5E5E5]" />
                  <p className="text-sm text-[#525252]">No invoices found</p>
                </td>
              </tr>
            ) : (
              invoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-[#E5E5E5] hover:bg-[#FAFAFA] transition-colors duration-150">
                  <td className="px-6 py-4 text-sm font-semibold">{invoice.invoice_number}</td>
                  <td className="px-6 py-4 text-sm">{new Date(invoice.invoice_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm">₹{invoice.amount.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4 text-sm">₹{invoice.gst_amount.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4 text-sm font-semibold">₹{invoice.total_amount.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4 text-sm">{new Date(invoice.due_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <span className={getStatusBadgeClass(invoice.status)}>{invoice.status}</span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      className="p-2 hover:bg-[#E5E5E5] transition-colors duration-150"
                      onClick={() => toast.info('Download feature coming soon')}
                    >
                      <Download size={18} weight="regular" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CorporateInvoices;