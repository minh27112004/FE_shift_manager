import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Loader2, AlertCircle, CheckCircle2, Copy, RefreshCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '../lib/utils';
import api from '../lib/axios';

const QR_TTL = 30;

interface QRModalProps {
  shift: { id: number; label: string; time: string; date: string };
  onClose: () => void;
}

export function QRModal({ shift, onClose }: QRModalProps) {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(QR_TTL);

  const generate = async () => {
    setLoading(true);
    setError('');
    setCountdown(QR_TTL);
    try {
      const res = await api.post(`/attendance/qr/shift/${shift.id}/generate/`);
      setToken(res.data.token);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Không thể tạo QR.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh when countdown hits 0
  useEffect(() => {
    if (!token) return;
    if (countdown <= 0) { generate(); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, token]);

  useEffect(() => { generate(); }, []);

  const copyToken = () => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-[#005ac2]/10 to-[#005ac2]/5">
          <div>
            <h2 className="font-black text-slate-900 text-lg">Mã QR Check-in</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{shift.label} · {shift.time} · {shift.date}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-2xl text-slate-400 hover:text-slate-600 hover:bg-white transition-all shadow-2xs border border-slate-100 active:scale-95">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 flex flex-col items-center gap-5">
          {loading && <Loader2 className="h-8 w-8 text-[#005ac2] animate-spin" />}

          {error && (
            <div className="w-full flex items-center gap-2 bg-red-50 border border-red-100 rounded-2xl p-3.5">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
              <p className="text-xs text-red-700 font-bold">{error}</p>
            </div>
          )}

          {token && !loading && (
            <>
              <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 shadow-xs flex items-center justify-center bg-white">
                <QRCodeSVG value={token} size={220} />
              </div>

              <p className="text-[11px] text-slate-500 font-medium text-center leading-relaxed">
                QR có hiệu lực trong <span className="font-black text-slate-800 text-xs bg-slate-100 px-2 py-0.5 rounded-md">{countdown} giây</span>. Nhân viên quét mã hoặc nhập token bên dưới để check-in.
              </p>

              <div className="w-full flex gap-2 items-center bg-slate-50 p-1.5 rounded-2xl border border-slate-200/60">
                <code className="flex-1 px-3 py-2 text-xs font-black text-slate-700 font-mono truncate text-center">
                  {token}
                </code>
                <button
                  onClick={copyToken}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#005ac2] hover:text-white text-slate-600 transition-all font-bold text-xs flex items-center gap-1 shadow-2xs border border-slate-200/60 shrink-0 active:scale-95"
                >
                  {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Đã chép' : 'Sao chép'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 bg-slate-50/50">
          <button
            onClick={generate}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-slate-200 bg-white text-xs font-black text-slate-700 hover:bg-slate-50 shadow-2xs transition-all disabled:opacity-50 active:scale-95"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Tạo QR mới
          </button>
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl bg-[#005ac2] text-white text-xs font-black hover:bg-[#004fab] shadow-md transition-all active:scale-95">
            Đóng
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
