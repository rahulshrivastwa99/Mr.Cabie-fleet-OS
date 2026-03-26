import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FleetManagement from './pages/FleetManagement';
import DriverManagement from './pages/DriverManagement';
import DutyManagement from './pages/DutyManagement';
import LiveTracking from './pages/LiveTracking';
import Billing from './pages/Billing';
import ClientManagement from './pages/ClientManagement';
import Layout from './components/Layout';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="fleet" element={<FleetManagement />} />
            <Route path="drivers" element={<DriverManagement />} />
            <Route path="duties" element={<DutyManagement />} />
            <Route path="tracking" element={<LiveTracking />} />
            <Route path="billing" element={<Billing />} />
            <Route path="clients" element={<ClientManagement />} />
          </Route>
        </Routes>
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;