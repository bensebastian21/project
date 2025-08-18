// src/components/PasswordReset.jsx
import React, { useState } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Copy, Check } from "lucide-react";
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
  const [resetTokenReceived, setResetTokenReceived] = useState("");
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const handleRequestReset = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      return toast.error("Please enter your email address");
    }

    setLoading(true);
    try {
      const res = await fetch(`${config.apiBaseUrl}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset request failed");

      // Handle response based on whether email was sent or code returned (fallback)
      if (data.resetCode) {
        // Fallback: email failed, show token on screen
        setResetTokenReceived(data.resetCode);
        toast.warning("⚠️ Email delivery failed");
        toast.info("Use the code below to reset your password");
        setStep("reset");
      } else {
        // Email sent successfully
        toast.success("📧 Password reset email sent!");
        toast.info("Check your email for the verification code");
        // Don't automatically go to reset step - user should check email first
        setEmail(""); // Clear email for security
      }
    } catch (err) {
      toast.error("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (!code.trim()) {
      return toast.error("Please enter the verification code");
    }
    
    if (!newPassword.trim()) {
      return toast.error("Please enter a new password");
    }
    
    if (newPassword.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }
    
    if (newPassword !== confirmPassword) {
      return toast.error("Passwords do not match");
    }

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

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Token copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy token");
    }
  };

  const goBack = () => {
    if (step === "reset") {
      setStep("request");
      setCode("");
      setNewPassword("");
      setConfirmPassword("");
      setResetTokenReceived("");
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                  required
                />
              </div>
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
            {/* Display Code (fallback when email fails) */}
            {resetTokenReceived && (
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <label className="block text-sm font-medium text-blue-300 mb-2">
                  Your Verification Code
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={resetTokenReceived}
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(resetTokenReceived)}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
                <p className="text-xs text-blue-400 mt-2">
                  Copy this code and paste it below
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Verification Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter the 6-digit code from your email"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full pl-10 pr-12 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                  required
                />
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
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full pl-10 pr-12 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                  required
                />
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