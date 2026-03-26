import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, Users, Upload } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCorporateAuth } from '../../context/CorporateAuthContext';
import CSVUploader from '../../components/CSVUploader';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api/corporate`;

const CorporateEmployees = () => {
  const { user } = useCorporateAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    employee_id: '',
    department: '',
    cost_center: '',
    default_pickup: '',
    default_dropoff: ''
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await axios.get(`${API_BASE}/employees`);
      setEmployees(response.data);
    } catch (error) {
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/employees`, formData);
      toast.success('Employee added successfully');
      setShowModal(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        employee_id: '',
        department: '',
        cost_center: '',
        default_pickup: '',
        default_dropoff: ''
      });
      fetchEmployees();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add employee');
    }
  };

  const handleBulkUpload = async (csvData) => {
    try {
      const employeesData = csvData.map(row => ({
        employee_id: row.employee_id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        department: row.department || undefined,
        cost_center: row.cost_center || undefined,
        default_pickup: row.default_pickup || undefined,
        default_dropoff: row.default_dropoff || undefined
      }));

      const response = await axios.post(`${API_BASE}/employees/bulk-create`, employeesData);
      
      if (response.data.created > 0) {
        toast.success(`${response.data.created} employees added successfully`);
      }
      
      if (response.data.failed > 0) {
        toast.warning(`${response.data.failed} employees failed to upload`);
      }
      
      setShowBulkUpload(false);
      fetchEmployees();
    } catch (error) {
      toast.error('Bulk upload failed');
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#0047FF] border-t-transparent rounded-sm animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-[#525252]">Loading employees...</p>
        </div>
      </div>
    );
  }

  const canManage = user.role === 'ADMIN' || user.role === 'HR';

  return (
    <div className="p-6" data-testid="corporate-employees-page">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Employees</h1>
          <p className="text-xs text-[#525252] uppercase tracking-widest mt-2">Manage Team Members</p>
        </div>
        {canManage && (
          <div className="flex gap-3">
            <button
              onClick={() => setShowBulkUpload(true)}
              className="flex items-center gap-2 border-2 border-[#0047FF] text-[#0047FF] px-6 py-3 font-semibold text-sm hover:bg-[#E6EFFF] transition-colors duration-150"
              data-testid="bulk-upload-button"
            >
              <Upload size={20} weight="bold" />
              Bulk Upload
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-[#0047FF] text-white px-6 py-3 font-semibold text-sm hover:bg-[#003BCC] transition-colors duration-150"
              data-testid="add-employee-button"
            >
              <Plus size={20} weight="bold" />
              Add Employee
            </button>
          </div>
        )}
      </div>

      <div className="bg-white border border-[#E5E5E5]">
        <table className="w-full">
          <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5]">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Employee ID</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Name</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Email</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Phone</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Department</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Cost Center</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-12">
                  <Users size={48} className="mx-auto mb-4 text-[#E5E5E5]" />
                  <p className="text-sm text-[#525252]">No employees found. Add your first employee.</p>
                </td>
              </tr>
            ) : (
              employees.map((emp) => (
                <tr key={emp.id} className="border-b border-[#E5E5E5] hover:bg-[#FAFAFA] transition-colors duration-150">
                  <td className="px-6 py-4 text-sm font-semibold">{emp.employee_id}</td>
                  <td className="px-6 py-4 text-sm">{emp.name}</td>
                  <td className="px-6 py-4 text-sm">{emp.email}</td>
                  <td className="px-6 py-4 text-sm">{emp.phone}</td>
                  <td className="px-6 py-4 text-sm">{emp.department || '-'}</td>
                  <td className="px-6 py-4 text-sm">{emp.cost_center || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Add New Employee</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                  Employee ID *
                </label>
                <input
                  type="text"
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                  Phone *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                  Department
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                  Cost Center
                </label>
                <input
                  type="text"
                  value={formData.cost_center}
                  onChange={(e) => setFormData({ ...formData, cost_center: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                Default Pickup Location
              </label>
              <input
                type="text"
                value={formData.default_pickup}
                onChange={(e) => setFormData({ ...formData, default_pickup: e.target.value })}
                className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                placeholder="e.g., Home Address, Office Location"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                Default Dropoff Location
              </label>
              <input
                type="text"
                value={formData.default_dropoff}
                onChange={(e) => setFormData({ ...formData, default_dropoff: e.target.value })}
                className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                placeholder="e.g., Office Location, Home Address"
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
                Add Employee
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Modal */}
      <Dialog open={showBulkUpload} onOpenChange={setShowBulkUpload}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Bulk Upload Employees</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <CSVUploader
              onUpload={handleBulkUpload}
              templateHeaders={['employee_id', 'name', 'email', 'phone', 'department', 'cost_center', 'default_pickup', 'default_dropoff']}
              sampleData={['EMP001', 'John Doe', 'john@company.com', '+91 9876543210', 'Engineering', 'ENG-001', 'Home Address', 'Office Address']}
              title="Upload Employees CSV"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CorporateEmployees;