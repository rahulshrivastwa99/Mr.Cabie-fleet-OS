import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Lock, Envelope } from '@phosphor-icons/react';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
        toast.success('Login successful');
        navigate('/');
      } else {
        await register(email, password, name);
        toast.success('Registration successful! Please login.');
        setIsLogin(true);
        setPassword('');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Authentication failed');
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
            <h1 className="text-2xl font-bold tracking-tight text-[#FFD700]" data-testid="login-title">Mr. Cabie</h1>
            <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">Operations Platform</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 block">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#333] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFD700] text-sm"
                  required
                  data-testid="name-input"
                />
              </div>
            )}

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
                  data-testid="email-input"
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
                  data-testid="password-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FFD700] text-black py-3 font-semibold text-sm hover:bg-[#FFC000] transition-colors duration-150 disabled:opacity-50 rounded-lg"
              data-testid="submit-button"
            >
              {loading ? 'Please wait...' : isLogin ? 'Login' : 'Register'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-[#FFD700] hover:underline"
              data-testid="toggle-auth-mode"
            >
              {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Demo: admin@fleetOS.com / password123
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;