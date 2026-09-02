import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, Image, QrCode, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { sound } from '../utils/audio';

interface QRScannerModalProps {
  onClose: () => void;
  onScanSuccess: (qrData: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({ onClose, onScanSuccess }) => {
  const [activeMode, setActiveMode] = useState<'CAMERA' | 'PRESETS' | 'MANUAL' | 'FILE'>('CAMERA');
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (activeMode === 'CAMERA') {
      const qrRegionId = 'reader-region';
      const html5QrCode = new Html5Qrcode(qrRegionId);
      html5QrCodeRef.current = html5QrCode;

      html5QrCode
        .start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          (decodedText) => {
            sound.playScanBeep();
            html5QrCode.stop().then(() => {
              onScanSuccess(decodedText);
            });
          },
          () => {
            // scan frame error (expected while searching)
          }
        )
        .then(() => {
          setIsScanning(true);
          setCameraError(null);
        })
        .catch((err) => {
          console.warn('Camera access issue:', err);
          setCameraError('Camera access not available or blocked in this browser. Please use Quick Presets or File Upload.');
          setIsScanning(false);
        });

      return () => {
        if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
          html5QrCodeRef.current.stop().catch(() => {});
        }
      };
    }
  }, [activeMode]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const html5QrCode = new Html5Qrcode('file-reader-dummy');
      const result = await html5QrCode.scanFile(file, true);
      sound.playScanBeep();
      onScanSuccess(result);
    } catch (err: any) {
      alert('Could not decode QR code from this image. Please try another image or preset.');
    }
  };

  const handlePresetSelect = (payload: any) => {
    sound.playScanBeep();
    if (typeof payload === 'string') {
      onScanSuccess(payload);
    } else {
      onScanSuccess(JSON.stringify(payload));
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    sound.playScanBeep();
    onScanSuccess(manualCode.trim());
  };

  const presets = [
    {
      title: 'Eagle Canteen & Bakery',
      category: 'Canteen',
      amount: 350.00,
      ref: 'INV-8812',
      items: '2x Tea + 1x Egg Bun',
      payload: {
        type: 'DYNAMIC',
        qrHash: 'AFB-OUTLET-CANTEEN-01',
        outletName: 'Eagle Welfare Canteen & Bakery',
        amount: 350.00,
        invoiceRef: 'INV-8812',
        timestamp: Date.now()
      }
    },
    {
      title: 'Fresh Yoghurt Project',
      category: 'Yoghurt Project',
      amount: 600.00,
      ref: 'INV-YOG-44',
      items: '4x Sweet Treacle Yoghurt Cups',
      payload: {
        type: 'DYNAMIC',
        qrHash: 'AFB-OUTLET-YOGHURT-02',
        outletName: 'Fresh Yoghurt & Dairy Project',
        amount: 600.00,
        invoiceRef: 'INV-YOG-44',
        timestamp: Date.now()
      }
    },
    {
      title: 'Officers\' & Airmen Salon',
      category: 'Salon',
      amount: 1200.00,
      ref: 'INV-SLN-09',
      items: 'Hair Grooming & Shave',
      payload: {
        type: 'DYNAMIC',
        qrHash: 'AFB-OUTLET-SALON-03',
        outletName: 'Officers\' & Airmen Grooming Salon',
        amount: 1200.00,
        invoiceRef: 'INV-SLN-09',
        timestamp: Date.now()
      }
    },
    {
      title: 'Tombola Stall (Open Bill)',
      category: 'Tombola Stall',
      amount: null, // Static QR (flexible amount)
      ref: null,
      items: 'Static QR (Enter custom token amount)',
      payload: {
        type: 'STATIC',
        qrHash: 'AFB-OUTLET-TOMBOLA-04',
        outletName: 'Annual Tombola & Raffle Stall'
      }
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-aviation-500/20 text-aviation-400 border border-aviation-500/30">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Scan Merchant QR Code</h3>
              <p className="text-xs text-slate-400">Aim at counter QR or select a test outlet</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 px-4 pt-2 gap-2 text-xs">
          <button
            onClick={() => setActiveMode('CAMERA')}
            className={`pb-2.5 px-3 font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
              activeMode === 'CAMERA'
                ? 'border-aviation-500 text-aviation-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            Camera
          </button>
          <button
            onClick={() => setActiveMode('PRESETS')}
            className={`pb-2.5 px-3 font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
              activeMode === 'PRESETS'
                ? 'border-aviation-500 text-aviation-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Test Outlets (Quick Pay)
          </button>
          <button
            onClick={() => setActiveMode('MANUAL')}
            className={`pb-2.5 px-3 font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
              activeMode === 'MANUAL'
                ? 'border-aviation-500 text-aviation-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Enter Code
          </button>
          <button
            onClick={() => setActiveMode('FILE')}
            className={`pb-2.5 px-3 font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
              activeMode === 'FILE'
                ? 'border-aviation-500 text-aviation-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Image className="w-3.5 h-3.5" />
            Upload Image
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto">
          {activeMode === 'CAMERA' && (
            <div className="space-y-4">
              {cameraError ? (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex flex-col gap-3">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Camera not accessible in this environment</span>
                  </div>
                  <p className="text-slate-300">{cameraError}</p>
                  <button
                    onClick={() => setActiveMode('PRESETS')}
                    className="self-start px-3.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-colors flex items-center gap-1.5"
                  >
                    Use Quick Test Presets <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div>
                  <div id="reader-region" className="rounded-xl overflow-hidden bg-black/60 border border-slate-700 min-h-[260px] flex items-center justify-center text-xs text-slate-400" />
                  <p className="text-center text-[11px] text-slate-400 mt-3">Position the QR code inside the viewfinder rectangle</p>
                </div>
              )}
            </div>
          )}

          {activeMode === 'PRESETS' && (
            <div className="space-y-2.5">
              <p className="text-xs text-slate-400 mb-2">Simulate scanning a live Base Welfare project outlet:</p>
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePresetSelect(p.payload)}
                  className="w-full p-3 bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 hover:border-aviation-500/50 rounded-xl text-left transition-all flex items-center justify-between group"
                >
                  <div>
                    <div className="font-semibold text-xs text-slate-100 group-hover:text-aviation-300 transition-colors">
                      {p.title}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{p.items}</div>
                  </div>
                  <div className="text-right">
                    {p.amount !== null ? (
                      <span className="font-mono font-bold text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                        LKR {p.amount.toFixed(2)}
                      </span>
                    ) : (
                      <span className="font-mono text-xs text-aviation-400 bg-aviation-500/10 px-2 py-1 rounded-md border border-aviation-500/20">
                        Static (Open)
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {activeMode === 'MANUAL' && (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Outlet QR Hash / Identifier</label>
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="e.g. AFB-OUTLET-CANTEEN-01"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-aviation-500 font-mono"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-aviation-600 hover:bg-aviation-500 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                Decode & Proceed
              </button>
            </form>
          )}

          {activeMode === 'FILE' && (
            <div className="space-y-4">
              <div id="file-reader-dummy" className="hidden" />
              <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center hover:border-aviation-500/60 transition-colors bg-slate-950/40">
                <Image className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs text-slate-300 font-medium mb-1">Upload an image containing a QR code</p>
                <p className="text-[11px] text-slate-500 mb-4">PNG, JPG, WebP supported</p>
                <label className="cursor-pointer px-4 py-2 bg-slate-800 hover:bg-slate-700 text-aviation-300 rounded-xl text-xs font-semibold border border-slate-700 transition-colors">
                  Select File
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
