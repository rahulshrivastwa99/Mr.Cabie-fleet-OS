import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCorporateAuth } from '../../context/CorporateAuthContext';
import { toast } from 'sonner';
import { Lock, Envelope, Building } from '@phosphor-icons/react';

const CorporateLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useCorporateAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast.success('Login successful');
      navigate('/corporate');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#1A1A1A] border border-[#333] p-8 rounded-lg">
          <div className="mb-8 text-center">
            <img 
              src="/logo.png" 
              alt="Mr. Cabie" 
              className="h-20 mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold tracking-tight text-[#FFD700]" data-testid="corporate-login-title">
              Mr. Cabie
            </h1>
            <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">Corporate Portal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 block">
                Email
              </label>
              <div className="relative">
                <Envelope size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-[#0A0A0A] border border-[#333] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFD700] text-sm"
                  required
                  data-testid="corporate-email-input"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 block">
                Password
              </label>
              <div className="relative">
                <Lock size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-[#0A0A0A] border border-[#333] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFD700] text-sm"
                  required
                  data-testid="corporate-password-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FFD700] text-black py-3 font-semibold text-sm hover:bg-[#FFC000] transition-colors duration-150 disabled:opacity-50 rounded-lg"
              data-testid="corporate-submit-button"
            >
              {loading ? 'Please wait...' : 'Login to Corporate Portal'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Need help? Contact your administrator
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CorporateLogin;