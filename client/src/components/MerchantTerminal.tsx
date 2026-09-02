import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ApiService } from '../services/api';
import { getSocket } from '../services/socket';
import { sound } from '../utils/audio';
import confetti from 'canvas-confetti';
import {
  Store,
  QrCode,
  DollarSign,
  TrendingUp,
  Receipt,
  ArrowDownLeft,
  Volume2,
  VolumeX,
  Printer,
  Sparkles,
  CheckCircle2,
  Clock,
  Landmark,
  RefreshCw,
  X,
  CreditCard
} from 'lucide-react';

export const MerchantTerminal: React.FC = () => {
  const { user, wallet, refreshWallet } = useAuth();
  
  const [stats, setStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [qrMode, setQrMode] = useState<'DYNAMIC' | 'STATIC'>('DYNAMIC');

  // Dynamic QR Form
  const [billAmount, setBillAmount] = useState<string>('');
  const [invoiceRef, setInvoiceRef] = useState<string>(`INV-${Math.floor(1000 + Math.random() * 9000)}`);
  const [itemNote, setItemNote] = useState<string>('');
  const [generatedQRUrl, setGeneratedQRUrl] = useState<string | null>(null);
  const [staticQRUrl, setStaticQRUrl] = useState<string | null>(null);

  // Sound Mute Toggle
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Live Toast for new payments
  const [incomingAlert, setIncomingAlert] = useState<any | null>(null);

  // Settlement Modal
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [settlementAmount, setSettlementAmount] = useState('');
  const [settleLoading, setSettleLoading] = useState(false);

  const activeOutlet = user?.outlets?.[0] || stats?.outlets?.[0] || {
    id: 'OUTLET-01',
    name: 'Eagle Welfare Canteen & Bakery',
    category: 'Canteen',
    qrHash: 'AFB-OUTLET-CANTEEN-01'
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await ApiService.getMerchantDashboardStats();
      if (res.success) {
        setStats(res.stats);
      }
    } catch (e) {
      console.warn('Failed to load merchant stats:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaticQR = async () => {
    try {
      const res = await ApiService.getStaticQR();
      if (res.success) {
        setStaticQRUrl(res.qrDataUrl);
      }
    } catch (e) {
      console.warn('Failed to load static QR:', e);
    }
  };

  const handleGenerateDynamicQR = async (amountToUse?: string) => {
    const amountNum = parseFloat(amountToUse || billAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    try {
      const res = await ApiService.generateDynamicQR({
        outletId: activeOutlet.id,
        amount: amountNum,
        invoiceRef,
        items: itemNote ? [itemNote] : []
      });

      if (res.success) {
        setGeneratedQRUrl(res.qrDataUrl);
      }
    } catch (e) {
      console.warn('Dynamic QR generation error:', e);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchStaticQR();
  }, [user]);

  // Regenerate dynamic QR whenever billAmount changes
  useEffect(() => {
    if (billAmount && parseFloat(billAmount) > 0) {
      handleGenerateDynamicQR(billAmount);
    } else {
      setGeneratedQRUrl(null);
    }
  }, [billAmount, invoiceRef]);

  // Real-time WebSocket payment notifications for Cashier
  useEffect(() => {
    const socket = getSocket();

    const handlePaymentReceived = (data: any) => {
      // 1. Play Cash Register audio chime
      if (soundEnabled) {
        sound.playCashRegister();
      }

      // 2. Confetti celebratory burst on cashier terminal
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });

      // 3. Show glowing visual alert banner
      setIncomingAlert(data);
      setTimeout(() => setIncomingAlert(null), 8000);

      // 4. Auto-reset dynamic invoice ref and amount
      setBillAmount('');
      setInvoiceRef(`INV-${Math.floor(1000 + Math.random() * 9000)}`);
      setItemNote('');
      setGeneratedQRUrl(null);

      // 5. Refresh metrics & balance
      fetchStats();
      refreshWallet();
    };

    socket.on('payment_received', handlePaymentReceived);

    return () => {
      socket.off('payment_received', handlePaymentReceived);
    };
  }, [soundEnabled]);

  const handleRequestSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(settlementAmount);
    if (isNaN(num) || num <= 0) return;

    try {
      setSettleLoading(true);
      const res = await ApiService.requestSettlement({
        outletId: activeOutlet.id,
        amount: num
      });
      if (res.success) {
        sound.playSuccessBeep();
        setShowSettlementModal(false);
        setSettlementAmount('');
        fetchStats();
        alert('Settlement request submitted successfully. Awaiting Base Finance payout.');
      }
    } catch (err: any) {
      alert(err.message || 'Settlement request failed');
    } finally {
      setSettleLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      
      {/* Real-time Incoming Payment Alert Toast */}
      {incomingAlert && (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 border-2 border-emerald-300 rounded-2xl p-4 shadow-2xl shadow-emerald-950/80 text-white flex items-center justify-between animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold">
              <Sparkles className="w-7 h-7 text-amber-300 animate-spin" />
            </div>
            <div>
              <div className="text-xs font-mono font-bold tracking-widest text-emerald-100 uppercase">
                💰 PAYMENT RECEIVED INSTANTLY
              </div>
              <div className="text-base font-extrabold font-sans">
                LKR {incomingAlert.amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })} received from {incomingAlert.senderName} ({incomingAlert.senderServiceNo})
              </div>
              <div className="text-xs text-emerald-100 font-mono">
                Ref: {incomingAlert.referenceId} {incomingAlert.invoiceRef ? `• Inv: ${incomingAlert.invoiceRef}` : ''}
              </div>
            </div>
          </div>
          <button
            onClick={() => setIncomingAlert(null)}
            className="p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Merchant Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold">
            <Store className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold font-mono">
                {activeOutlet.category}
              </span>
              <span className="text-xs text-slate-400 font-mono">{activeOutlet.qrHash}</span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-100 mt-1">{activeOutlet.name}</h1>
            <p className="text-xs text-slate-400">{activeOutlet.location || 'Base Headquarters Area'}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
              soundEnabled
                ? 'bg-slate-800 border-emerald-500/40 text-emerald-400'
                : 'bg-slate-800 border-slate-700 text-slate-500'
            }`}
            title="Toggle POS Cashier Chime Sound"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>{soundEnabled ? 'Chime ON' : 'Muted'}</span>
          </button>

          <button
            onClick={() => setShowSettlementModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-xs shadow-lg shadow-amber-950 transition-all"
          >
            <Landmark className="w-4 h-4" />
            Request Cashout Settlement
          </button>

          <button
            onClick={fetchStats}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
            <span>Today's Total Sales</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black font-mono text-emerald-400">
            LKR {stats?.todaySales ? stats.todaySales.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Live from 00:00 hrs today</div>
        </div>

        {/* Transactions Count */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
            <span>Bills Paid Today</span>
            <Receipt className="w-4 h-4 text-aviation-400" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black font-mono text-slate-100">
            {stats?.todayCount || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Transactions processed</div>
        </div>

        {/* Average Ticket Size */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
            <span>Average Ticket</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black font-mono text-amber-400">
            LKR {stats?.averageBill ? stats.averageBill.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Per transaction average</div>
        </div>

        {/* Merchant Wallet Balance */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
            <span>Available Balance</span>
            <CreditCard className="w-4 h-4 text-teal-400" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black font-mono text-white">
            LKR {stats?.walletBalance ? stats.walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1 font-mono">Ready for bank cashout</div>
        </div>
      </div>

      {/* Main Terminal Action: POS QR Generator (Col 7) & Live Sales Feed (Col 5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Cashier Terminal QR Box (Col 7) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
          
          {/* Mode Switcher */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-400" />
                Cashier QR Display
              </h3>
              <p className="text-xs text-slate-400">Display counter QR for customer scanning</p>
            </div>

            <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setQrMode('DYNAMIC')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  qrMode === 'DYNAMIC'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Dynamic Bill QR
              </button>
              <button
                onClick={() => setQrMode('STATIC')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  qrMode === 'STATIC'
                    ? 'bg-aviation-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Static Counter Stand
              </button>
            </div>
          </div>

          {qrMode === 'DYNAMIC' ? (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
              
              {/* Form Input (Col 6) */}
              <div className="sm:col-span-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Enter Bill Amount (LKR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm text-slate-400 font-bold">LKR</span>
                    <input
                      type="number"
                      value={billAmount}
                      onChange={(e) => setBillAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-14 pr-4 py-2.5 text-lg font-bold font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Preset Fast Keys */}
                <div className="grid grid-cols-4 gap-1.5">
                  {['100', '250', '350', '500', '600', '1000', '1200', '2000'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setBillAmount(p)}
                      className={`py-1.5 rounded-lg text-xs font-mono font-semibold border transition-all ${
                        billAmount === p
                          ? 'bg-emerald-600 text-white border-emerald-400'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Invoice Ref</label>
                    <input
                      type="text"
                      value={invoiceRef}
                      onChange={(e) => setInvoiceRef(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Item Notes</label>
                    <input
                      type="text"
                      value={itemNote}
                      onChange={(e) => setItemNote(e.target.value)}
                      placeholder="e.g. 2x Tea + Bun"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setBillAmount('');
                    setInvoiceRef(`INV-${Math.floor(1000 + Math.random() * 9000)}`);
                    setItemNote('');
                    setGeneratedQRUrl(null);
                  }}
                  className="text-xs text-slate-400 hover:text-slate-200 underline"
                >
                  Clear Bill Keypad
                </button>
              </div>

              {/* Dynamic QR Display (Col 6) */}
              <div className="sm:col-span-6 flex flex-col items-center justify-center p-4 bg-slate-950/80 rounded-2xl border border-slate-800 text-center">
                {generatedQRUrl ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-white rounded-2xl shadow-xl inline-block">
                      <img src={generatedQRUrl} alt="Dynamic POS QR" className="w-48 h-48 mx-auto" />
                    </div>
                    <div className="font-mono">
                      <div className="text-lg font-black text-emerald-400">
                        LKR {parseFloat(billAmount).toFixed(2)}
                      </div>
                      <div className="text-[11px] text-slate-400">{invoiceRef}</div>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Customer scans this screen with their AFB Wallet
                    </div>
                  </div>
                ) : (
                  <div className="py-12 px-4 text-center text-slate-500 space-y-2">
                    <QrCode className="w-12 h-12 mx-auto text-slate-700" />
                    <p className="text-xs">Type a bill amount on the left to generate the instant checkout QR code.</p>
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
              {staticQRUrl ? (
                <div className="p-4 bg-white rounded-2xl shadow-2xl inline-block border-4 border-aviation-500">
                  <img src={staticQRUrl} alt="Static Counter QR" className="w-56 h-56 mx-auto" />
                </div>
              ) : (
                <div className="w-56 h-56 bg-slate-950 rounded-2xl flex items-center justify-center text-xs text-slate-500">
                  Loading Static QR...
                </div>
              )}
              <div className="space-y-1">
                <div className="text-base font-bold text-slate-100">{activeOutlet.name}</div>
                <div className="text-xs text-slate-400 font-mono">HASH: {activeOutlet.qrHash}</div>
                <p className="text-xs text-slate-500 max-w-sm">
                  Display this static QR sticker at the cashier counter. Customers scan and input custom amounts.
                </p>
              </div>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700"
              >
                <Printer className="w-4 h-4" /> Print Counter QR Stand
              </button>
            </div>
          )}

        </div>

        {/* Live Incoming Orders Ticker (Col 5) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-aviation-400" />
                Live Cashier Sales Feed
              </h3>
              <p className="text-[11px] text-slate-400">Auto-updating real-time transactions</p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              ACTIVE
            </div>
          </div>

          <div className="divide-y divide-slate-800/60 max-h-[380px] overflow-y-auto pr-1">
            {!stats?.recentSales || stats.recentSales.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No orders recorded yet today.
              </div>
            ) : (
              stats.recentSales.map((sale: any) => (
                <div key={sale.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-200">{sale.customerName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {sale.customerServiceNo} • {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-mono font-bold text-emerald-400">
                    + LKR {sale.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Settlement Request Modal */}
      {showSettlementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-100">Merchant Cashout Settlement</h3>
              </div>
              <button
                onClick={() => setShowSettlementModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRequestSettlement} className="p-5 space-y-4">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono space-y-1">
                <div className="text-slate-400">Available Wallet Balance:</div>
                <div className="text-lg font-bold text-emerald-400">
                  LKR {stats?.walletBalance?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                </div>
                <div className="text-[11px] text-slate-500">Destination: {activeOutlet.bankName || 'BOC'} (A/C: {activeOutlet.bankAccountNo || '8004523910'})</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Settlement Amount (LKR)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm text-slate-400 font-bold">LKR</span>
                  <input
                    type="number"
                    value={settlementAmount}
                    onChange={(e) => setSettlementAmount(e.target.value)}
                    placeholder="e.g. 25000"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-14 pr-4 py-2.5 text-base font-bold font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={settleLoading}
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-amber-700/30 flex items-center justify-center gap-2"
              >
                {settleLoading ? 'Submitting...' : 'Submit End-of-Day Settlement'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
