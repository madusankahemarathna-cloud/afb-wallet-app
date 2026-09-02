import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { DecodedQR } from '../types';
import { ApiService } from '../services/api';
import { sound } from '../utils/audio';
import confetti from 'canvas-confetti';
import { X, Store, Wallet, Lock, ShieldCheck, ArrowRight, AlertTriangle } from 'lucide-react';

interface PaymentConfirmModalProps {
  decoded: DecodedQR;
  onClose: () => void;
  onSuccess: (receipt: any) => void;
}

export const PaymentConfirmModal: React.FC<PaymentConfirmModalProps> = ({ decoded, onClose, onSuccess }) => {
  const { wallet, refreshWallet } = useAuth();
  const [amount, setAmount] = useState<string>(
    decoded.paymentDetails.fixedAmount ? decoded.paymentDetails.fixedAmount.toString() : ''
  );
  const [pin, setPin] = useState<string>('1234'); // Default pre-filled with demo PIN for effortless testing
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numAmount = parseFloat(amount) || 0;
  const currentBalance = wallet?.balance || 0;
  const isInsufficient = numAmount > currentBalance;
  const remainingBalance = Math.max(0, currentBalance - numAmount);

  const isDynamic = decoded.paymentDetails.type === 'DYNAMIC' && decoded.paymentDetails.fixedAmount !== null;

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numAmount <= 0) {
      setError('Please enter a valid payment amount');
      return;
    }

    if (isInsufficient) {
      setError(`Insufficient balance. Current balance is LKR ${currentBalance.toFixed(2)}`);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await ApiService.payQR({
        qrHash: decoded.outlet.qrHash,
        amount: numAmount,
        pin,
        invoiceRef: decoded.paymentDetails.invoiceRef || undefined,
        notes: notes || undefined
      });

      if (res.success && res.receipt) {
        sound.playSuccessBeep();
        
        // Trigger celebratory confetti
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });

        await refreshWallet();
        onSuccess(res.receipt);
      }
    } catch (err: any) {
      setError(err.message || 'Payment execution failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-aviation-500/20 text-aviation-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-100">Confirm Cashless Payment</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Outlet Banner */}
        <div className="p-4 bg-slate-950/50 border-b border-slate-800/80 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-slate-900 border border-emerald-500/30 flex items-center justify-center text-emerald-300 font-bold">
            <Store className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold text-slate-100">{decoded.outlet.name}</div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span className="text-emerald-400 font-medium">{decoded.outlet.category}</span>
              <span>•</span>
              <span className="font-mono">{decoded.outlet.qrHash}</span>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <form onSubmit={handlePay} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Amount Box */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Payment Amount (LKR)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm text-slate-400 font-bold">
                LKR
              </span>
              <input
                type="number"
                step="any"
                disabled={isDynamic}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={`w-full bg-slate-950 border rounded-xl pl-14 pr-4 py-3 text-xl font-bold font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-aviation-500 ${
                  isDynamic ? 'border-slate-800 bg-slate-950/40 text-emerald-400' : 'border-slate-700'
                }`}
                required
              />
            </div>
            {isDynamic && (
              <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-mono">
                ✓ Pre-filled bill amount from merchant terminal
                {decoded.paymentDetails.invoiceRef && ` (Ref: ${decoded.paymentDetails.invoiceRef})`}
              </p>
            )}
          </div>

          {/* Balance Preview Card */}
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5 text-xs font-mono">
            <div className="flex justify-between text-slate-400">
              <span className="flex items-center gap-1"><Wallet className="w-3.5 h-3.5" /> Current Balance:</span>
              <span className="text-slate-200">LKR {currentBalance.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Remaining Balance:</span>
              <span className={isInsufficient ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                LKR {remainingBalance.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Note / Reference (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Lunch with Squadron, Welfare goods"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-aviation-500"
            />
          </div>

          {/* PIN Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-aviation-400" /> Wallet Security PIN
            </label>
            <input
              type="password"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="•••• (Demo: 1234)"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-center text-lg font-mono font-bold tracking-widest text-slate-100 placeholder-slate-600 focus:outline-none focus:border-aviation-500"
              required
            />
          </div>

          {/* Submit Pay Button */}
          <button
            type="submit"
            disabled={loading || isInsufficient || numAmount <= 0}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg ${
              isInsufficient
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-700/30'
            }`}
          >
            {loading ? 'Processing Atomic Transfer...' : `Authorize LKR ${numAmount.toFixed(2)} Payment`}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
};
