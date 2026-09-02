import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ApiService } from '../services/api';
import { getSocket } from '../services/socket';
import { DecodedQR, Transaction } from '../types';
import { QRScannerModal } from './QRScannerModal';
import { PaymentConfirmModal } from './PaymentConfirmModal';
import { DigitalReceiptModal } from './DigitalReceiptModal';
import { TopupModal } from './TopupModal';
import QRCode from 'qrcode';
import {
  QrCode,
  CreditCard,
  PlusCircle,
  Eye,
  EyeOff,
  Copy,
  Check,
  ArrowUpRight,
  ArrowDownLeft,
  Store,
  RefreshCw,
  Search,
  Shield,
  Receipt,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  X
} from 'lucide-react';

export const CustomerPortal: React.FC = () => {
  const { user, wallet, refreshWallet, refreshUser } = useAuth();
  
  const [showBalance, setShowBalance] = useState(true);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTxns, setLoadingTxns] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PURCHASE' | 'TOPUP'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showScanner, setShowScanner] = useState(false);
  const [decodedQR, setDecodedQR] = useState<DecodedQR | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<any | null>(null);
  const [showTopup, setShowTopup] = useState(false);
  const [showMyQR, setShowMyQR] = useState(false);
  const [myQRDataUrl, setMyQRDataUrl] = useState<string>('');

  // Pending topups list
  const [myTopupRequests, setMyTopupRequests] = useState<any[]>([]);

  const fetchTransactions = async () => {
    try {
      setLoadingTxns(true);
      const res = await ApiService.getTransactions();
      if (res.success) {
        setTransactions(res.transactions);
      }
    } catch (err) {
      console.warn('Failed to load transactions:', err);
    } finally {
      setLoadingTxns(false);
    }
  };

  const fetchTopupRequests = async () => {
    try {
      const res = await ApiService.getMyTopupRequests();
      if (res.success) {
        setMyTopupRequests(res.requests);
      }
    } catch (err) {
      console.warn('Failed to fetch topup requests:', err);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchTopupRequests();
  }, [user]);

  // Generate My QR code for receiving funds
  useEffect(() => {
    if (user && wallet) {
      const payload = {
        type: 'P2P_RECEIVE',
        serviceNo: user.serviceNo,
        accountNumber: wallet.accountNumber,
        name: user.name
      };
      QRCode.toDataURL(JSON.stringify(payload), {
        width: 300,
        margin: 2,
        color: { dark: '#072849', light: '#ffffff' }
      }).then(url => setMyQRDataUrl(url));
    }
  }, [user, wallet]);

  // Real-time socket events for top-up status updates
  useEffect(() => {
    const socket = getSocket();
    const handleTopupStatus = () => {
      refreshWallet();
      fetchTransactions();
      fetchTopupRequests();
    };

    socket.on('topup_status_changed', handleTopupStatus);
    return () => {
      socket.off('topup_status_changed', handleTopupStatus);
    };
  }, []);

  const handleCopyAccount = () => {
    if (wallet?.accountNumber) {
      navigator.clipboard.writeText(wallet.accountNumber);
      setCopiedAccount(true);
      setTimeout(() => setCopiedAccount(false), 2000);
    }
  };

  const handleScanSuccess = async (qrData: string) => {
    setShowScanner(false);
    try {
      const res = await ApiService.decodeQR(qrData);
      if (res.success) {
        setDecodedQR(res);
      }
    } catch (err: any) {
      alert(`Invalid QR code: ${err.message || 'Could not recognize outlet QR'}`);
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    const matchesFilter =
      activeFilter === 'ALL'
        ? true
        : activeFilter === 'PURCHASE'
        ? t.type === 'PURCHASE'
        : t.type.includes('TOPUP');

    const matchesSearch =
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.referenceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.counterparty && t.counterparty.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      
      {/* Top Banner / Welcome Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-aviation-600/20 border border-aviation-500/30 flex items-center justify-center text-aviation-400 font-bold">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-aviation-400 font-mono">AIR FORCE BASE WELFARE WALLET</div>
            <h1 className="text-base font-extrabold text-slate-100">{user?.name}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { refreshWallet(); fetchTransactions(); }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Refresh balance"
          >
            <RefreshCw className={`w-4 h-4 ${loadingTxns ? 'animate-spin' : ''}`} />
          </button>
          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-400">
            Status: <span className="text-emerald-400 font-bold">ACTIVE</span>
          </div>
        </div>
      </div>

      {/* Hero Wallet Card & Quick Action Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Military Digital Wallet Card (Col 7) */}
        <div className="lg:col-span-7">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c3f6e] via-[#072849] to-[#021324] border border-aviation-500/40 p-6 sm:p-7 shadow-2xl shadow-aviation-950/80 text-white transition-all hover:border-aviation-400/60">
            {/* Background Decorative Rings & Hologram */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-aviation-400/10 blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 right-10 w-32 h-32 rounded-full border border-aviation-400/10 pointer-events-none" />

            {/* Card Header */}
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-400/20 border border-amber-400/40 text-amber-400">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] tracking-widest text-aviation-300 font-mono uppercase">SRI LANKA AIR FORCE</div>
                  <div className="text-xs font-bold text-slate-100 tracking-wider font-sans">CLOSED-LOOP DIGITAL CARD</div>
                </div>
              </div>

              {/* Holographic Chip */}
              <div className="w-11 h-8 rounded-md bg-gradient-to-tr from-amber-300 via-amber-200 to-amber-500 border border-amber-400/60 shadow-inner flex items-center justify-center opacity-90">
                <div className="w-7 h-5 border border-amber-600/40 rounded-sm grid grid-cols-2 gap-0.5 p-0.5">
                  <div className="border border-amber-700/30 rounded-xs"></div>
                  <div className="border border-amber-700/30 rounded-xs"></div>
                </div>
              </div>
            </div>

            {/* Balance Display */}
            <div className="my-6 sm:my-8 relative z-10">
              <div className="flex items-center gap-2 text-xs text-aviation-300 font-mono">
                <span>AVAILABLE CASHLESS BALANCE</span>
                <button
                  onClick={() => setShowBalance(!showBalance)}
                  className="text-aviation-400 hover:text-white transition-colors"
                >
                  {showBalance ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="mt-1 flex items-baseline gap-2 font-mono">
                <span className="text-xl sm:text-2xl text-aviation-300 font-bold">LKR</span>
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-md">
                  {showBalance
                    ? wallet?.balance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : '••••••••'}
                </span>
              </div>
            </div>

            {/* Card Footer Info */}
            <div className="flex items-end justify-between relative z-10 pt-2 border-t border-aviation-500/20 font-mono">
              <div>
                <div className="text-[10px] text-aviation-400">VIRTUAL ACCOUNT ID</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm font-bold tracking-wider text-slate-100">{wallet?.accountNumber || 'WLT-10452'}</span>
                  <button
                    onClick={handleCopyAccount}
                    className="text-aviation-400 hover:text-white transition-colors p-1"
                    title="Copy Account ID"
                  >
                    {copiedAccount ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] text-aviation-400">SERVICE NO</div>
                <div className="text-sm font-bold text-amber-400">{user?.serviceNo}</div>
              </div>
            </div>

          </div>
        </div>

        {/* Action Hub Buttons (Col 5) */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-3">
          
          {/* Main Primary Action: Scan QR */}
          <button
            onClick={() => setShowScanner(true)}
            className="flex-1 p-5 rounded-2xl bg-gradient-to-r from-aviation-600 to-aviation-700 hover:from-aviation-500 hover:to-aviation-600 text-white border border-aviation-400/30 shadow-xl shadow-aviation-900/50 flex items-center justify-between group transition-all transform hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white group-hover:scale-105 transition-transform">
                <QrCode className="w-7 h-7 text-aviation-200" />
              </div>
              <div className="text-left">
                <div className="text-base font-extrabold font-sans">Scan Merchant QR</div>
                <div className="text-xs text-aviation-100 mt-0.5">Pay at Canteen, Salon, Yoghurt Stall</div>
              </div>
            </div>
            <ArrowUpRight className="w-6 h-6 text-aviation-300 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </button>

          {/* Secondary Action: Top-Up Wallet */}
          <button
            onClick={() => setShowTopup(true)}
            className="p-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-100 flex items-center justify-between group transition-all"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-sm font-bold">Top-Up Balance</div>
                <div className="text-[11px] text-slate-400">Card Instant Topup or Bank Slip</div>
              </div>
            </div>
            <ArrowDownLeft className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 transition-colors" />
          </button>

          {/* Tertiary Action: My QR Code */}
          <button
            onClick={() => setShowMyQR(true)}
            className="p-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-100 flex items-center justify-between group transition-all"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                <QrCode className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-sm font-bold">My Personal QR / Receive</div>
                <div className="text-[11px] text-slate-400">Display QR to receive welfare transfers</div>
              </div>
            </div>
            <ArrowUpRight className="w-5 h-5 text-slate-400 group-hover:text-amber-400 transition-colors" />
          </button>

        </div>

      </div>

      {/* Pending Manual Top-ups Status Alert (If any) */}
      {myTopupRequests.some(r => r.status === 'PENDING') && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="font-bold text-amber-300">Pending Manual Bank Deposit: </span>
              <span className="text-slate-300">
                You have a pending top-up request under review by Base Finance Section.
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowTopup(true)}
            className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 font-semibold transition-colors"
          >
            View Status
          </button>
        </div>
      )}

      {/* Transaction History & Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
        
        {/* History Header & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-aviation-400" />
              Transaction History
            </h3>
            <p className="text-xs text-slate-400">Instant digital receipts and ACID ledger records</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search transactions..."
                className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-aviation-500 w-40 sm:w-48"
              />
            </div>

            {/* Filter Chips */}
            <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setActiveFilter('ALL')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  activeFilter === 'ALL' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveFilter('PURCHASE')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  activeFilter === 'PURCHASE' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Purchases
              </button>
              <button
                onClick={() => setActiveFilter('TOPUP')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  activeFilter === 'TOPUP' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Top-ups
              </button>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="divide-y divide-slate-800/60">
          {filteredTransactions.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs space-y-2">
              <FileText className="w-8 h-8 mx-auto text-slate-600" />
              <p>No transactions found matching your criteria</p>
            </div>
          ) : (
            filteredTransactions.map((t) => {
              const isDebit = t.direction === 'DEBIT';
              const isPurchase = t.type === 'PURCHASE';

              return (
                <div
                  key={t.id}
                  onClick={() => setActiveReceipt(t)}
                  className="py-3.5 px-2 hover:bg-slate-800/40 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        isDebit
                          ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                          : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {isDebit ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200 group-hover:text-aviation-400 transition-colors">
                        {t.description}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                        <span>{t.referenceId}</span>
                        <span>•</span>
                        <span>{new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`text-xs font-mono font-bold ${
                        isDebit ? 'text-slate-100' : 'text-emerald-400'
                      }`}
                    >
                      {isDebit ? '-' : '+'} LKR {t.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <span className="inline-block mt-0.5 text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-slate-400">
                      Receipt View
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* Scanner Modal */}
      {showScanner && (
        <QRScannerModal
          onClose={() => setShowScanner(false)}
          onScanSuccess={handleScanSuccess}
        />
      )}

      {/* Payment Confirmation Modal */}
      {decodedQR && (
        <PaymentConfirmModal
          decoded={decodedQR}
          onClose={() => setDecodedQR(null)}
          onSuccess={(receipt) => {
            setDecodedQR(null);
            setActiveReceipt(receipt);
            fetchTransactions();
          }}
        />
      )}

      {/* Digital Receipt Modal */}
      {activeReceipt && (
        <DigitalReceiptModal
          receipt={activeReceipt}
          onClose={() => setActiveReceipt(null)}
        />
      )}

      {/* Topup Modal */}
      {showTopup && (
        <TopupModal
          onClose={() => setShowTopup(false)}
          onSuccess={() => {
            fetchTransactions();
            fetchTopupRequests();
          }}
        />
      )}

      {/* My Personal QR Modal */}
      {showMyQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 text-center space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-100">Personal Receive QR</h3>
              <button onClick={() => setShowMyQR(false)} className="p-1 text-slate-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            {myQRDataUrl && (
              <div className="p-3 bg-white rounded-2xl inline-block shadow-inner">
                <img src={myQRDataUrl} alt="Personal QR" className="w-52 h-52 mx-auto" />
              </div>
            )}
            <div className="font-mono text-xs text-slate-300 space-y-1">
              <div className="font-bold text-white">{user?.name}</div>
              <div className="text-aviation-400">{user?.serviceNo} • {wallet?.accountNumber}</div>
              <div className="text-[10px] text-slate-500">Scan to transfer funds directly to this personnel's wallet</div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
