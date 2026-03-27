import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FleetManagement from './pages/FleetManagement';
import DriverManagement from './pages/DriverManagement';
import TripManagement from './pages/TripManagement';
import DutySlips from './pages/DutySlips';
import ContractManagement from './pages/ContractManagement';
import LiveTracking from './pages/LiveTracking';
import Billing from './pages/Billing';
import ClientManagement from './pages/ClientManagement';
import Layout from './components/Layout';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Corporate Dashboard Imports
import { CorporateAuthProvider } from './context/CorporateAuthContext';
import CorporateProtectedRoute from './components/CorporateProtectedRoute';
import CorporateLayout from './components/CorporateLayout';
import CorporateLogin from './pages/corporate/CorporateLogin';
import CorporateDashboard from './pages/corporate/CorporateDashboard';
import CorporateBookings from './pages/corporate/CorporateBookings';
import CorporateEmployees from './pages/corporate/CorporateEmployees';
import CorporateTracking from './pages/corporate/CorporateTracking';
import CorporateInvoices from './pages/corporate/CorporateInvoices';
import CorporateReports from './pages/corporate/CorporateReports';
import CorporateDutySlips from './pages/corporate/CorporateDutySlips';

import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CorporateAuthProvider>
          <Routes>
            {/* Admin Panel Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="fleet" element={<FleetManagement />} />
              <Route path="drivers" element={<DriverManagement />} />
              <Route path="trips" element={<TripManagement />} />
              <Route path="duty-slips" element={<DutySlips />} />
              <Route path="contracts" element={<ContractManagement />} />
              <Route path="tracking" element={<LiveTracking />} />
              <Route path="billing" element={<Billing />} />
              <Route path="clients" element={<ClientManagement />} />
            </Route>

            {/* Corporate Portal Routes */}
            <Route path="/corporate/login" element={<CorporateLogin />} />
            <Route path="/corporate" element={<CorporateProtectedRoute><CorporateLayout /></CorporateProtectedRoute>}>
              <Route index element={<CorporateDashboard />} />
              <Route path="bookings" element={<CorporateBookings />} />
              <Route path="duty-slips" element={<CorporateDutySlips />} />
              <Route path="employees" element={<CorporateEmployees />} />
              <Route path="tracking" element={<CorporateTracking />} />
              <Route path="invoices" element={<CorporateInvoices />} />
              <Route path="reports" element={<CorporateReports />} />
            </Route>
          </Routes>
          <Toaster position="top-right" richColors />
        </CorporateAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;