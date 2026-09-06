import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ApiService } from '../services/api';
import {
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
  ArrowLeft,
  Server
} from 'lucide-react';
import { ServerConfigModal } from './ServerConfigModal';

export const AuthScreen: React.FC = () => {
  const { login, refreshUser } = useAuth();
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD'>('LOGIN');

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
  const [showServerConfig, setShowServerConfig] = useState(false);

  useEffect(() => {
    setError(null);
    setSuccessMsg(null);
    setRegStep(1);
    setForgotStep(1);
    setOtpNotice(null);
  }, [mode]);

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

  // ==================== 1. SIGN IN HANDLER ====================
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier || !loginPin) return;

    try {
      setLoading(true);
      setError(null);
      await login(loginIdentifier, loginPin);
    } catch (err: any) {
      setError(err.message || 'Invalid Service Number / Email or PIN');
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
        setOtpNotice(`OTP Preview: ${res.otpPreview}`);
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
        setOtpNotice(`Reset Code Preview: ${res.otpPreview}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset code');
    } finally {
      setLoading(false);
    }
  };

  // ==================== 3. FORGOT PASSWORD STEP 2: RESET PIN ====================
  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtp || forgotOtp.length < 6) {
      setError('Please enter the 6-digit OTP code');
      return;
    }
    if (forgotNewPin.length < 4) {
      setError('New PIN must be at least 4 digits');
      return;
    }
    if (forgotNewPin !== forgotConfirmPin) {
      setError('PIN numbers do not match');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await ApiService.resetPassword({
        userId: forgotUserId,
        otp: forgotOtp,
        newPin: forgotNewPin
      });

      setSuccessMsg(res.message || 'PIN reset successfully!');
      setTimeout(() => {
        setMode('LOGIN');
        setLoginIdentifier(forgotIdentifier);
        setLoginPin('');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to reset PIN. Code may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-8 sm:px-6 lg:px-8 selection:bg-aviation-500 selection:text-white relative overflow-hidden">
      
      {/* Background Ambience Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-aviation-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Server Config Button in Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={() => setShowServerConfig(true)}
          className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-all flex items-center gap-1.5 text-xs"
          title="Server Connection Settings"
        >
          <Server className="w-3.5 h-3.5 text-aviation-400" />
          <span className="hidden sm:inline">Server URL</span>
        </button>
      </div>

      <div className="max-w-md w-full relative z-10">
        
        {/* App Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-aviation-600 to-aviation-950 border border-aviation-400/40 shadow-xl shadow-aviation-950/60 mb-3">
            <Shield className="w-8 h-8 text-aviation-300" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
            AFB <span className="text-aviation-400">CASHLESS</span> QR
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Air Force Base Welfare Projects & Closed-Loop Digital Ecosystem
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl shadow-2xl p-6 sm:p-8">
          
          {/* Tabs: Sign In / Sign Up */}
          {mode !== 'FORGOT_PASSWORD' && (
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 mb-6">
              <button
                type="button"
                onClick={() => setMode('LOGIN')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  mode === 'LOGIN'
                    ? 'bg-aviation-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode('REGISTER')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  mode === 'REGISTER'
                    ? 'bg-aviation-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Feedback Alerts */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {otpNotice && (
            <div className="mb-4 p-2.5 rounded-xl bg-aviation-500/10 border border-aviation-500/30 text-aviation-300 text-xs flex items-center justify-between">
              <span className="font-mono font-semibold">{otpNotice}</span>
              <button
                type="button"
                onClick={() => {
                  const code = otpNotice.replace(/\D/g, '');
                  if (mode === 'REGISTER') setRegOtp(code);
                  if (mode === 'FORGOT_PASSWORD') setForgotOtp(code);
                }}
                className="text-[10px] bg-aviation-500/20 hover:bg-aviation-500/40 text-aviation-200 px-2 py-0.5 rounded transition"
              >
                Auto-fill
              </button>
            </div>
          )}

          {/* ==================================================== */}
          {/* MODE 1: LOGIN */}
          {/* ==================================================== */}
          {mode === 'LOGIN' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Service Number or Gmail Address
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="e.g. AFB-10452 or yourname@gmail.com"
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-aviation-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Security PIN
                  </label>
                  <button
                    type="button"
                    onClick={() => setMode('FORGOT_PASSWORD')}
                    className="text-[11px] text-aviation-400 hover:text-aviation-300 transition"
                  >
                    Forgot PIN?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    maxLength={6}
                    value={loginPin}
                    onChange={(e) => setLoginPin(e.target.value)}
                    placeholder="••••"
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-aviation-500 tracking-widest font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !loginIdentifier || !loginPin}
                className="w-full mt-2 py-3 rounded-xl bg-aviation-600 hover:bg-aviation-500 text-white font-bold text-xs transition-all shadow-lg shadow-aviation-700/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying Credentials...' : 'Sign In to Wallet'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* ==================================================== */}
          {/* MODE 2: REGISTER */}
          {/* ==================================================== */}
          {mode === 'REGISTER' && (
            <div>
              {regStep === 1 ? (
                <form onSubmit={handleRegisterSendOtp} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Official Service Number *
                    </label>
                    <div className="relative">
                      <Shield className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        value={regServiceNo}
                        onChange={(e) => setRegServiceNo(e.target.value.toUpperCase())}
                        placeholder="e.g. AFB-54210"
                        className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-aviation-500 font-mono uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Full Name & Rank *
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="e.g. Flt Lt N. Dissanayake"
                        className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-aviation-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Mobile Phone *
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                        <input
                          type="tel"
                          required
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="0771234567"
                          className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-aviation-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Security PIN *
                      </label>
                      <div className="relative">
                        <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                        <input
                          type="password"
                          required
                          maxLength={6}
                          value={regPin}
                          onChange={(e) => setRegPin(e.target.value)}
                          placeholder="•••• (4-6 digits)"
                          className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-aviation-500 font-mono tracking-widest"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Gmail Address (for OTP Verification) *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value.toLowerCase())}
                        placeholder="yourname@gmail.com"
                        className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-aviation-500"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">A 6-digit OTP will be sent to this email to verify account ownership.</p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !regServiceNo || !regName || !regEmail || !regPin}
                    className="w-full mt-3 py-3 rounded-xl bg-aviation-600 hover:bg-aviation-500 text-white font-bold text-xs transition-all shadow-lg shadow-aviation-700/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Generating Verification Code...' : 'Send OTP to Gmail'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                /* Step 2: Verify OTP */
                <form onSubmit={handleRegisterVerifyOtp} className="space-y-4">
                  <div className="text-center py-2">
                    <div className="w-12 h-12 rounded-full bg-aviation-500/20 text-aviation-400 mx-auto flex items-center justify-center mb-2 border border-aviation-500/30">
                      <Mail className="w-6 h-6" />
                    </div>
                    <p className="text-xs text-slate-300">
                      Enter the 6-digit verification code sent to
                    </p>
                    <p className="text-xs font-bold text-aviation-400 font-mono mt-0.5">{regEmail}</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1 text-center">
                      6-Digit Gmail OTP Code
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={regOtp}
                      onChange={(e) => setRegOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-center text-xl font-mono font-extrabold tracking-widest text-slate-100 placeholder-slate-700 focus:outline-none focus:border-aviation-500"
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || regOtp.length < 6}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-700/30 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? 'Verifying OTP & Creating Account...' : 'Complete Registration'}
                    <CheckCircle2 className="w-4 h-4" />
                  </button>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setRegStep(1)}
                      className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back
                    </button>
                    <button
                      type="button"
                      disabled={resendTimer > 0 || loading}
                      onClick={handleRegisterSendOtp}
                      className="text-xs text-aviation-400 hover:text-aviation-300 disabled:text-slate-600"
                    >
                      {resendTimer > 0 ? `Resend Code in ${resendTimer}s` : 'Resend Code'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* MODE 3: FORGOT PASSWORD */}
          {/* ==================================================== */}
          {mode === 'FORGOT_PASSWORD' && (
            <div>
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
                <button
                  type="button"
                  onClick={() => setMode('LOGIN')}
                  className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                  Reset Wallet Security PIN
                </h3>
              </div>

              {forgotStep === 1 ? (
                <form onSubmit={handleForgotSendOtp} className="space-y-4">
                  <p className="text-xs text-slate-400">
                    Enter your registered Service Number or Gmail address. We will send a secure 6-digit authorization code to reset your PIN.
                  </p>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Service Number or Gmail Address
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        value={forgotIdentifier}
                        onChange={(e) => setForgotIdentifier(e.target.value)}
                        placeholder="e.g. AFB-10452 or yourname@gmail.com"
                        className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-aviation-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !forgotIdentifier}
                    className="w-full py-3 rounded-xl bg-aviation-600 hover:bg-aviation-500 text-white font-bold text-xs transition-all shadow-lg shadow-aviation-700/30 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? 'Verifying Account...' : 'Send Reset OTP to Gmail'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                /* Step 2: Verify & Enter New PIN */
                <form onSubmit={handleResetPin} className="space-y-3.5">
                  <div className="text-center py-1">
                    <p className="text-xs text-slate-300">
                      Code sent to <span className="font-bold text-aviation-400 font-mono">{forgotMaskedEmail}</span>
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1 text-center">
                      6-Digit Authorization Code
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-center text-lg font-mono font-extrabold tracking-widest text-slate-100 placeholder-slate-700 focus:outline-none focus:border-aviation-500"
                      autoFocus
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        New 4-6 Digit PIN
                      </label>
                      <input
                        type="password"
                        required
                        maxLength={6}
                        value={forgotNewPin}
                        onChange={(e) => setForgotNewPin(e.target.value)}
                        placeholder="••••"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-aviation-500 font-mono tracking-widest"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Confirm PIN
                      </label>
                      <input
                        type="password"
                        required
                        maxLength={6}
                        value={forgotConfirmPin}
                        onChange={(e) => setForgotConfirmPin(e.target.value)}
                        placeholder="••••"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-aviation-500 font-mono tracking-widest"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || forgotOtp.length < 6 || forgotNewPin.length < 4 || forgotNewPin !== forgotConfirmPin}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-700/30 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? 'Updating Security PIN...' : 'Save New PIN & Log In'}
                    <KeyRound className="w-4 h-4" />
                  </button>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => setForgotStep(1)}
                      className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back
                    </button>
                    <button
                      type="button"
                      disabled={resendTimer > 0 || loading}
                      onClick={handleForgotSendOtp}
                      className="text-xs text-aviation-400 hover:text-aviation-300 disabled:text-slate-600"
                    >
                      {resendTimer > 0 ? `Resend Code in ${resendTimer}s` : 'Resend Code'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

        </div>

        {/* Footer Security Badge */}
        <div className="mt-6 text-center text-slate-500 text-[11px] flex items-center justify-center gap-1.5 font-mono">
          <Lock className="w-3 h-3 text-slate-600" />
          <span>AFB MILITARY-GRADE CLOSED-LOOP FINANCIAL LEDGER</span>
        </div>

      </div>

      <ServerConfigModal
        isOpen={showServerConfig}
        onClose={() => setShowServerConfig(false)}
      />
    </div>
  );
};
