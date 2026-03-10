// src/components/PasswordReset.jsx
import React, { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import 'react-toastify/dist/ReactToastify.css';
import config from '../config';
import AuthBackground from './AuthBackground';

export default function PasswordReset() {
  const [step, setStep] = useState('request'); // "request" or "reset"
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});

  const navigate = useNavigate();

  const validate = (name, value, ctx = {}) => {
    switch (name) {
      case 'email':
        return /\S+@\S+\.\S+/.test(String(value || '').trim()) ? '' : 'Enter a valid email';
      case 'code':
        return String(value || '').trim().length >= 4 ? '' : 'Enter a valid code';
      case 'newPassword':
        return String(value || '').length >= 6 ? '' : 'Password must be at least 6 characters';
      case 'confirmPassword':
        return String(value || '') === String(ctx.newPassword || '')
          ? ''
          : 'Passwords do not match';
      default:
        return '';
    }
  };

  const handleFocus = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const msg = validate(name, value, { newPassword });
    if (msg) setErrors((prev) => ({ ...prev, [name]: msg }));
  };

  const handleRequestReset = async (e) => {
    e.preventDefault();
    if (!email.trim()) return toast.error('Please enter your email address');
    // inline validation state
    const msg = validate('email', email);
    setErrors((prev) => ({ ...prev, email: msg }));
    if (msg) return;

    setLoading(true);
    try {
      const res = await fetch(`${config.apiBaseUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset request failed');

      if (data.devCode) {
        toast.warning(`Dev code: ${data.devCode}`);
      } else {
        toast.success('📧 Password reset email sent!');
        toast.info('Check your email for the verification code');
      }
      setStep('reset');
    } catch (err) {
      toast.error('❌ ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    // inline validation state
    const vCode = validate('code', code);
    const vNew = validate('newPassword', newPassword);
    const vConf = validate('confirmPassword', confirmPassword, { newPassword });
    setErrors((prev) => ({ ...prev, code: vCode, newPassword: vNew, confirmPassword: vConf }));
    if (vCode || vNew || vConf) return;

    setLoading(true);
    try {
      const res = await fetch(`${config.apiBaseUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim(),
          newPassword: newPassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Password reset failed');

      toast.success('✅ Password reset successful! You can now login.');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error('❌ ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (step === 'reset') {
      setStep('request');
      setCode('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      {/* Isolated Auth Background */}
      <AuthBackground />

      <div className="bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black uppercase tracking-tighter text-black mb-2">
            {step === 'request' ? 'Reset Password' : 'New Password'}
          </h1>
          <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
            {step === 'request'
              ? 'Enter your email for instructions'
              : 'Enter token and new password'}
          </p>
        </div>

        {/* Back Button */}
        <button
          onClick={goBack}
          className="flex items-center gap-2 text-neutral-500 hover:text-black font-bold uppercase tracking-widest text-xs mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          {step === 'request' ? 'Back to Login' : 'Back to Request'}
        </button>

        {/* Request Reset Form */}
        {step === 'request' && (
          <form onSubmit={handleRequestReset} className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-1 text-neutral-500">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={handleFocus}
                  placeholder="ENTER YOUR EMAIL"
                  className="w-full pl-3 pr-4 py-3 bg-neutral-50 border-2 border-black font-bold placeholder:text-neutral-400 focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                  required
                />
              </div>
              {touched.email && errors.email && (
                <p className="text-red-600 text-xs font-bold mt-1 uppercase">{errors.email}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black hover:bg-neutral-800 text-white border-2 border-transparent py-3 font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Instructions'}
            </button>
          </form>
        )}

        {/* Reset Password Form */}
        {step === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-1 text-neutral-500">
                Verification Code
              </label>
              <input
                type="text"
                name="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onFocus={handleFocus}
                placeholder="6-DIGIT CODE"
                className="w-full px-4 py-3 bg-neutral-50 border-2 border-black font-bold placeholder:text-neutral-400 focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                required
              />
              {touched.code && errors.code && (
                <p className="text-red-600 text-xs font-bold mt-1 uppercase">{errors.code}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-1 text-neutral-500">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onFocus={handleFocus}
                  placeholder="NEW PASSWORD"
                  className="w-full pl-3 pr-12 py-3 bg-neutral-50 border-2 border-black font-bold placeholder:text-neutral-400 focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-black"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {touched.newPassword && errors.newPassword && (
                <p className="text-red-600 text-xs font-bold mt-1 uppercase">
                  {errors.newPassword}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-1 text-neutral-500">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onFocus={handleFocus}
                  placeholder="CONFIRM PASSWORD"
                  className="w-full pl-3 pr-12 py-3 bg-neutral-50 border-2 border-black font-bold placeholder:text-neutral-400 focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-black"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {touched.confirmPassword && errors.confirmPassword && (
                <p className="text-red-600 text-xs font-bold mt-1 uppercase">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black hover:bg-neutral-800 text-white border-2 border-transparent py-3 font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wide">
            {step === 'request'
              ? 'Check your email for the code'
              : 'Enter token sent to your email'}
          </p>

          {/* Manual Entry Option */}
          {step === 'request' && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setStep('reset')}
                className="text-black font-bold uppercase tracking-widest border-b-2 border-black hover:bg-black hover:text-white transition-colors text-xs"
              >
                I have a code
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
