import React from 'react';
import { Navigate } from 'react-router-dom';
import { useCorporateAuth } from '../context/CorporateAuthContext';

const CorporateProtectedRoute = ({ children }) => {
  const { user, loading } = useCorporateAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#FAFAFA]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#0047FF] border-t-transparent rounded-sm animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-[#525252]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/corporate/login" replace />;
  }

  return children;
};

export default CorporateProtectedRoute;