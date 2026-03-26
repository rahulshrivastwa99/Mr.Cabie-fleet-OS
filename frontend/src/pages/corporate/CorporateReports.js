import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { ChartBar, Download, FileText } from '@phosphor-icons/react';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api/corporate`;

const CorporateReports = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      const params = {};
      if (dateRange.start_date) params.start_date = dateRange.start_date;
      if (dateRange.end_date) params.end_date = dateRange.end_date;
      
      const response = await axios.get(`${API_BASE}/reports/trips`, { params });
      setReport(response.data);
    } catch (error) {
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = () => {
    setLoading(true);
    fetchReport();
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#0047FF] border-t-transparent rounded-sm animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-[#525252]">Generating report...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="corporate-reports-page">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Reports & Analytics</h1>
        <p className="text-xs text-[#525252] uppercase tracking-widest mt-2">Trip Data & Insights</p>
      </div>

      <div className="bg-white border border-[#E5E5E5] p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Filter Report</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.start_date}
              onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
              className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.end_date}
              onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
              className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleGenerateReport}
              className="w-full bg-[#0047FF] text-white px-6 py-2 font-semibold text-sm hover:bg-[#003BCC] transition-colors duration-150"
            >
              Generate Report
            </button>
          </div>
        </div>
      </div>

      {report && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white border border-[#E5E5E5] p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-2">Total Bookings</p>
              <p className="text-3xl font-bold tracking-tight">{report.total_bookings}</p>
            </div>
            <div className="bg-green-50 border border-[#00C853] p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-2">Completed</p>
              <p className="text-3xl font-bold tracking-tight text-[#00C853]">{report.by_status.completed}</p>
            </div>
            <div className="bg-blue-50 border border-[#0047FF] p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-2">Confirmed</p>
              <p className="text-3xl font-bold tracking-tight text-[#0047FF]">{report.by_status.confirmed}</p>
            </div>
            <div className="bg-yellow-50 border border-[#FFB300] p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#525252] mb-2">Pending</p>
              <p className="text-3xl font-bold tracking-tight text-[#FFB300]">{report.by_status.pending}</p>
            </div>
          </div>

          <div className="bg-white border border-[#E5E5E5] p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Trips by Employee</h2>
              <button
                onClick={() => toast.info('Export feature coming soon')}
                className="flex items-center gap-2 px-4 py-2 border border-[#E5E5E5] text-sm font-medium hover:bg-[#F5F5F5] transition-colors duration-150"
              >
                <Download size={18} weight="regular" />
                Export CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5]">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Employee Name</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Employee ID</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Cost Center</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Total Trips</th>
                  </tr>
                </thead>
                <tbody>
                  {report.by_employee.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center py-8 text-sm text-[#525252]">No data available</td>
                    </tr>
                  ) : (
                    report.by_employee.map((emp, index) => (
                      <tr key={index} className="border-b border-[#E5E5E5] hover:bg-[#FAFAFA] transition-colors duration-150">
                        <td className="px-6 py-4 text-sm font-semibold">{emp.employee_name}</td>
                        <td className="px-6 py-4 text-sm">{emp.employee_id}</td>
                        <td className="px-6 py-4 text-sm">{emp.cost_center || '-'}</td>
                        <td className="px-6 py-4 text-sm font-semibold">{emp.total_trips}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CorporateReports;