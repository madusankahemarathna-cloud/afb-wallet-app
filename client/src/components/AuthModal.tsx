import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ApiService } from '../services/api';
import {
  X,
  Shield,
  Mail,
  Lock,
  User as UserIcon,
  Phone,
  KeyRound,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  ArrowLeft
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'LOGIN'
}) => {
  const { login, refreshUser } = useAuth();
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD'>(initialMode);

  // Sign In Form State
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPin, setLoginPin] = useState('');

  // Register Form State
  const [regStep, setRegStep] = useState<1 | 2>(1);
  const [regServiceNo, setRegServiceNo] = useState('');
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regOtp, setRegOtp] = useState('');

  // Forgot Password State
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotUserId, setForgotUserId] = useState('');
  const [forgotMaskedEmail, setForgotMaskedEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPin, setForgotNewPin] = useState('');
  const [forgotConfirmPin, setForgotConfirmPin] = useState('');

  // UI States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [otpNotice, setOtpNotice] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    setMode(initialMode);
    setError(null);
    setSuccessMsg(null);
    setRegStep(1);
    setForgotStep(1);
  }, [initialMode, isOpen]);

  // Resend countdown timer
  useEffect(() => {
    let interval: any;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  if (!isOpen) return null;

  // ==================== 1. SIGN IN HANDLER ====================
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier || !loginPin) return;

    try {
      setLoading(true);
      setError(null);
      await login(loginIdentifier, loginPin);
      setSuccessMsg('Authentication successful! Welcome back.');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Invalid Service No / Email or PIN');
    } finally {
      setLoading(false);
    }
  };

  // ==================== 2. REGISTRATION STEP 1: SEND OTP ====================
  const handleRegisterSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regServiceNo || !regName || !regPhone || !regEmail || !regPin) {
      setError('Please fill all required fields');
      return;
    }
    if (regPin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccessMsg(null);
      const res = await ApiService.registerSendOtp({
        serviceNo: regServiceNo,
        name: regName,
        phone: regPhone,
        email: regEmail,
        pin: regPin,
        role: 'CUSTOMER'
      });

      setRegStep(2);
      setResendTimer(60);
      setSuccessMsg(res.message);
      if (res.otpPreview) {
        setOtpNotice(`Demo Mode Preview OTP: ${res.otpPreview}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  // ==================== 2. REGISTRATION STEP 2: VERIFY OTP ====================
  const handleRegisterVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regOtp || regOtp.length < 6) {
      setError('Please enter the 6-digit verification code sent to your Gmail');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await ApiService.registerVerifyOtp({
        email: regEmail,
        otp: regOtp
      });

      if (res.token) {
        localStorage.setItem('afb_auth_token', res.token);
        await refreshUser();
      }

      setSuccessMsg('Account verified successfully! Welcome to AFB Digital Wallet.');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Invalid or expired verification code');
    } finally {
      setLoading(false);
    }
  };

  // ==================== 3. FORGOT PASSWORD STEP 1: SEND OTP ====================
  const handleForgotSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotIdentifier) {
      setError('Please enter your Service Number or registered Gmail');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccessMsg(null);
      const res = await ApiService.forgotPasswordSendOtp(forgotIdentifier);

      setForgotUserId(res.userId);
      setForgotMaskedEmail(res.maskedEmail);
      setForgotStep(2);
      setResendTimer(60);
      setSuccessMsg(res.message);
      if (res.otpPreview) {
        setOtpNotice(`Demo Mode Preview Code: ${res.otpPreview}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset code');
    } finally {
      setLoading(false);
    }
  };

  // ==================== 3. FORGOT PASSWORD STEP 2: RESET PIN ====================
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtp || forgotOtp.length < 6) {
      setError('Please enter the 6-digit reset code');
      return;
    }
    if (forgotNewPin.length < 4) {
      setError('New PIN must be at least 4 digits');
      return;
    }
    if (forgotNewPin !== forgotConfirmPin) {
      setError('New PIN and confirmation PIN do not match');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await ApiService.resetPassword({
        userId: forgotUserId,
        otp: forgotOtp,
        newPin: forgotNewPin
      });

      setSuccessMsg('PIN reset successfully! You can now log in with your new PIN.');
      setTimeout(() => {
        setMode('LOGIN');
        setLoginIdentifier(forgotIdentifier);
        setLoginPin('');
        setForgotStep(1);
        setSuccessMsg('PIN updated! Please enter your new PIN to sign in.');
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to reset PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl shadow-black/90 flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-aviation-500/20 text-aviation-400 border border-aviation-500/30">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                {mode === 'LOGIN' && 'Sign In to AFB Wallet'}
                {mode === 'REGISTER' && 'Service Personnel Registration'}
                {mode === 'FORGOT_PASSWORD' && 'Security PIN / Password Recovery'}
              </h3>
              <p className="text-xs text-slate-400">
                {mode === 'LOGIN' && 'Access closed-loop QR wallet & digital mess accounts'}
                {mode === 'REGISTER' && 'Register account with Gmail OTP verification'}
                {mode === 'FORGOT_PASSWORD' && 'Verify identity via registered Gmail OTP'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Navigation Bar */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 pt-2 gap-4">
          <button
            onClick={() => {
              setMode('LOGIN');
              setError(null);
              setSuccessMsg(null);
            }}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 transition-colors border-b-2 ${
              mode === 'LOGIN'
                ? 'border-aviation-500 text-aviation-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" /> Sign In
          </button>
          <button
            onClick={() => {
              setMode('REGISTER');
              setRegStep(1);
              setError(null);
              setSuccessMsg(null);
            }}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 transition-colors border-b-2 ${
              mode === 'REGISTER'
                ? 'border-aviation-500 text-aviation-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Register Account (OTP)
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Notifications */}
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {otpNotice && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center justify-between">
              <span>{otpNotice}</span>
              <button
                type="button"
                onClick={() => {
                  const match = otpNotice.match(/\d{6}/);
                  if (match) {
                    if (mode === 'REGISTER') setRegOtp(match[0]);
                    if (mode === 'FORGOT_PASSWORD') setForgotOtp(match[0]);
                  }
                }}
                className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[10px] font-bold rounded"
              >
                Auto-fill
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* 1. SIGN IN FORM                                          */}
          {/* ======================================================== */}
          {mode === 'LOGIN' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-aviation-400" /> Service No or Gmail Address
                </label>
                <input
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="e.g. AFB-10452 or officer@gmail.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-aviation-500 font-mono"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-aviation-400" /> 4-Digit Security PIN / Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('FORGOT_PASSWORD');
                      setForgotIdentifier(loginIdentifier);
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className="text-xs text-aviation-400 hover:text-aviation-300 hover:underline"
                  >
                    Forgot PIN?
                  </button>
                </div>
                <input
                  type="password"
                  maxLength={6}
                  value={loginPin}
                  onChange={(e) => setLoginPin(e.target.value)}
                  placeholder="••••"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-aviation-500 font-mono text-center tracking-widest text-lg"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-aviation-600 hover:bg-aviation-500 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-aviation-700/30 hover:scale-[1.01]"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-2 text-center text-xs text-slate-400">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('REGISTER');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="text-aviation-400 hover:text-aviation-300 font-semibold hover:underline"
                >
                  Register with Gmail OTP
                </button>
              </div>
            </form>
          )}

          {/* ======================================================== */}
          {/* 2. REGISTRATION FORM (STEP 1 & STEP 2)                   */}
          {/* ======================================================== */}
          {mode === 'REGISTER' && (
            <div>
              {regStep === 1 ? (
                <form onSubmit={handleRegisterSendOtp} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Service Number *
                      </label>
                      <input
                        type="text"
                        value={regServiceNo}
                        onChange={(e) => setRegServiceNo(e.target.value)}
                        placeholder="e.g. AFB-50912"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-aviation-500 font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Full Name & Rank *
                      </label>
                      <input
                        type="text"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="e.g. Flt Lt N. Dissanayake"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-aviation-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-aviation-400" /> Gmail / Email Address (for OTP) *
                    </label>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="e.g. yourname@gmail.com"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-aviation-500 font-mono"
                      required
                    />
                    <p className="mt-1 text-[10px] text-slate-400">
                      A 6-digit confirmation code will be delivered to this Gmail inbox.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-aviation-400" /> Phone Number *
                      </label>
                      <input
                        type="tel"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="+94 77 123 4567"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-aviation-500 font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-aviation-400" /> 4-Digit Security PIN *
                      </label>
                      <input
                        type="password"
                        maxLength={6}
                        value={regPin}
                        onChange={(e) => setRegPin(e.target.value)}
                        placeholder="••••"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-aviation-500 font-mono text-center tracking-widest"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-2.5 bg-aviation-600 hover:bg-aviation-500 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-aviation-700/30 hover:scale-[1.01]"
                  >
                    {loading ? 'Sending OTP to Gmail...' : 'Send Verification OTP'}
                    <Mail className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegisterVerifyOtp} className="space-y-4">
                  <div className="text-center p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                    <p className="text-xs text-slate-300">
                      Enter the 6-digit verification code sent to:
                    </p>
                    <p className="text-sm font-bold font-mono text-aviation-400 mt-0.5">
                      {regEmail}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5 text-center">
                      6-Digit Gmail OTP Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={regOtp}
                      onChange={(e) => setRegOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="w-full bg-slate-950 border-2 border-aviation-500/50 rounded-xl py-3 text-2xl text-center font-mono font-bold tracking-[0.5em] text-aviation-300 focus:outline-none focus:border-aviation-400"
                      autoFocus
                      required
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                    <button
                      type="button"
                      onClick={() => setRegStep(1)}
                      className="flex items-center gap-1 text-slate-400 hover:text-slate-200"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back / Edit Email
                    </button>

                    <button
                      type="button"
                      disabled={resendTimer > 0 || loading}
                      onClick={handleRegisterSendOtp}
                      className={`flex items-center gap-1 font-medium ${
                        resendTimer > 0
                          ? 'text-slate-500 cursor-not-allowed'
                          : 'text-aviation-400 hover:text-aviation-300 hover:underline'
                      }`}
                    >
                      <RotateCcw className="w-3 h-3" />
                      {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || regOtp.length < 6}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/30 disabled:opacity-50"
                  >
                    {loading ? 'Verifying...' : 'Verify & Create Digital Wallet'}
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* 3. FORGOT PASSWORD FORM (STEP 1 & STEP 2)                */}
          {/* ======================================================== */}
          {mode === 'FORGOT_PASSWORD' && (
            <div>
              {forgotStep === 1 ? (
                <form onSubmit={handleForgotSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Enter Service No or Registered Gmail Address
                    </label>
                    <input
                      type="text"
                      value={forgotIdentifier}
                      onChange={(e) => setForgotIdentifier(e.target.value)}
                      placeholder="e.g. AFB-10452 or user@gmail.com"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                      required
                      autoFocus
                    />
                    <p className="mt-1.5 text-[11px] text-slate-400">
                      We will look up your registered account and dispatch a 6-digit authorization code to your Gmail.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setMode('LOGIN')}
                      className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                    >
                      Back to Sign In
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-amber-700/30"
                    >
                      {loading ? 'Searching & Sending...' : 'Send Reset Code'}
                      <Mail className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-3.5">
                  <div className="text-center p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                    <p className="text-xs text-slate-300">
                      Authorization code dispatched to:
                    </p>
                    <p className="text-sm font-bold font-mono text-amber-400 mt-0.5">
                      {forgotMaskedEmail}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1 text-center">
                      6-Digit Authorization Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="w-full bg-slate-950 border-2 border-amber-500/50 rounded-xl py-2.5 text-xl text-center font-mono font-bold tracking-[0.4em] text-amber-300 focus:outline-none focus:border-amber-400"
                      autoFocus
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        New Security PIN *
                      </label>
                      <input
                        type="password"
                        maxLength={6}
                        value={forgotNewPin}
                        onChange={(e) => setForgotNewPin(e.target.value)}
                        placeholder="••••"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono text-center tracking-widest"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Confirm New PIN *
                      </label>
                      <input
                        type="password"
                        maxLength={6}
                        value={forgotConfirmPin}
                        onChange={(e) => setForgotConfirmPin(e.target.value)}
                        placeholder="••••"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono text-center tracking-widest"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                    <button
                      type="button"
                      onClick={() => setForgotStep(1)}
                      className="flex items-center gap-1 text-slate-400 hover:text-slate-200"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back
                    </button>

                    <button
                      type="button"
                      disabled={resendTimer > 0 || loading}
                      onClick={handleForgotSendOtp}
                      className={`flex items-center gap-1 font-medium ${
                        resendTimer > 0
                          ? 'text-slate-500 cursor-not-allowed'
                          : 'text-amber-400 hover:text-amber-300 hover:underline'
                      }`}
                    >
                      <RotateCcw className="w-3 h-3" />
                      {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || forgotOtp.length < 6 || !forgotNewPin}
                    className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-700/30 disabled:opacity-50"
                  >
                    {loading ? 'Resetting PIN...' : 'Reset PIN & Return to Sign In'}
                    <KeyRound className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-slate-400">
            <Shield className="w-3.5 h-3.5 text-aviation-400" />
            Air Force Base Closed-Loop Security
          </span>
          <span className="font-mono text-slate-500">2FA OTP Enabled</span>
        </div>

      </div>
    </div>
  );
};
