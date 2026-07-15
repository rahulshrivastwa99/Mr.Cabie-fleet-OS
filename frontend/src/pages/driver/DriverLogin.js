import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Phone, ArrowRight, Shield, Truck } from 'lucide-react';

const API_BASE = process.env.REACT_APP_BACKEND_URL + '/api';

const DriverLogin = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState('phone'); // 'phone' or 'otp'
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [debugOtp, setDebugOtp] = useState(null);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    try {
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      const response = await axios.post(`${API_BASE}/driver/auth/send-otp`, {
        phone: cleanPhone
      });
      
      toast.success('OTP sent to your phone');
      setStep('otp');
      
      // For testing - show debug OTP if SMS wasn't sent
      if (response.data.debug_otp) {
        setDebugOtp(response.data.debug_otp);
      }
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to send OTP';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast.error('Please enter the 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      const response = await axios.post(`${API_BASE}/driver/auth/verify-otp`, {
        phone: cleanPhone,
        otp: otp
      });
      
      // Store token and driver info
      localStorage.setItem('driver_token', response.data.token);
      localStorage.setItem('driver_info', JSON.stringify(response.data.driver));
      
      toast.success(`Welcome, ${response.data.driver.name}!`);
      navigate('/driver/dashboard');
    } catch (error) {
      const message = error.response?.data?.detail || 'Invalid OTP';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col" data-testid="driver-login-page">
      {/* Header */}
      <div className="bg-[#1A1A1A] px-4 py-4 flex items-center gap-3">
        <img src="/logo.png" alt="Mr. Cabie" className="h-10 w-auto" />
        <div>
          <h1 className="text-[#FFD700] font-bold text-lg">Mr. Cabie</h1>
          <p className="text-gray-400 text-xs">Driver Portal</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-center px-6 py-8">
        <div className="max-w-md mx-auto w-full">
          {/* Icon */}
          <div className="w-20 h-20 bg-[#FFD700] rounded-full flex items-center justify-center mx-auto mb-6">
            {step === 'phone' ? (
              <Phone size={36} className="text-black" />
            ) : (
              <Shield size={36} className="text-black" />
            )}
          </div>

          {/* Title */}
          <h2 className="text-white text-2xl font-bold text-center mb-2">
            {step === 'phone' ? 'Driver Login' : 'Verify OTP'}
          </h2>
          <p className="text-gray-400 text-center mb-8">
            {step === 'phone' 
              ? 'Enter your registered phone number'
              : `Enter the 6-digit code sent to +91 ${phone.slice(-10)}`
            }
          </p>

          {/* Form */}
          {step === 'phone' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Phone Number</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">+91</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Enter 10-digit number"
                    className="w-full bg-[#1A1A1A] border border-[#333] text-white pl-14 pr-4 py-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFD700] text-lg"
                    maxLength={10}
                    data-testid="driver-phone-input"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || phone.length < 10}
                className="w-full bg-[#FFD700] text-black py-4 rounded-lg font-semibold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#FFC000] transition-colors"
                data-testid="send-otp-btn"
              >
                {loading ? 'Sending...' : 'Get OTP'}
                {!loading && <ArrowRight size={20} />}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Enter OTP</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit OTP"
                  className="w-full bg-[#1A1A1A] border border-[#333] text-white px-4 py-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFD700] text-2xl text-center tracking-[0.5em] font-mono"
                  maxLength={6}
                  autoFocus
                  data-testid="driver-otp-input"
                />
              </div>
              
              {/* Debug OTP Display (only in dev/testing) */}
              {debugOtp && (
                <div className="bg-[#1A1A1A] border border-yellow-500/30 p-3 rounded-lg">
                  <p className="text-yellow-500 text-xs text-center">
                    Test Mode - OTP: <span className="font-mono font-bold">{debugOtp}</span>
                  </p>
                </div>
              )}
              
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full bg-[#FFD700] text-black py-4 rounded-lg font-semibold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#FFC000] transition-colors"
                data-testid="verify-otp-btn"
              >
                {loading ? 'Verifying...' : 'Verify & Login'}
                {!loading && <ArrowRight size={20} />}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setOtp('');
                  setDebugOtp(null);
                }}
                className="w-full text-gray-400 py-2 text-sm hover:text-white transition-colors"
              >
                Change phone number
              </button>
            </form>
          )}

          {/* Footer Note */}
          <p className="text-gray-500 text-xs text-center mt-8">
            Only registered drivers can login. Contact your fleet operator if you're not registered.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DriverLogin;
