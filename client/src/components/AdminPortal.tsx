import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ApiService } from '../services/api';
import { sound } from '../utils/audio';
import confetti from 'canvas-confetti';
import {
  Landmark,
  Shield,
  Store,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Search,
  PlusCircle,
  QrCode,
  Printer,
  Eye,
  RefreshCw,
  X,
  Users,
  Download
} from 'lucide-react';

export const AdminPortal: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'TOPUPS' | 'SETTLEMENTS' | 'LEDGER' | 'OUTLETS'>('TOPUPS');

  const [overview, setOverview] = useState<any | null>(null);
  const [topupRequests, setTopupRequests] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [outlets, setOutlets] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [selectedSlip, setSelectedSlip] = useState<any | null>(null);

  // New Outlet Modal
  const [showAddOutlet, setShowAddOutlet] = useState(false);
  const [newOutletName, setNewOutletName] = useState('');
  const [newOutletCategory, setNewOutletCategory] = useState('Canteen');
  const [newOutletMerchantUserId, setNewOutletMerchantUserId] = useState('');
  const [newOutletLocation, setNewOutletLocation] = useState('');
  const [createdOutletQR, setCreatedOutletQR] = useState<string | null>(null);

  const fetchAllAdminData = async () => {
    try {
      setLoading(true);
      const [ovRes, topRes, setRes, ledRes, outRes] = await Promise.all([
        ApiService.getAdminOverview(),
        ApiService.getAdminTopups(),
        ApiService.getAdminSettlements(),
        ApiService.getAdminLedger(),
        ApiService.getAdminOutlets()
      ]);

      if (ovRes.success) setOverview(ovRes.overview);
      if (topRes.success) setTopupRequests(topRes.requests);
      if (setRes.success) setSettlements(setRes.settlements);
      if (ledRes.success) setLedger(ledRes.transactions);
      if (outRes.success) setOutlets(outRes.outlets);
    } catch (e) {
      console.warn('Failed to load admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAdminData();
  }, [user]);

  const handleApproveTopup = async (id: string) => {
    try {
      const res = await ApiService.approveTopup(id, 'Verified and approved by Base Finance Officer');
      if (res.success) {
        sound.playSuccessBeep();
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        fetchAllAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'Approval failed');
    }
  };

  const handleRejectTopup = async (id: string) => {
    const reason = prompt('Enter rejection reason for customer:', 'Deposit slip details unclear');
    if (!reason) return;

    try {
      const res = await ApiService.rejectTopup(id, reason);
      if (res.success) {
        fetchAllAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'Rejection failed');
    }
  };

  const handleApproveSettlement = async (id: string) => {
    try {
      const res = await ApiService.approveSettlement(id, 'Disbursed via Base Commercial Banking Portal');
      if (res.success) {
        sound.playSuccessBeep();
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        fetchAllAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'Settlement approval failed');
    }
  };

  const handleCreateOutlet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOutletName || !newOutletCategory) return;

    try {
      // Pick first merchant user if none selected
      const merchantId = newOutletMerchantUserId || (overview?.outlets?.[0]?.merchantUserId || user?.id);
      const res = await ApiService.createOutlet({
        name: newOutletName,
        category: newOutletCategory,
        merchantUserId: merchantId,
        location: newOutletLocation
      });

      if (res.success) {
        sound.playSuccessBeep();
        setCreatedOutletQR(res.qrDataUrl);
        fetchAllAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create outlet');
    }
  };

  const filteredLedger = ledger.filter((t) => {
    return (
      t.referenceId.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      t.description.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      (t.senderName && t.senderName.toLowerCase().includes(ledgerSearch.toLowerCase())) ||
      (t.receiverName && t.receiverName.toLowerCase().includes(ledgerSearch.toLowerCase()))
    );
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      
      {/* Admin Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
            <Landmark className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-bold font-mono">
                HEADQUARTERS FINANCE BRANCH
              </span>
              <span className="text-xs text-slate-400 font-mono">MASTER CONTROLLER</span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-100 mt-1">
              Base Closed-Loop Cashless Master Ledger
            </h1>
            <p className="text-xs text-slate-400">Strict ACID double-entry audit & approval section</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { setShowAddOutlet(true); setCreatedOutletQR(null); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-aviation-600 hover:bg-aviation-500 text-white font-bold text-xs shadow-lg shadow-aviation-950 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            Onboard Outlet
          </button>
          <button
            onClick={fetchAllAdminData}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Refresh All"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
            <span>Circulating Wallet Funds</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black font-mono text-emerald-400">
            LKR {overview?.totalCirculatingBalance ? overview.totalCirculatingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Base internal wallet deposits</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
            <span>Total Turnover Volume</span>
            <TrendingUp className="w-4 h-4 text-aviation-400" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black font-mono text-slate-100">
            LKR {overview?.totalVolume ? overview.totalVolume.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">{overview?.totalTransactions || 0} Total ledger entries</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
            <span>Pending Top-up Slips</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black font-mono text-amber-400">
            {overview?.pendingTopups || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Awaiting bank verification</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
            <span>Active Outlets</span>
            <Store className="w-4 h-4 text-teal-400" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black font-mono text-teal-300">
            {overview?.outletsCount || 0} Outlets
          </div>
          <div className="text-[11px] text-slate-500 mt-1">{overview?.usersCount || 0} Registered personnel</div>
        </div>
      </div>

      {/* Main Admin Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-6">
        
        {/* Navigation Tab Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('TOPUPS')}
              className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
                activeTab === 'TOPUPS'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Deposit Slip Queue
              {topupRequests.filter(r => r.status === 'PENDING').length > 0 && (
                <span className="bg-amber-400 text-slate-950 px-1.5 py-0.2 text-[10px] rounded-full font-black">
                  {topupRequests.filter(r => r.status === 'PENDING').length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('SETTLEMENTS')}
              className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
                activeTab === 'SETTLEMENTS'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Landmark className="w-3.5 h-3.5" />
              Merchant Cashouts
              {settlements.filter(s => s.status === 'PENDING').length > 0 && (
                <span className="bg-amber-400 text-slate-950 px-1.5 py-0.2 text-[10px] rounded-full font-black">
                  {settlements.filter(s => s.status === 'PENDING').length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('LEDGER')}
              className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
                activeTab === 'LEDGER'
                  ? 'bg-aviation-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Master Double-Entry Ledger
            </button>

            <button
              onClick={() => setActiveTab('OUTLETS')}
              className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
                activeTab === 'OUTLETS'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              Base Outlets & QRs
            </button>
          </div>
        </div>

        {/* Tab 1: Manual Bank Deposit Slips Queue */}
        {activeTab === 'TOPUPS' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-semibold">
                Showing {topupRequests.length} manual bank deposit requests
              </span>
            </div>

            <div className="divide-y divide-slate-800/80">
              {topupRequests.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No top-up verification requests found.
                </div>
              ) : (
                topupRequests.map((req) => (
                  <div key={req.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-100">{req.user?.name}</span>
                          <span className="font-mono text-[11px] text-aviation-400">({req.user?.serviceNo})</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                              req.status === 'PENDING'
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                : req.status === 'APPROVED'
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                            }`}
                          >
                            {req.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                          Bank Ref: <span className="text-slate-200 font-bold">{req.bankReference}</span> • {new Date(req.createdAt).toLocaleString()}
                        </div>
                        {req.notes && <div className="text-[11px] text-slate-400 italic">"{req.notes}"</div>}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <div className="text-right font-mono">
                        <div className="text-sm font-extrabold text-emerald-400">
                          LKR {req.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-slate-500">{req.wallet?.accountNumber}</div>
                      </div>

                      {req.slipImage && (
                        <button
                          onClick={() => setSelectedSlip(req)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 border border-slate-700"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Slip
                        </button>
                      )}

                      {req.status === 'PENDING' && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleApproveTopup(req.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors shadow-md shadow-emerald-950"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectTopup(req.id)}
                            className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-bold transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Merchant Settlement Approvals */}
        {activeTab === 'SETTLEMENTS' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-semibold">
                Showing {settlements.length} merchant cashout disbursement requests
              </span>
            </div>

            <div className="divide-y divide-slate-800/80">
              {settlements.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No settlement payout requests found.
                </div>
              ) : (
                settlements.map((s) => (
                  <div key={s.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                        <Store className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-100">{s.outlet?.name}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                              s.status === 'PENDING'
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            }`}
                          >
                            {s.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                          Disburse to: <span className="text-slate-200 font-bold">{s.bankName}</span> (A/C: {s.accountNo})
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Merchant: {s.merchantUser?.name} • Requested: {new Date(s.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <div className="text-right font-mono">
                        <div className="text-sm font-extrabold text-amber-400">
                          LKR {s.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-slate-500">Deducts Merchant Wallet</div>
                      </div>

                      {s.status === 'PENDING' && (
                        <button
                          onClick={() => handleApproveSettlement(s.id)}
                          className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-950"
                        >
                          Approve Bank Payout
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Master Double-Entry Ledger */}
        {activeTab === 'LEDGER' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  placeholder="Search ledger reference ID or description..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-aviation-500"
                />
              </div>

              <div className="text-xs text-slate-400 font-mono">
                Total Ledger Entries: <span className="text-white font-bold">{ledger.length}</span>
              </div>
            </div>

            {/* Ledger Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-mono border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">REFERENCE</th>
                    <th className="py-3 px-4">TYPE</th>
                    <th className="py-3 px-4">DESCRIPTION</th>
                    <th className="py-3 px-4">SENDER / FROM</th>
                    <th className="py-3 px-4">RECEIVER / TO</th>
                    <th className="py-3 px-4 text-right">AMOUNT (LKR)</th>
                    <th className="py-3 px-4">TIMESTAMP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredLedger.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-900/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-aviation-400">{row.referenceId}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            row.type === 'PURCHASE'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : row.type.includes('TOPUP')
                              ? 'bg-aviation-500/10 text-aviation-400 border border-aviation-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {row.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-200">{row.description}</td>
                      <td className="py-3 px-4 text-slate-400">{row.senderName}</td>
                      <td className="py-3 px-4 text-slate-400">{row.receiverName}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-100">
                        {row.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {new Date(row.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Outlets & Printable Stickers */}
        {activeTab === 'OUTLETS' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {outlets.map((o) => (
              <div key={o.id} className="bg-slate-950 rounded-2xl border border-slate-800 p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">
                      {o.category}
                    </span>
                    <h4 className="text-sm font-bold text-slate-100 mt-1">{o.name}</h4>
                  </div>
                  <Store className="w-5 h-5 text-slate-500" />
                </div>

                <div className="text-xs text-slate-400 space-y-1 font-mono">
                  <div>QR Hash: <span className="text-aviation-400 font-bold">{o.qrHash}</span></div>
                  <div>Merchant: <span className="text-slate-200">{o.merchantUser?.name}</span></div>
                  <div>Location: <span className="text-slate-300">{o.location || 'Headquarters'}</span></div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-emerald-400 font-mono font-bold">ACTIVE POS</span>
                  <button
                    onClick={() => window.print()}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium flex items-center gap-1 transition-colors"
                  >
                    <Printer className="w-3 h-3" /> Print Badge
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Slip Preview Modal */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-100">Bank Transfer Slip Document</h3>
              <button onClick={() => setSelectedSlip(null)} className="p-1 text-slate-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-black/50 p-2 rounded-xl border border-slate-800 flex items-center justify-center">
              <img src={selectedSlip.slipImage} alt="Deposit Slip" className="max-h-72 object-contain rounded-lg" />
            </div>
            <div className="font-mono text-xs space-y-1 text-slate-300">
              <div>Customer: <span className="text-white font-bold">{selectedSlip.user?.name}</span></div>
              <div>Ref: <span className="text-aviation-400 font-bold">{selectedSlip.bankReference}</span></div>
              <div>Amount: <span className="text-emerald-400 font-bold">LKR {selectedSlip.amount.toFixed(2)}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Onboard Outlet Modal */}
      {showAddOutlet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-aviation-400" />
                <h3 className="text-sm font-bold text-slate-100">Onboard New Base Outlet</h3>
              </div>
              <button onClick={() => setShowAddOutlet(false)} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {createdOutletQR ? (
                <div className="text-center space-y-3">
                  <div className="p-3 bg-white rounded-2xl shadow-xl inline-block">
                    <img src={createdOutletQR} alt="New Outlet QR" className="w-48 h-48 mx-auto" />
                  </div>
                  <div className="text-sm font-bold text-slate-100">{newOutletName}</div>
                  <div className="text-xs text-emerald-400 font-mono">QR Badge Generated & Ready for Printing!</div>
                  <button
                    onClick={() => setShowAddOutlet(false)}
                    className="w-full py-2.5 bg-aviation-600 hover:bg-aviation-500 text-white rounded-xl text-xs font-bold"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCreateOutlet} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Outlet / Project Name</label>
                    <input
                      type="text"
                      value={newOutletName}
                      onChange={(e) => setNewOutletName(e.target.value)}
                      placeholder="e.g. Welfare Bakery & Pastry Shop"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-aviation-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                    <select
                      value={newOutletCategory}
                      onChange={(e) => setNewOutletCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-aviation-500"
                    >
                      <option value="Canteen">Canteen & Bakery</option>
                      <option value="Yoghurt Project">Yoghurt & Farm Project</option>
                      <option value="Salon">Salon & Grooming</option>
                      <option value="Tombola Stall">Tombola & Event Stall</option>
                      <option value="Welfare Mart">Welfare Mart & Provision Store</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Location / Complex</label>
                    <input
                      type="text"
                      value={newOutletLocation}
                      onChange={(e) => setNewOutletLocation(e.target.value)}
                      placeholder="e.g. Sector 3, Officers' Mess Complex"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-aviation-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-aviation-600 hover:bg-aviation-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-aviation-700/30"
                  >
                    Generate Outlet & Official QR Badge
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
