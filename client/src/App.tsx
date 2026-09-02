import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { CustomerPortal } from './components/CustomerPortal';
import { MerchantTerminal } from './components/MerchantTerminal';
import { AdminPortal } from './components/AdminPortal';
import { SimulatorBar } from './components/SimulatorBar';
import { Shield, Sparkles } from 'lucide-react';

export function App() {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<'CUSTOMER' | 'MERCHANT' | 'ADMIN'>('CUSTOMER');

  // Auto-sync tab when user role changes
  useEffect(() => {
    if (user?.role) {
      setCurrentTab(user.role);
    }
  }, [user?.role, user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 p-4 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-aviation-600/20 border border-aviation-500/40 flex items-center justify-center text-aviation-400 animate-pulse">
          <Shield className="w-7 h-7" />
        </div>
        <div className="text-center space-y-1">
          <div className="text-sm font-bold font-mono tracking-wider text-slate-200">
            INITIALIZING AIR FORCE BASE CLOSED-LOOP WALLET
          </div>
          <p className="text-xs text-slate-500">Connecting to secure double-entry financial ledger...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-aviation-500 selection:text-white">
      {/* Tactical Top Header */}
      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {currentTab === 'CUSTOMER' && <CustomerPortal />}
        {currentTab === 'MERCHANT' && <MerchantTerminal />}
        {currentTab === 'ADMIN' && <AdminPortal />}
      </main>

      {/* End-to-End Test Simulator Bar */}
      <SimulatorBar />
    </div>
  );
}
