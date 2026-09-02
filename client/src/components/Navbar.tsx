import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Radio, Users, LogOut, Wallet as WalletIcon, Store, Landmark, ChevronDown, Globe } from 'lucide-react';
import { RoleSwitcherModal } from './RoleSwitcherModal';
import { ServerConfigModal } from './ServerConfigModal';

interface NavbarProps {
  currentTab: 'CUSTOMER' | 'MERCHANT' | 'ADMIN';
  setCurrentTab: (tab: 'CUSTOMER' | 'MERCHANT' | 'ADMIN') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab }) => {
  const { user, wallet, logout, isSocketConnected } = useAuth();
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [showServerConfig, setShowServerConfig] = useState(false);

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide flex items-center gap-1"><Landmark className="w-3 h-3" /> FINANCE ADMIN</span>;
      case 'MERCHANT':
        return <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide flex items-center gap-1"><Store className="w-3 h-3" /> MERCHANT CASHIER</span>;
      default:
        return <span className="bg-aviation-500/20 text-aviation-400 border border-aviation-500/40 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide flex items-center gap-1"><Shield className="w-3 h-3" /> SERVICE PERSONNEL</span>;
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Base Crest & Branding */}
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-aviation-600 to-aviation-950 border border-aviation-400/40 shadow-lg shadow-aviation-950/50">
                <Shield className="w-6 h-6 text-aviation-300" />
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 border-2 border-slate-950" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-100 font-sans">
                    AFB <span className="text-aviation-400">CASHLESS</span> QR
                  </span>
                  <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-400 font-mono">
                    <Radio className={`w-3 h-3 ${isSocketConnected ? 'text-emerald-400 animate-pulse' : 'text-rose-400'}`} />
                    {isSocketConnected ? 'LIVE FEED' : 'OFFLINE'}
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block">Welfare Projects & Closed-Loop Digital Ecosystem</p>
              </div>
            </div>

            {/* Navigation Tabs (Quick View Changer) */}
            <nav className="hidden lg:flex items-center p-1 bg-slate-900/90 rounded-xl border border-slate-800">
              <button
                onClick={() => setCurrentTab('CUSTOMER')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  currentTab === 'CUSTOMER'
                    ? 'bg-aviation-600 text-white shadow-md shadow-aviation-700/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <WalletIcon className="w-3.5 h-3.5" />
                Customer Wallet
              </button>
              <button
                onClick={() => setCurrentTab('MERCHANT')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  currentTab === 'MERCHANT'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-700/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                Merchant POS Terminal
              </button>
              <button
                onClick={() => setCurrentTab('ADMIN')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  currentTab === 'ADMIN'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-700/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Landmark className="w-3.5 h-3.5" />
                Finance Master Ledger
              </button>
            </nav>

            {/* User Profile & Demo Switcher */}
            <div className="flex items-center gap-2.5">
              {/* Server URL Config button */}
              <button
                onClick={() => setShowServerConfig(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/70 text-slate-300 text-xs transition-all shadow-sm group"
                title="Configure Live Cloud / Local Server URL"
              >
                <Globe className="w-3.5 h-3.5 text-aviation-400 group-hover:rotate-45 transition-transform" />
                <span className="hidden md:inline font-mono text-[11px]">Server</span>
              </button>

              {/* Quick Persona Switch Button */}
              <button
                onClick={() => setShowRoleSwitcher(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/70 text-slate-200 text-xs transition-all shadow-sm group"
                title="Switch test accounts (Officer, Merchant, Admin)"
              >
                <Users className="w-4 h-4 text-aviation-400 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline font-medium">Switch Role / Demo</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {/* Active Profile Info */}
              {user && (
                <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                  <div className="text-right hidden sm:block">
                    <div className="text-xs font-semibold text-slate-200">{user.name}</div>
                    <div className="text-[10px] font-mono text-aviation-400">{user.serviceNo}</div>
                  </div>
                  <div className="hidden sm:block">
                    {getRoleBadge(user.role)}
                  </div>
                  <button
                    onClick={logout}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="lg:hidden flex items-center justify-around bg-slate-900/90 border-t border-slate-800 px-2 py-1.5">
          <button
            onClick={() => setCurrentTab('CUSTOMER')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium ${
              currentTab === 'CUSTOMER' ? 'bg-aviation-600 text-white' : 'text-slate-400'
            }`}
          >
            <WalletIcon className="w-3.5 h-3.5" /> Customer
          </button>
          <button
            onClick={() => setCurrentTab('MERCHANT')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium ${
              currentTab === 'MERCHANT' ? 'bg-emerald-600 text-white' : 'text-slate-400'
            }`}
          >
            <Store className="w-3.5 h-3.5" /> Merchant POS
          </button>
          <button
            onClick={() => setCurrentTab('ADMIN')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium ${
              currentTab === 'ADMIN' ? 'bg-amber-600 text-white' : 'text-slate-400'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" /> Finance
          </button>
        </div>
      </header>

      {/* Role Switcher Modal */}
      {showRoleSwitcher && (
        <RoleSwitcherModal
          onClose={() => setShowRoleSwitcher(false)}
          onSelectRole={(role) => {
            setCurrentTab(role);
            setShowRoleSwitcher(false);
          }}
        />
      )}

      {/* Live Server Config Modal */}
      <ServerConfigModal
        isOpen={showServerConfig}
        onClose={() => setShowServerConfig(false)}
      />
    </>
  );
};
