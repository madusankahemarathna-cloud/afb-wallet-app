import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ApiService } from '../services/api';
import { sound } from '../utils/audio';
import confetti from 'canvas-confetti';
import { Zap, Play, CheckCircle2, ChevronUp, ChevronDown, Store } from 'lucide-react';

export const SimulatorBar: React.FC<{ onPaymentSuccess?: () => void }> = ({ onPaymentSuccess }) => {
  const { user, refreshWallet } = useAuth();
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [lastTxn, setLastTxn] = useState<string | null>(null);

  const testScenarios = [
    {
      title: 'Eagle Canteen (LKR 350)',
      amount: 350,
      qrHash: 'AFB-OUTLET-CANTEEN-01',
      outletName: 'Eagle Canteen',
      notes: 'Breakfast & Tea'
    },
    {
      title: 'Fresh Yoghurt (LKR 600)',
      amount: 600,
      qrHash: 'AFB-OUTLET-YOGHURT-02',
      outletName: 'Base Yoghurt Project',
      notes: '4x Sweet Treacle Yoghurt'
    },
    {
      title: 'Base Salon (LKR 1,200)',
      amount: 1200,
      qrHash: 'AFB-OUTLET-SALON-03',
      outletName: 'Base Grooming Salon',
      notes: 'Officers Grooming & Shave'
    },
    {
      title: 'Tombola Stall (LKR 500)',
      amount: 500,
      qrHash: 'AFB-OUTLET-TOMBOLA-04',
      outletName: 'Tombola Carnival Stall',
      notes: '5x Raffle Carnival Tokens'
    }
  ];

  const handleSimulatePayment = async (scenario: typeof testScenarios[0]) => {
    try {
      setLoading(true);
      const res = await ApiService.payQR({
        qrHash: scenario.qrHash,
        amount: scenario.amount,
        pin: '1234',
        notes: scenario.notes,
        invoiceRef: `SIM-${Math.floor(1000 + Math.random() * 9000)}`
      });

      if (res.success) {
        sound.playSuccessBeep();
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.8 } });
        setLastTxn(`Paid LKR ${scenario.amount} to ${scenario.outletName} (${res.receipt?.referenceId})`);
        await refreshWallet();
        if (onPaymentSuccess) onPaymentSuccess();
        setTimeout(() => setLastTxn(null), 6000);
      }
    } catch (err: any) {
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 max-w-3xl w-[94%] bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/80 text-xs overflow-hidden transition-all">
      
      {/* Bar Header */}
      <div className="px-4 py-2.5 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-amber-500/20 text-amber-400">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <span className="font-extrabold text-slate-200">
            END-TO-END TEST SIMULATOR BAR
          </span>
          <span className="hidden sm:inline text-[10px] font-mono text-slate-400">
            (1-Click simulate instant customer to merchant QR transfer)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {lastTxn && (
            <span className="text-[11px] text-emerald-400 font-mono font-bold animate-pulse flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> {lastTxn}
            </span>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 text-slate-400 hover:text-white rounded"
          >
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Buttons Row */}
      {isOpen && (
        <div className="p-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {testScenarios.map((s, idx) => (
            <button
              key={idx}
              disabled={loading}
              onClick={() => handleSimulatePayment(s)}
              className="px-2.5 py-2 rounded-xl bg-slate-800/80 hover:bg-aviation-950/80 hover:border-aviation-500/60 border border-slate-700 text-left transition-all flex items-center justify-between group"
            >
              <div className="truncate pr-1">
                <div className="font-semibold text-slate-200 group-hover:text-aviation-300 truncate">
                  {s.title}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">{s.notes}</div>
              </div>
              <Play className="w-3.5 h-3.5 text-aviation-400 shrink-0 group-hover:scale-125 transition-transform" />
            </button>
          ))}
        </div>
      )}

    </div>
  );
};
