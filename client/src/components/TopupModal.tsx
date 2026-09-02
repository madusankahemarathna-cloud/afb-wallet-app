import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ApiService } from '../services/api';
import { sound } from '../utils/audio';
import confetti from 'canvas-confetti';
import { X, CreditCard, Upload, CheckCircle2, Shield, Landmark, Sparkles, AlertCircle } from 'lucide-react';

interface TopupModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const TopupModal: React.FC<TopupModalProps> = ({ onClose, onSuccess }) => {
  const { user, refreshWallet } = useAuth();
  const [activeTab, setActiveTab] = useState<'CARD' | 'MANUAL'>('CARD');

  // Card Tab State
  const [cardAmount, setCardAmount] = useState<string>('2500');
  const [selectedCardId, setSelectedCardId] = useState<string>(user?.savedCards?.[0]?.id || '');
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardHolder, setCardHolder] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [isNewCard, setIsNewCard] = useState<boolean>(!user?.savedCards?.length);

  // Manual Slip State
  const [manualAmount, setManualAmount] = useState<string>('5000');
  const [bankRef, setBankRef] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [slipImage, setSlipImage] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const presetAmounts = [500, 1000, 2500, 5000, 10000];

  const handleCardTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(cardAmount);
    if (isNaN(amount) || amount <= 0) {
      setStatusMessage({ type: 'error', text: 'Please specify a valid top-up amount' });
      return;
    }

    try {
      setLoading(true);
      setStatusMessage(null);

      const payload: any = { amount };
      if (!isNewCard && selectedCardId) {
        payload.cardId = selectedCardId;
      } else {
        payload.cardNumber = cardNumber;
        payload.cardHolder = cardHolder || user?.name;
        payload.expiry = cardExpiry || '12/28';
      }

      const res = await ApiService.topupViaCard(payload);
      if (res.success) {
        sound.playSuccessBeep();
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
        await refreshWallet();
        setStatusMessage({
          type: 'success',
          text: `Success! LKR ${amount.toFixed(2)} credited instantly to your wallet.`
        });
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Card payment processing failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleManualTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(manualAmount);
    if (isNaN(amount) || amount <= 0) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid deposit amount' });
      return;
    }

    if (!bankRef.trim()) {
      setStatusMessage({ type: 'error', text: 'Bank deposit transaction reference is required' });
      return;
    }

    try {
      setLoading(true);
      setStatusMessage(null);

      // Generate a mock receipt slip SVG if not uploaded
      const finalSlip = slipImage || `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="360" height="220" viewBox="0 0 360 220"><rect width="100%" height="100%" fill="%230f172a"/><text x="50%" y="30%" font-size="14" font-weight="bold" fill="%2338a9f6" text-anchor="middle">BANK OF CEYLON TRANSFER SLIP</text><text x="50%" y="50%" font-size="12" fill="%2394a3b8" text-anchor="middle">Ref: ${bankRef}</text><text x="50%" y="70%" font-size="14" font-weight="bold" fill="%234ade80" text-anchor="middle">LKR ${amount.toFixed(2)}</text><text x="50%" y="85%" font-size="10" fill="%2364748b" text-anchor="middle">Deposited to AFB Welfare Project A/C 8004523910</text></svg>`;

      const res = await ApiService.submitManualTopup({
        amount,
        bankReference: bankRef,
        notes,
        slipImage: finalSlip
      });

      if (res.success) {
        sound.playSuccessBeep();
        setStatusMessage({
          type: 'success',
          text: 'Deposit request submitted. Base Finance Section has been notified for approval.'
        });
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Submission failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleSlipFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setSlipImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-aviation-500/20 text-aviation-400 border border-aviation-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Top-Up Digital Wallet</h3>
              <p className="text-xs text-slate-400">Add funds via instant card or verified bank transfer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 px-5 pt-3 gap-4 text-xs font-semibold">
          <button
            onClick={() => { setActiveTab('CARD'); setStatusMessage(null); }}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'CARD'
                ? 'border-aviation-500 text-aviation-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Instant Card Tokenization
          </button>
          <button
            onClick={() => { setActiveTab('MANUAL'); setStatusMessage(null); }}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'MANUAL'
                ? 'border-aviation-500 text-aviation-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Landmark className="w-4 h-4" />
            Manual Bank Deposit Slip
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {activeTab === 'CARD' ? (
            <form onSubmit={handleCardTopup} className="space-y-4">
              {/* Preset Chips */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Select Quick Amount (LKR)</label>
                <div className="grid grid-cols-5 gap-2">
                  {presetAmounts.map((p) => (
                    <button
                      type="button"
                      key={p}
                      onClick={() => setCardAmount(p.toString())}
                      className={`py-2 rounded-xl text-xs font-mono font-bold transition-all border ${
                        cardAmount === p.toString()
                          ? 'bg-aviation-600 text-white border-aviation-400 shadow-md shadow-aviation-700/30'
                          : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      +{p >= 1000 ? `${p / 1000}k` : p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Amount */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Custom Amount</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm text-slate-400 font-bold">LKR</span>
                  <input
                    type="number"
                    value={cardAmount}
                    onChange={(e) => setCardAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-14 pr-4 py-2.5 text-base font-bold font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-aviation-500"
                    required
                  />
                </div>
              </div>

              {/* Saved Cards selector */}
              {user?.savedCards && user.savedCards.length > 0 && !isNewCard && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs text-slate-300">
                    <span className="font-medium">Tokenized Payment Card:</span>
                    <button
                      type="button"
                      onClick={() => setIsNewCard(true)}
                      className="text-aviation-400 hover:underline text-[11px]"
                    >
                      + Use New Card
                    </button>
                  </div>
                  <div className="space-y-2">
                    {user.savedCards.map((c) => (
                      <label
                        key={c.id}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                          selectedCardId === c.id
                            ? 'bg-aviation-950/50 border-aviation-500 text-white shadow-md'
                            : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="savedCard"
                            checked={selectedCardId === c.id}
                            onChange={() => setSelectedCardId(c.id)}
                            className="text-aviation-600 focus:ring-aviation-500"
                          />
                          <div>
                            <div className="text-xs font-mono font-bold flex items-center gap-2">
                              <span>{c.cardType}</span>
                              <span className="text-slate-400">{c.maskedPan}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">Expires: {c.expiry} • {c.cardHolder}</div>
                          </div>
                        </div>
                        <CreditCard className="w-5 h-5 text-aviation-400" />
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* New Card Form */}
              {isNewCard && (
                <div className="space-y-3 p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-200">Enter Debit/Credit Card Details</span>
                    {user?.savedCards && user.savedCards.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsNewCard(false)}
                        className="text-aviation-400 hover:underline text-[11px]"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Card Number</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="4532 8910 2341 4819"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-aviation-500"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Cardholder Name</label>
                      <input
                        type="text"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        placeholder="K PERERA"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-aviation-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Expiry (MM/YY)</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="12/28"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-aviation-500"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-aviation-600 hover:bg-aviation-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-aviation-700/30 flex items-center justify-center gap-2"
              >
                {loading ? 'Processing Gateway Deposit...' : `Top-Up LKR ${parseFloat(cardAmount || '0').toFixed(2)} Instantly`}
              </button>
            </form>
          ) : (
            <form onSubmit={handleManualTopup} className="space-y-4">
              {/* Base Bank Instructions */}
              <div className="p-3 bg-aviation-950/40 border border-aviation-500/30 rounded-xl space-y-1 text-xs">
                <div className="font-bold text-aviation-300 flex items-center gap-1.5">
                  <Landmark className="w-4 h-4" /> Base Welfare Official Bank Account
                </div>
                <div className="font-mono text-slate-300">Bank: <span className="text-white font-semibold">Bank of Ceylon (BOC)</span></div>
                <div className="font-mono text-slate-300">Account No: <span className="text-emerald-400 font-bold">8004523910</span></div>
                <div className="font-mono text-slate-400 text-[11px]">Branch: Katunayake Base Central Branch</div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Deposited Amount (LKR)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm text-slate-400 font-bold">LKR</span>
                  <input
                    type="number"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-14 pr-4 py-2.5 text-base font-bold font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-aviation-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Bank Deposit Reference Number</label>
                <input
                  type="text"
                  value={bankRef}
                  onChange={(e) => setBankRef(e.target.value)}
                  placeholder="e.g. BOC-TX-998412"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-aviation-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Deposit Slip Screenshot / Photo (Optional)</label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer px-4 py-2 bg-slate-800 hover:bg-slate-700 text-aviation-300 rounded-xl text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-2">
                    <Upload className="w-3.5 h-3.5" /> Upload Slip
                    <input type="file" accept="image/*" onChange={handleSlipFileUpload} className="hidden" />
                  </label>
                  {slipImage && (
                    <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                      ✓ Slip Attached
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Remarks / Personnel Note</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Monthly Mess allocation deposit"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-aviation-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-700/30 flex items-center justify-center gap-2"
              >
                {loading ? 'Submitting...' : 'Submit Deposit for Finance Approval'}
              </button>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};
