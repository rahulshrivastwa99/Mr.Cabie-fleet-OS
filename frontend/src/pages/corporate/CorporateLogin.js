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
    <div className="min-h-screen bg-gradient-to-br from-[#0047FF]/5 to-[#FAFAFA] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white border-2 border-[#E5E5E5] p-8 shadow-sm">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#0047FF] mb-4">
              <Building size={32} weight="bold" className="text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2" data-testid="corporate-login-title">
              Mr. Cabie
            </h1>
            <p className="text-xs text-[#525252] uppercase tracking-widest">Corporate Portal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                Email
              </label>
              <div className="relative">
                <Envelope size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#525252]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                  required
                  data-testid="corporate-email-input"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                Password
              </label>
              <div className="relative">
                <Lock size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#525252]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                  required
                  data-testid="corporate-password-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0047FF] text-white py-3 font-semibold text-sm hover:bg-[#003BCC] transition-colors duration-150 disabled:opacity-50"
              data-testid="corporate-submit-button"
            >
              {loading ? 'Please wait...' : 'Login to Corporate Portal'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-[#525252]">
              Need help? Contact your administrator
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CorporateLogin;