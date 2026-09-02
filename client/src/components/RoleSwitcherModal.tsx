import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Shield, Store, Landmark, KeyRound, CheckCircle2, UserCheck, ArrowRight, Sparkles } from 'lucide-react';

interface RoleSwitcherModalProps {
  onClose: () => void;
  onSelectRole: (role: 'CUSTOMER' | 'MERCHANT' | 'ADMIN') => void;
}

export const RoleSwitcherModal: React.FC<RoleSwitcherModalProps> = ({ onClose, onSelectRole }) => {
  const { user, demoUsers, quickLogin, login } = useAuth();
  const [activeTab, setActiveTab] = useState<'PRESETS' | 'CUSTOM'>('PRESETS');
  const [serviceNo, setServiceNo] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuickSwitch = async (targetServiceNo: string, targetRole: 'CUSTOMER' | 'MERCHANT' | 'ADMIN') => {
    try {
      setLoading(true);
      setError(null);
      await quickLogin(targetServiceNo);
      onSelectRole(targetRole);
    } catch (err: any) {
      setError(err.message || 'Failed to switch user');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceNo || !pin) return;
    try {
      setLoading(true);
      setError(null);
      await login(serviceNo, pin);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Invalid Service No or PIN');
    } finally {
      setLoading(false);
    }
  };

  const customers = demoUsers.filter(u => u.role === 'CUSTOMER');
  const merchants = demoUsers.filter(u => u.role === 'MERCHANT');
  const admins = demoUsers.filter(u => u.role === 'ADMIN');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl shadow-black/80 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-aviation-500/20 text-aviation-400 border border-aviation-500/30">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Simulated Persona Switcher
                <span className="px-2 py-0.5 rounded-full bg-aviation-500/20 text-aviation-300 text-[10px] font-mono">1-CLICK DEMO</span>
              </h3>
              <p className="text-xs text-slate-400">Instantly toggle between Customer, Merchant Cashier, and Base Finance roles</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 px-6 pt-3 gap-4">
          <button
            onClick={() => setActiveTab('PRESETS')}
            className={`pb-3 text-xs font-semibold flex items-center gap-2 transition-colors border-b-2 ${
              activeTab === 'PRESETS'
                ? 'border-aviation-500 text-aviation-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Pre-loaded Base Personas
          </button>
          <button
            onClick={() => setActiveTab('CUSTOM')}
            className={`pb-3 text-xs font-semibold flex items-center gap-2 transition-colors border-b-2 ${
              activeTab === 'CUSTOM'
                ? 'border-aviation-500 text-aviation-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            Custom PIN Login
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <span className="font-bold">Error:</span> {error}
            </div>
          )}

          {activeTab === 'PRESETS' ? (
            <div className="space-y-5">
              
              {/* Customer Section */}
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-aviation-400 uppercase tracking-wider mb-2.5">
                  <Shield className="w-3.5 h-3.5" /> Service Personnel (Customers)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {customers.map((c) => {
                    const isCurrent = user?.id === c.id;
                    return (
                      <button
                        key={c.id}
                        disabled={loading}
                        onClick={() => handleQuickSwitch(c.serviceNo, 'CUSTOMER')}
                        className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${
                          isCurrent
                            ? 'bg-aviation-950/60 border-aviation-500 shadow-md shadow-aviation-950'
                            : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 hover:border-aviation-400/50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="font-semibold text-xs text-slate-100 group-hover:text-aviation-300 transition-colors">
                            {c.name}
                          </div>
                          {isCurrent && (
                            <CheckCircle2 className="w-4 h-4 text-aviation-400 shrink-0" />
                          )}
                        </div>
                        <div className="mt-1 font-mono text-[11px] text-slate-400">
                          {c.serviceNo}
                        </div>
                        <div className="mt-2 text-[11px] font-semibold text-emerald-400 font-mono">
                          LKR {c.wallet?.balance?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Merchant Cashier Section */}
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2.5">
                  <Store className="w-3.5 h-3.5" /> Base Welfare Outlets (Merchant Cashiers)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {merchants.map((m) => {
                    const isCurrent = user?.id === m.id;
                    const outlet = m.outlets?.[0];
                    return (
                      <button
                        key={m.id}
                        disabled={loading}
                        onClick={() => handleQuickSwitch(m.serviceNo, 'MERCHANT')}
                        className={`p-3 rounded-xl border text-left transition-all relative group ${
                          isCurrent
                            ? 'bg-emerald-950/60 border-emerald-500 shadow-md shadow-emerald-950'
                            : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 hover:border-emerald-400/50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-semibold text-xs text-slate-100 group-hover:text-emerald-300 transition-colors">
                              {outlet?.name || m.name}
                            </div>
                            <div className="text-[10px] text-slate-400">{outlet?.category || 'Welfare Stall'}</div>
                          </div>
                          {isCurrent && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          )}
                        </div>
                        <div className="mt-2 flex items-center justify-between font-mono text-[11px]">
                          <span className="text-slate-400">{m.serviceNo}</span>
                          <span className="text-emerald-400 font-semibold">
                            LKR {m.wallet?.balance?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Admin Section */}
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-2.5">
                  <Landmark className="w-3.5 h-3.5" /> Base Command & Finance Section
                </div>
                <div className="grid grid-cols-1 gap-2.5">
                  {admins.map((a) => {
                    const isCurrent = user?.id === a.id;
                    return (
                      <button
                        key={a.id}
                        disabled={loading}
                        onClick={() => handleQuickSwitch(a.serviceNo, 'ADMIN')}
                        className={`p-3 rounded-xl border text-left transition-all relative flex items-center justify-between group ${
                          isCurrent
                            ? 'bg-amber-950/60 border-amber-500 shadow-md shadow-amber-950'
                            : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 hover:border-amber-400/50'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-xs text-slate-100 group-hover:text-amber-300 transition-colors">
                            {a.name}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">{a.serviceNo} • Master Financial Controller</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-amber-400 font-mono text-xs font-bold">
                            Base Vault: LKR {a.wallet?.balance?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                          {isCurrent ? (
                            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                          ) : (
                            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          ) : (
            <form onSubmit={handleCustomLogin} className="space-y-4 max-w-md mx-auto">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Service Number / User ID</label>
                <input
                  type="text"
                  value={serviceNo}
                  onChange={(e) => setServiceNo(e.target.value)}
                  placeholder="e.g. AFB-10452 or AFB-M001"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-aviation-500 font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">4-Digit Security PIN</label>
                <input
                  type="password"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="•••• (Default: 1234)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-aviation-500 font-mono text-center tracking-widest text-lg"
                  required
                />
                <p className="mt-1 text-[11px] text-slate-500">All demo accounts are configured with default PIN: <code className="text-aviation-400 font-bold">1234</code></p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-aviation-600 hover:bg-aviation-500 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-aviation-700/30"
              >
                {loading ? 'Authenticating...' : 'Sign In With PIN'}
              </button>
            </form>
          )}

        </div>

        {/* Footer Note */}
        <div className="px-6 py-3 bg-slate-950/70 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Closed-Loop Closed Network Verification</span>
          <span className="font-mono text-slate-500">v1.0.4-AFB</span>
        </div>

      </div>
    </div>
  );
};
