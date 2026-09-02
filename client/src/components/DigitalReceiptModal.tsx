import React from 'react';
import { X, CheckCircle2, Shield, Printer, Download, Share2, Store } from 'lucide-react';

interface DigitalReceiptModalProps {
  receipt: any;
  onClose: () => void;
}

export const DigitalReceiptModal: React.FC<DigitalReceiptModalProps> = ({ receipt, onClose }) => {
  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = receipt.timestamp 
    ? new Date(receipt.timestamp).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'medium'
      })
    : new Date().toLocaleString();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in print:p-0 print:bg-white">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col print:border-none print:shadow-none print:bg-white print:text-black">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-100">Official Digital Receipt</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Body */}
        <div className="p-6 space-y-6 print:p-4">
          
          {/* Header Seal */}
          <div className="text-center space-y-1 relative">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mb-2">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            
            <div className="text-xs uppercase tracking-widest text-slate-400 font-bold">
              Air Force Base Welfare Project
            </div>
            <h2 className="text-lg font-extrabold text-slate-100 print:text-black font-sans">
              Closed-Loop Payment Verified
            </h2>

            {/* Paid Stamp Badge */}
            <div className="inline-block mt-2 px-3 py-0.5 rounded-full border-2 border-emerald-500 text-emerald-400 font-mono text-xs font-black tracking-widest uppercase rotate-[-2deg]">
              ✓ TRANSACTION SETTLED
            </div>
          </div>

          {/* Amount Hero */}
          <div className="bg-slate-950/80 rounded-xl p-4 text-center border border-slate-800 print:bg-slate-100 print:border-slate-300">
            <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">Amount Paid</div>
            <div className="text-3xl font-extrabold text-emerald-400 print:text-emerald-700 font-mono mt-1">
              LKR {receipt.amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            {receipt.invoiceRef && (
              <div className="text-xs text-slate-400 font-mono mt-1">
                Invoice Ref: <span className="text-slate-200">{receipt.invoiceRef}</span>
              </div>
            )}
          </div>

          {/* Transaction Metadata Grid */}
          <div className="space-y-3 text-xs border-y border-slate-800/80 py-4 print:border-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">Reference ID:</span>
              <span className="font-mono font-bold text-slate-200 print:text-black">{receipt.referenceId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">Merchant Outlet:</span>
              <span className="font-semibold text-slate-200 print:text-black flex items-center gap-1">
                <Store className="w-3.5 h-3.5 text-emerald-400" />
                {receipt.outletName || receipt.receiverName || 'Base Outlet'}
              </span>
            </div>
            {receipt.category && (
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Category:</span>
                <span className="text-slate-300 print:text-black">{receipt.category}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">Customer:</span>
              <span className="text-slate-200 print:text-black font-medium">
                {receipt.senderName} ({receipt.senderServiceNo})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">Date & Time:</span>
              <span className="font-mono text-slate-300 print:text-black">{formattedDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">Payment Protocol:</span>
              <span className="text-aviation-400 font-mono text-[11px]">ACID Double-Entry QR</span>
            </div>
          </div>

          {/* Security Watermark */}
          <div className="text-center text-[10px] text-slate-500 font-mono">
            SECURITY VERIFIED BY BASE FINANCE SYSTEM • AUTH: {receipt.referenceId?.slice(0, 8)}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950/70 border-t border-slate-800 flex items-center justify-between gap-2 print:hidden">
          <button
            onClick={handlePrint}
            className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 px-3 rounded-xl bg-aviation-600 hover:bg-aviation-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
