// src/components/PasswordReset.jsx
import React, { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from "lucide-react";
import "react-toastify/dist/ReactToastify.css";
import config from "../config";

export default function PasswordReset() {
  const [step, setStep] = useState("request"); // "request" or "reset"
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  
  const navigate = useNavigate();

  const validate = (name, value, ctx={}) => {
    switch (name) {
      case 'email':
        return /\S+@\S+\.\S+/.test(String(value||'').trim()) ? '' : 'Enter a valid email';
      case 'code':
        return String(value||'').trim().length >= 4 ? '' : 'Enter a valid code';
      case 'newPassword':
        return String(value||'').length >= 6 ? '' : 'Password must be at least 6 characters';
      case 'confirmPassword':
        return String(value||'') === String(ctx.newPassword||'') ? '' : 'Passwords do not match';
      default:
        return '';
    }
  };

  const handleFocus = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const msg = validate(name, value, { newPassword });
    if (msg) setErrors(prev => ({ ...prev, [name]: msg }));
  };

  const handleRequestReset = async (e) => {
    e.preventDefault();
    if (!email.trim()) return toast.error("Please enter your email address");
    // inline validation state
    const msg = validate('email', email);
    setErrors(prev => ({ ...prev, email: msg }));
    if (msg) return;

    setLoading(true);
    try {
      const res = await fetch(`${config.apiBaseUrl}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset request failed");

      if (data.devCode) {
        toast.warning(`Dev code: ${data.devCode}`);
      } else {
        toast.success("📧 Password reset email sent!");
        toast.info("Check your email for the verification code");
      }
      setStep("reset");
    } catch (err) {
      toast.error("❌ " + err.message);
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
    setErrors(prev => ({ ...prev, code: vCode, newPassword: vNew, confirmPassword: vConf }));
    if (vCode || vNew || vConf) return;

    setLoading(true);
    try {
      const res = await fetch(`${config.apiBaseUrl}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim(),
          newPassword: newPassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Password reset failed");

      toast.success("✅ Password reset successful! You can now login.");
      navigate("/", { replace: true });
    } catch (err) {
      toast.error("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  

  const goBack = () => {
    if (step === "reset") {
      setStep("request");
      setCode("");
      setNewPassword("");
      setConfirmPassword("");
      
    } else {
      navigate("/", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            {step === "request" ? "Reset Password" : "Enter New Password"}
          </h1>
          <p className="text-gray-400">
            {step === "request" 
              ? "Enter your email to receive reset instructions"
              : "Enter the reset token and your new password"
            }
          </p>
        </div>

        {/* Back Button */}
        <button
          onClick={goBack}
          className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          {step === "request" ? "Back to Login" : "Back to Request"}
        </button>

        {/* Request Reset Form */}
        {step === "request" && (
          <form onSubmit={handleRequestReset} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={handleFocus}
                  placeholder="Enter your email"
                  className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                  required
                />
              </div>
              {touched.email && errors.email && (
                <p className="text-red-400 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 py-3 rounded-lg font-semibold text-white transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Sending...
                </>
              ) : (
                "Send Reset Instructions"
              )}
            </button>
          </form>
        )}

        {/* Reset Password Form */}
        {step === "reset" && (
          <form onSubmit={handleResetPassword} className="space-y-6">
            

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Verification Code
              </label>
              <input
                type="text"
                name="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onFocus={handleFocus}
                placeholder="Enter the 6-digit code from your email"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                required
              />
              {touched.code && errors.code && (
                <p className="text-red-400 text-sm mt-1">{errors.code}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showPassword ? "text" : "password"}
                  name="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onFocus={handleFocus}
                  placeholder="Enter new password"
                  className="w-full pl-10 pr-12 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                  required
                />
                {touched.newPassword && errors.newPassword && (
                  <p className="text-red-400 text-sm mt-1">{errors.newPassword}</p>
                )}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onFocus={handleFocus}
                  placeholder="Confirm new password"
                  className="w-full pl-10 pr-12 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                  required
                />
                {touched.confirmPassword && errors.confirmPassword && (
                  <p className="text-red-400 text-sm mt-1">{errors.confirmPassword}</p>
                )}
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-800 py-3 rounded-lg font-semibold text-white transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Resetting...
                </>
              ) : (
                "Reset Password"
              )}
            </button>
          </form>
        )}

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            {step === "request" 
              ? "Check your email for reset instructions after submitting"
              : "Enter the token sent to your email and create a new password"
            }
          </p>
          
          {/* Manual Entry Option */}
          {step === "request" && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setStep("reset")}
                className="text-blue-400 hover:text-blue-300 text-sm underline"
              >
                I already have the reset token
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 