import React, { useState, useEffect } from 'react';
import { Globe, Check, AlertCircle, RefreshCw, X, Server, Wifi } from 'lucide-react';
import { getServerBaseUrl } from '../services/api';

interface ServerConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ServerConfigModal: React.FC<ServerConfigModalProps> = ({ isOpen, onClose }) => {
  const [url, setUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const current = localStorage.getItem('afb_server_url') || getServerBaseUrl() || 'http://10.92.228.215:5000';
      setUrl(current);
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const cleanUrl = url.trim().replace(/\/+$/, '');
      const testEndpoint = cleanUrl ? `${cleanUrl}/api/health` : '/api/health';
      
      const res = await fetch(testEndpoint, { method: 'GET' });
      const data = await res.json();
      
      if (res.ok && data.status === 'ok') {
        setTestResult({
          success: true,
          message: 'Connected successfully! Live server responded with status 200 OK.'
        });
      } else {
        setTestResult({
          success: false,
          message: 'Server responded, but health check did not pass.'
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Cannot reach server. Please verify URL and internet connection.'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    const cleanUrl = url.trim().replace(/\/+$/, '');
    if (cleanUrl) {
      localStorage.setItem('afb_server_url', cleanUrl);
    } else {
      localStorage.removeItem('afb_server_url');
    }
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-aviation-500/20 text-aviation-400 border border-aviation-500/30">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Live Online Server URL</h3>
              <p className="text-xs text-slate-400">Configure Cloud or Local Server Connection</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Backend Server URL (HTTPS / HTTP)
            </label>
            <div className="relative">
              <Server className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-cloud-api.onrender.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-aviation-500 transition-colors"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Enter your live Render / Railway / Cloud URL, or local IP (e.g. <span className="font-mono text-slate-400">http://10.92.228.215:5000</span>).
            </p>
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {testResult.success ? (
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 text-xs font-semibold text-slate-200 hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin text-aviation-400' : ''}`} />
            {testing ? 'Testing...' : 'Test Ping'}
          </button>
          
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 px-4 rounded-xl bg-aviation-600 hover:bg-aviation-500 text-xs font-semibold text-white shadow-lg shadow-aviation-700/30 transition-all flex items-center justify-center gap-2"
          >
            <Check className="w-3.5 h-3.5" />
            Save & Connect
          </button>
        </div>
      </div>
    </div>
  );
};
