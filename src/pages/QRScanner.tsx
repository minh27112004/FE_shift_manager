import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  QrCode, 
  X, 
  Flashlight, 
  Image as ImageIcon, 
  Info,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/axios';

export default function QRScanner() {
  const [tokenInput, setTokenInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [shiftInfo, setShiftInfo] = useState<any>(null);

  const navigate = useNavigate();

  // In a real app, this would be a react-qr-reader onResult callback
  const handleScanMock = async (tokenString: string) => {
    if (!tokenString) return;
    setStatus('scanning');
    
    // Simulate getting GPS
    const mockLat = 10.762622;
    const mockLng = 106.660172;

    try {
      const response = await api.post('/attendance/records/checkin/', {
        token: tokenString,
        latitude: mockLat,
        longitude: mockLng
      });
      
      setShiftInfo(response.data || { note: 'Check-in thành công' });
      setStatus('success');
      setMessage('Đã nhận diện ca làm thành công!');
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error: any) {
      console.error(error);
      setStatus('error');
      setMessage(error.response?.data?.detail || error.response?.data?.non_field_errors?.[0] || 'Mã QR không hợp lệ hoặc đã hết hạn.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="p-6 flex items-center justify-between relative z-10">
        <Link to="/">
          <button className="h-12 w-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white hover:bg-white/20 transition-all">
            <X className="h-6 w-6" />
          </button>
        </Link>
        <h1 className="text-white font-black uppercase tracking-[0.2em] text-sm">Quét mã QR</h1>
        <button className="h-12 w-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white hover:bg-white/20 transition-all">
          <Info className="h-6 w-6" />
        </button>
      </div>

      {/* Scanner Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden">
        {/* Background Simulation */}
        <div className="absolute inset-0 opacity-20">
          <img 
            src="https://picsum.photos/seed/office/1080/1920" 
            alt="Camera Background" 
            className="w-full h-full object-cover blur-sm"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Scanner Frame */}
        <div className="relative w-full max-w-xs aspect-square">
          <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-[#005ac2] rounded-tl-3xl"></div>
          <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-[#005ac2] rounded-tr-3xl"></div>
          <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-[#005ac2] rounded-bl-3xl"></div>
          <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-[#005ac2] rounded-br-3xl"></div>

          <motion.div 
            animate={{ top: ['0%', '100%', '0%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#005ac2] to-transparent shadow-[0_0_15px_rgba(0,90,194,0.8)] z-10"
          ></motion.div>

          <div className="absolute inset-0 flex items-center justify-center opacity-20">
            <QrCode className="h-32 w-32 text-white" />
          </div>
        </div>

        {/* Manual entry for testing */}
        <div className="relative mt-8 z-10 w-full max-w-xs flex gap-2">
          <input 
            type="text" 
            placeholder="Nhập mã QR token..." 
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            className="flex-1 bg-slate-900/80 border border-slate-700 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[#005ac2]"
          />
          <button 
            onClick={() => handleScanMock(tokenInput)}
            disabled={status === 'scanning'}
            className="bg-[#005ac2] text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center disabled:opacity-50"
          >
            {status === 'scanning' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Gửi'}
          </button>
        </div>

        <p className="mt-6 text-white/60 font-bold text-sm text-center max-w-[200px] leading-relaxed">
          Căn chỉnh mã QR vào khung hoặc nhập token phía trên để mô phỏng
        </p>
      </div>

      {/* Controls */}
      <div className="p-12 bg-gradient-to-t from-slate-950 to-transparent flex justify-center gap-8 relative z-10">
        <button className="flex flex-col items-center gap-3 group">
          <div className="h-16 w-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white group-hover:bg-white/20 transition-all">
            <Flashlight className="h-7 w-7" />
          </div>
          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Đèn pin</span>
        </button>
        <button className="flex flex-col items-center gap-3 group">
          <div className="h-16 w-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white group-hover:bg-white/20 transition-all">
            <ImageIcon className="h-7 w-7" />
          </div>
          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Thư viện</span>
        </button>
      </div>

      {/* Status Toasts */}
      <div className="fixed bottom-32 left-0 right-0 flex justify-center pointer-events-none z-50">
        <AnimatePresence>
          {status === 'success' && (
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="mx-6 p-4 bg-white rounded-2xl flex items-center gap-4 shadow-2xl pointer-events-auto max-w-sm w-full"
            >
              <div className="h-10 w-10 bg-green-100 text-green-600 rounded-xl flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Thành công</h4>
                <p className="text-sm text-slate-500 font-medium">{message}</p>
                {shiftInfo?.store_name && (
                  <p className="text-xs text-slate-400 font-medium mt-1">Tại {shiftInfo.store_name}</p>
                )}
              </div>
              <Link to="/">
                <button className="px-4 py-2 bg-[#005ac2] text-white text-[10px] font-black rounded-lg uppercase tracking-widest">
                  Xác nhận
                </button>
              </Link>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="mx-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-4 shadow-2xl pointer-events-auto max-w-sm w-full"
            >
              <div className="h-10 w-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center shrink-0">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-black text-red-800 uppercase tracking-wider">Lỗi</h4>
                <p className="text-sm text-red-600 font-medium">{message}</p>
              </div>
              <button 
                onClick={() => setStatus('idle')}
                className="px-4 py-2 bg-red-100 text-red-700 text-[10px] font-black rounded-lg uppercase tracking-widest hover:bg-red-200"
              >
                Đóng
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
