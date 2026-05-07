import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  ArrowLeftRight,
  RefreshCw,
  Bookmark,
  Calendar as CalendarIcon,
  Clock,
  Users,
  ChevronRight,
  CheckCircle2,
  Info,
  Loader2,
  AlertCircle,
  UserCheck,
  ArrowRight,
  X,
  ClipboardList,
  Check,
  Phone,
  Search,
  ArrowUpDown,
  MessageSquare,
  Plus,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useShifts } from '../context/ShiftContext';
import { useAuth } from '../context/AuthContext';
import api from '../lib/axios';
import { toast } from '../lib/toast';

type Tab = 'wishlist' | 'emergency' | 'handoff' | 'swap' | 'myshifts';

interface SwapRequest {
  id: number;
  swap_type: 'claim' | 'exchange' | 'transfer';
  requester: number;
  requester_name: string;
  partner: number | null;
  partner_name: string | null;
  target_shift: number | null;
  offered_shift: number | null;
  status: string;
  message: string;
  expires_at: string;
  created_at: string;
  // extra fields joined from shifts
  target_shift_data?: any;
  offered_shift_data?: any;
}

export default function Registration() {
  const { user } = useAuth();
  const role = user?.role || 'employee';
  if (role === 'admin' || role === 'manager') return <AdminRegistration />;
  return <EmployeeRegistration />;
}

// ─── Admin: xét duyệt ─────────────────────────────────────────────────────────

type AdminTab = 'claims' | 'transfer' | 'exchange';

interface PendingClaim {
  assignmentId: number;
  shiftId: number | string;
  shiftLabel: string;
  shiftDate: string;
  shiftTime: string;
  isEmergency: boolean;
  userName: string;
  userPhone: string;
  submittedAt: string;
}

function AdminRegistration() {
  const { shifts, fetchShifts } = useShifts();
  const [activeTab, setActiveTab] = useState<AdminTab>('claims');
  const [pendingClaims, setPendingClaims] = useState<PendingClaim[]>([]);
  const [swapRequests, setSwapRequests] = useState<any[]>([]);
  const [swapLoading, setSwapLoading] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);

  // Build pending claims from shifts context
  useEffect(() => {
    const claims: PendingClaim[] = [];
    shifts.forEach(s => {
      (s.backendData?.assignments ?? []).forEach((a: any) => {
        if (a.status === 'pending') {
          claims.push({
            assignmentId: a.id,
            shiftId: s.id,
            shiftLabel: s.label,
            shiftDate: s.date,
            shiftTime: s.time,
            isEmergency: !!s.backendData?.is_emergency,
            userName: a.user_name || a.user?.full_name || `ID ${a.user_id ?? a.user?.id}`,
            userPhone: a.user_phone || a.user?.phone || '—',
            submittedAt: a.assigned_at,
          });
        }
      });
    });
    claims.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    setPendingClaims(claims);
  }, [shifts]);

  // Fetch swap requests needing admin approval (partner_accepted)
  useEffect(() => {
    setSwapLoading(true);
    api.get('/shifts/swap-requests/')
      .then(r => setSwapRequests(r.data.filter((s: any) => s.status === 'partner_accepted')))
      .catch(() => {})
      .finally(() => setSwapLoading(false));
  }, []);

  const pendingTransfers = swapRequests.filter(r => r.swap_type === 'transfer');
  const pendingExchanges = swapRequests.filter(r => r.swap_type === 'exchange');

  const handleClaimAction = async (claim: PendingClaim, approve: boolean) => {
    if (actionId !== null) return;
    setActionId(claim.assignmentId);
    try {
      await api.post(`/shifts/${claim.shiftId}/assignments/${claim.assignmentId}/${approve ? 'approve' : 'reject'}/`);
      await fetchShifts();
    } catch {
      // axios interceptor đã tự toast lỗi từ backend
    } finally {
      setActionId(null);
    }
  };

  const handleSwapAction = async (swapId: number, approve: boolean) => {
    if (actionId !== null) return;
    setActionId(swapId);
    try {
      await api.post(`/shifts/swap-requests/${swapId}/${approve ? 'approve' : 'reject'}/`);
      setSwapRequests(prev => prev.filter(r => r.id !== swapId));
    } catch {
      // axios interceptor đã tự toast lỗi từ backend
    } finally {
      setActionId(null);
    }
  };

  const tabs: { id: AdminTab; label: string; count: number; color: string }[] = [
    { id: 'claims',   label: 'Nguyện vọng ca', count: pendingClaims.length,   color: 'bg-[#005ac2]' },
    { id: 'transfer', label: 'Nhượng ca',       count: pendingTransfers.length, color: 'bg-amber-500' },
    { id: 'exchange', label: 'Đổi ca',           count: pendingExchanges.length, color: 'bg-purple-500' },
  ];

  const totalPending = pendingClaims.length + pendingTransfers.length + pendingExchanges.length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 sm:p-6 lg:p-8 pb-12">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <ClipboardList className="h-7 w-7 text-[#005ac2]" />
              Xét duyệt yêu cầu
            </h1>
            <p className="text-slate-500 font-medium mt-1">
              Duyệt hoặc từ chối nguyện vọng ca, nhượng ca và đổi ca
            </p>
          </div>
          {totalPending > 0 && (
            <span className="px-3 py-1.5 bg-red-100 text-red-700 text-sm font-black rounded-xl shrink-0">
              {totalPending} đang chờ
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 mb-6 bg-slate-100 p-1 rounded-xl">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold transition-all',
                activeTab === tab.id ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={cn('h-5 min-w-5 px-1 rounded-full text-[10px] font-black text-white flex items-center justify-center', tab.color)}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">

          {/* === Nguyện vọng === */}
          {activeTab === 'claims' && (
            <motion.div key="claims" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-4">
              {pendingClaims.length === 0 ? (
                <EmptyPending message="Không có nguyện vọng nào đang chờ duyệt" />
              ) : pendingClaims.map(claim => (
                <AdminCard
                  key={claim.assignmentId}
                  badge={claim.isEmergency ? 'Khẩn cấp' : 'Nguyện vọng'}
                  badgeColor={claim.isEmergency ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-[#005ac2]'}
                  title={claim.shiftLabel}
                  meta={[
                    { icon: <CalendarIcon className="h-3.5 w-3.5" />, text: claim.shiftDate },
                    { icon: <Clock className="h-3.5 w-3.5" />, text: claim.shiftTime },
                  ]}
                  person={{ name: claim.userName, sub: `${claim.userPhone} · ${new Date(claim.submittedAt).toLocaleString('vi-VN')}` }}
                  loading={actionId === claim.assignmentId}
                  onApprove={() => handleClaimAction(claim, true)}
                  onReject={() => handleClaimAction(claim, false)}
                />
              ))}
            </motion.div>
          )}

          {/* === Nhượng ca === */}
          {activeTab === 'transfer' && (
            <motion.div key="transfer" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-4">
              {swapLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="h-7 w-7 text-[#005ac2] animate-spin" /></div>
              ) : pendingTransfers.length === 0 ? (
                <EmptyPending message="Không có yêu cầu nhượng ca nào đang chờ duyệt" />
              ) : pendingTransfers.map((req: any) => (
                <AdminCard
                  key={req.id}
                  badge="Nhượng ca"
                  badgeColor="bg-amber-100 text-amber-700"
                  title={`${req.requester_name} nhượng ca cho ${req.partner_name || '—'}`}
                  meta={[
                    { icon: <ArrowRight className="h-3.5 w-3.5" />, text: `Ca nhượng #${req.offered_shift}` },
                    { icon: <Clock className="h-3.5 w-3.5" />, text: `Hết hạn: ${new Date(req.expires_at).toLocaleDateString('vi-VN')}` },
                  ]}
                  person={{ name: req.requester_name, sub: req.message || 'Không có ghi chú' }}
                  loading={actionId === req.id}
                  onApprove={() => handleSwapAction(req.id, true)}
                  onReject={() => handleSwapAction(req.id, false)}
                />
              ))}
            </motion.div>
          )}

          {/* === Đổi ca === */}
          {activeTab === 'exchange' && (
            <motion.div key="exchange" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-4">
              {swapLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="h-7 w-7 text-[#005ac2] animate-spin" /></div>
              ) : pendingExchanges.length === 0 ? (
                <EmptyPending message="Không có yêu cầu đổi ca nào đang chờ duyệt" />
              ) : pendingExchanges.map((req: any) => (
                <AdminCard
                  key={req.id}
                  badge="Đổi ca"
                  badgeColor="bg-purple-100 text-purple-700"
                  title={`${req.requester_name} đổi ca với ${req.partner_name || '—'}`}
                  meta={[
                    { icon: <RefreshCw className="h-3.5 w-3.5" />, text: `Ca đề xuất #${req.offered_shift} ↔ Ca mục tiêu #${req.target_shift}` },
                    { icon: <Clock className="h-3.5 w-3.5" />, text: `Hết hạn: ${new Date(req.expires_at).toLocaleDateString('vi-VN')}` },
                  ]}
                  person={{ name: req.requester_name, sub: req.message || 'Không có ghi chú' }}
                  loading={actionId === req.id}
                  onApprove={() => handleSwapAction(req.id, true)}
                  onReject={() => handleSwapAction(req.id, false)}
                />
              ))}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Shared sub-components ─────────────────────────────────────────────────────

function EmptyPending({ message }: { message: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center py-16 gap-3">
      <CheckCircle2 className="h-12 w-12 text-green-400" />
      <div className="text-center">
        <p className="font-black text-slate-700">{message}</p>
        <p className="text-sm text-slate-400 mt-1">Tất cả đã được xử lý</p>
      </div>
    </div>
  );
}

interface AdminCardProps {
  badge: string;
  badgeColor: string;
  title: string;
  meta: { icon: React.ReactNode; text: string }[];
  person: { name: string; sub: string };
  loading: boolean;
  onApprove: () => void;
  onReject: () => void;
}

function AdminCard({ badge, badgeColor, title, meta, person, loading, onApprove, onReject }: AdminCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={cn('px-2 py-0.5 text-[10px] font-black rounded uppercase tracking-wider', badgeColor)}>
              {badge}
            </span>
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-black rounded uppercase tracking-wider">
              Chờ duyệt
            </span>
          </div>
          <p className="font-black text-slate-900 text-base">{title}</p>
          <div className="flex items-center gap-4 mt-1.5 flex-wrap">
            {meta.map((m, i) => (
              <span key={i} className="flex items-center gap-1 text-sm text-slate-500">
                {m.icon} {m.text}
              </span>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-[#005ac2]/10 text-[#005ac2] flex items-center justify-center font-black text-xs shrink-0">
              {person.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">{person.name}</p>
              <p className="text-sm text-slate-400 truncate max-w-xs">{person.sub}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 sm:flex-col shrink-0">
          <button
            onClick={onReject}
            disabled={loading}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-700 text-sm font-black rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><X className="h-4 w-4" /> Từ chối</>}
          </button>
          <button
            onClick={onApprove}
            disabled={loading}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-[#005ac2] text-white text-sm font-black rounded-xl hover:bg-[#004fab] transition-colors shadow-lg shadow-[#005ac2]/20"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" /> Duyệt</>}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Employee registration ─────────────────────────────────────────────────────

function EmployeeRegistration() {
  const { shifts, claimShift, unclaimShift, isLoading } = useShifts();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('wishlist');
  const [claimingId, setClaimingId] = useState<string | number | null>(null);
  const [unclaimingId, setUnclaimingId] = useState<string | number | null>(null);
  const [myShifts, setMyShifts] = useState<any[]>([]);
  const [myShiftsLoading, setMyShiftsLoading] = useState(false);
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [swapLoading, setSwapLoading] = useState(false);
  const [respondingId, setRespondingId] = useState<number | null>(null);
  const [showSwapCreate, setShowSwapCreate] = useState(false);

  // Ca nguyện vọng: open, non-emergency, not already my shift
  const wishlistShifts = shifts.filter(s =>
    !s.backendData?.is_emergency &&
    s.backendData?.is_open &&
    !s.backendData?.assignments?.some((a: any) =>
      String(a.user ?? a.user_id) === String(user?.id) && a.status !== 'cancelled'
    )
  );

  // Ca khẩn cấp: emergency + open, not already my shift
  const emergencyShifts = shifts.filter(s =>
    s.backendData?.is_emergency &&
    s.backendData?.is_open &&
    !s.backendData?.assignments?.some((a: any) =>
      String(a.user ?? a.user_id) === String(user?.id) && a.status !== 'cancelled'
    )
  );

  // Ca nhượng: transfer requests where I am the partner (someone is giving me their shift)
  const handoffRequests = swapRequests.filter(
    r => r.swap_type === 'transfer' && String(r.partner) === String(user?.id) && r.status === 'pending'
  );

  // Ca đổi: exchange requests where I am the partner
  const swapExchangeRequests = swapRequests.filter(
    r => r.swap_type === 'exchange' && String(r.partner) === String(user?.id) && r.status === 'pending'
  );

  useEffect(() => {
    const fetchSwapRequests = async () => {
      setSwapLoading(true);
      try {
        const res = await api.get('/shifts/swap-requests/');
        setSwapRequests(res.data);
      } catch {
      } finally {
        setSwapLoading(false);
      }
    };
    fetchSwapRequests();
  }, []);

  const fetchMyShifts = async () => {
    setMyShiftsLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await api.get(`/shifts/my-shifts/?from=${today}`);
      setMyShifts(res.data);
    } catch {
    } finally {
      setMyShiftsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'myshifts') fetchMyShifts();
  }, [activeTab]);

  const handleClaim = async (shiftId: string | number) => {
    if (claimingId) return;
    if (!await toast.confirm('Bạn có chắc chắn muốn đăng ký ca này?', 'Đăng ký')) return;
    setClaimingId(shiftId);
    try {
      await claimShift(shiftId);
    } catch {
      // axios interceptor đã tự toast lỗi từ backend
    } finally {
      setClaimingId(null);
    }
  };

  const handleClaimEmergency = async (shiftId: string | number) => {
    if (claimingId) return;
    if (!await toast.confirm('Bạn có chắc chắn muốn nhận ca khẩn cấp này?', 'Nhận ca')) return;
    setClaimingId(shiftId);
    try {
      await claimShift(shiftId);
    } catch {
      // axios interceptor đã tự toast lỗi từ backend
    } finally {
      setClaimingId(null);
    }
  };

  const handleUnclaim = async (shiftId: string | number) => {
    if (unclaimingId) return;
    if (!await toast.confirm('Bạn có chắc chắn muốn hủy đăng ký ca này?', 'Hủy đăng ký')) return;
    setUnclaimingId(shiftId);
    try {
      await unclaimShift(shiftId);
      await fetchMyShifts();
    } catch {
    } finally {
      setUnclaimingId(null);
    }
  };

  const handleSwapRespond = async (swapId: number, accept: boolean) => {
    if (respondingId) return;
    const action = accept ? 'đồng ý' : 'từ chối';
    if (!await toast.confirm(`Bạn có chắc chắn muốn ${action} yêu cầu này?`, accept ? 'Đồng ý' : 'Từ chối')) return;
    setRespondingId(swapId);
    try {
      const endpoint = accept ? `partner-accept` : `partner-reject`;
      await api.post(`/shifts/swap-requests/${swapId}/${endpoint}/`);
      setSwapRequests(prev => prev.filter(r => r.id !== swapId));
    } catch {
      // axios interceptor đã tự toast lỗi từ backend
    } finally {
      setRespondingId(null);
    }
  };

  const myAssignedCount = shifts.filter(s =>
    s.backendData?.assignments?.some((a: any) => String(a.user ?? a.user_id) === String(user?.id))
  ).length;

  const tabs: { id: Tab; label: string; icon: any; count: number; color: string; badgeColor: string }[] = [
    { id: 'wishlist', label: 'Nguyện vọng', icon: Bookmark, count: wishlistShifts.length, color: 'text-[#005ac2]', badgeColor: 'bg-[#005ac2]' },
    { id: 'emergency', label: 'Khẩn cấp', icon: AlertTriangle, count: emergencyShifts.length, color: 'text-red-600', badgeColor: 'bg-red-500' },
    { id: 'myshifts', label: 'Ca của tôi', icon: CalendarIcon, count: 0, color: 'text-green-600', badgeColor: 'bg-green-500' },
    { id: 'handoff', label: 'Ca nhượng', icon: ArrowLeftRight, count: handoffRequests.length, color: 'text-amber-600', badgeColor: 'bg-amber-500' },
    { id: 'swap', label: 'Ca đổi', icon: RefreshCw, count: swapExchangeRequests.length, color: 'text-purple-600', badgeColor: 'bg-purple-500' },
  ];

  return (
    <>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 sm:p-6 lg:p-8 pb-12"
    >
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Đăng ký ca làm</h1>
            <p className="text-slate-500 font-medium mt-1">Đăng ký nguyện vọng, nhận ca khẩn cấp, ca nhượng hoặc ca đổi</p>
          </div>
          <div className="flex gap-3">
            <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Đang mở</span>
            </div>
            <button
              onClick={() => setShowSwapCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-xs font-black rounded-xl shadow-lg shadow-purple-200 hover:bg-purple-700 active:scale-95 transition-all"
            >
              <Plus className="h-4 w-4" />
              Tạo yêu cầu đổi ca
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 mb-6 bg-slate-100 p-1 rounded-xl w-full overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 min-w-0 flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap',
                activeTab === tab.id
                  ? 'bg-white shadow-sm text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <tab.icon className={cn('h-4 w-4 shrink-0', activeTab === tab.id ? tab.color : '')} />
              <span className="truncate">{tab.label}</span>
              {tab.count > 0 && (
                <span className={cn(
                  'flex h-4 min-w-4 px-1 items-center justify-center rounded-full text-[9px] font-black text-white shrink-0',
                  tab.badgeColor
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Content */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">

              {/* === Ca nguyện vọng === */}
              {activeTab === 'wishlist' && (
                <motion.div key="wishlist" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
                    Ca mở — đăng ký nguyện vọng, chờ quản lý duyệt
                  </p>
                  {isLoading && <LoadingSpinner />}
                  {!isLoading && wishlistShifts.length === 0 && (
                    <EmptyState icon={<CheckCircle2 className="h-10 w-10 text-green-400" />} message="Không có ca nguyện vọng nào hiện tại" />
                  )}
                  {!isLoading && wishlistShifts.map(shift => (
                    <ShiftCard
                      key={shift.id}
                      shift={shift}
                      variant="wishlist"
                      claiming={claimingId === shift.id}
                      onClaim={() => handleClaim(shift.id)}
                    />
                  ))}
                </motion.div>
              )}

              {/* === Ca khẩn cấp === */}
              {activeTab === 'emergency' && (
                <motion.div key="emergency" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
                    Ca khẩn cấp — xác nhận tức thì, không cần duyệt
                  </p>
                  {isLoading && <LoadingSpinner />}
                  {!isLoading && emergencyShifts.length === 0 && (
                    <EmptyState icon={<CheckCircle2 className="h-10 w-10 text-green-400" />} message="Không có ca khẩn cấp nào hiện tại" />
                  )}
                  {!isLoading && emergencyShifts.map(shift => (
                    <ShiftCard
                      key={shift.id}
                      shift={shift}
                      variant="emergency"
                      claiming={claimingId === shift.id}
                      onClaim={() => handleClaimEmergency(shift.id)}
                    />
                  ))}
                </motion.div>
              )}

              {/* === Ca của tôi === */}
              {activeTab === 'myshifts' && (
                <motion.div key="myshifts" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-3">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Ca đã đăng ký từ hôm nay</p>
                  {myShiftsLoading && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-green-500" /></div>}
                  {!myShiftsLoading && myShifts.length === 0 && (
                    <div className="text-center py-10 text-slate-400 text-sm font-medium">Bạn chưa có ca nào được xác nhận.</div>
                  )}
                  {!myShiftsLoading && myShifts.map((shift: any) => {
                    const shiftStart = new Date(`${shift.date}T${shift.start_time}`);
                    const hoursUntil = (shiftStart.getTime() - Date.now()) / 3600000;
                    const canCancel = hoursUntil >= 24;
                    return (
                      <div key={shift.id} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-2xl bg-green-50 border border-green-100 flex flex-col items-center justify-center shrink-0">
                            <span className="text-sm font-black text-green-700">{new Date(shift.date).getDate()}</span>
                            <span className="text-[10px] font-bold text-green-500 uppercase">T{new Date(shift.date).getMonth() + 1}</span>
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900">{shift.note || shift.start_time?.slice(0, 5)}</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <Clock className="h-3 w-3" />
                              {shift.start_time?.slice(0, 5)} – {shift.end_time?.slice(0, 5)}
                            </p>
                            {!canCancel && (
                              <p className="text-[10px] text-amber-500 font-bold mt-0.5">Còn {hoursUntil.toFixed(1)}h — không thể hủy</p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleUnclaim(shift.id)}
                          disabled={!canCancel || unclaimingId === shift.id}
                          className="px-3 py-1.5 rounded-xl text-xs font-black border transition-all disabled:opacity-40 disabled:cursor-not-allowed border-red-200 text-red-500 hover:bg-red-50 flex items-center gap-1.5"
                        >
                          {unclaimingId === shift.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                          Hủy
                        </button>
                      </div>
                    );
                  })}
                </motion.div>
              )}

              {/* === Ca nhượng === */}
              {activeTab === 'handoff' && (
                <motion.div key="handoff" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
                    Đồng nghiệp muốn nhượng ca cho bạn
                  </p>
                  {swapLoading && <LoadingSpinner />}
                  {!swapLoading && handoffRequests.length === 0 && (
                    <EmptyState icon={<ArrowLeftRight className="h-10 w-10 text-slate-300" />} message="Không có yêu cầu nhượng ca nào" />
                  )}
                  {!swapLoading && handoffRequests.map(req => (
                    <SwapCard
                      key={req.id}
                      request={req}
                      currentUserId={user?.id}
                      responding={respondingId === req.id}
                      onAccept={() => handleSwapRespond(req.id, true)}
                      onReject={() => handleSwapRespond(req.id, false)}
                    />
                  ))}
                </motion.div>
              )}

              {/* === Ca đổi === */}
              {activeTab === 'swap' && (
                <motion.div key="swap" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
                    Đồng nghiệp muốn đổi ca với bạn
                  </p>
                  {swapLoading && <LoadingSpinner />}
                  {!swapLoading && swapExchangeRequests.length === 0 && (
                    <EmptyState icon={<RefreshCw className="h-10 w-10 text-slate-300" />} message="Không có yêu cầu đổi ca nào" />
                  )}
                  {!swapLoading && swapExchangeRequests.map(req => (
                    <SwapCard
                      key={req.id}
                      request={req}
                      currentUserId={user?.id}
                      responding={respondingId === req.id}
                      onAccept={() => handleSwapRespond(req.id, true)}
                      onReject={() => handleSwapRespond(req.id, false)}
                    />
                  ))}
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* Right: Summary & Info */}
          <div className="space-y-4">
            <div className="bg-[#005ac2] rounded-2xl p-5 text-white shadow-xl shadow-[#005ac2]/20">
              <h2 className="text-xs font-black uppercase tracking-widest opacity-70 mb-4">Tóm tắt của bạn</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold opacity-70">Ca đã nhận tháng này</span>
                  <span className="text-lg font-black">{myAssignedCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold opacity-70">Ca nguyện vọng khả dụng</span>
                  <span className="text-lg font-black text-blue-200">{wishlistShifts.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold opacity-70">Ca khẩn cấp</span>
                  <span className="text-lg font-black text-red-300">{emergencyShifts.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold opacity-70">Yêu cầu chờ phản hồi</span>
                  <span className="text-lg font-black text-amber-300">{handoffRequests.length + swapExchangeRequests.length}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Lưu ý
              </h3>
              <ul className="space-y-3">
                <li className="flex gap-2.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#005ac2] mt-1.5 shrink-0"></div>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">Nguyện vọng cần quản lý duyệt mới có hiệu lực.</p>
                </li>
                <li className="flex gap-2.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-500 mt-1.5 shrink-0"></div>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">Ca khẩn cấp được xác nhận tự động ngay khi nhận.</p>
                </li>
                <li className="flex gap-2.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></div>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">Ca nhượng/đổi cần cả hai bên đồng ý và quản lý xác nhận.</p>
                </li>
              </ul>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider mb-1">Cần hỗ trợ?</h4>
                <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                  Liên hệ quản lý trực tiếp hoặc dùng Trợ lý AI để được hướng dẫn.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>

    <AnimatePresence>
      {showSwapCreate && (
        <SwapCreateModal
          onClose={() => setShowSwapCreate(false)}
        />
      )}
    </AnimatePresence>
    </>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="flex justify-center py-10">
      <Loader2 className="h-7 w-7 text-[#005ac2] animate-spin" />
    </div>
  );
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm">
      <div className="flex justify-center mb-3">{icon}</div>
      <p className="text-sm font-bold text-slate-500">{message}</p>
    </div>
  );
}

interface ShiftCardProps {
  shift: any;
  variant: 'wishlist' | 'emergency';
  claiming: boolean;
  onClaim: () => void;
}

function ShiftCard({ shift, variant, claiming, onClaim }: ShiftCardProps) {
  const filled = shift.backendData?.assignments?.length ?? 0;
  const max = shift.backendData?.max_workers ?? 1;
  const multiplier = parseFloat(shift.backendData?.salary_multiplier ?? '1');

  return (
    <motion.div
      whileHover={{ y: -3 }}
      className={cn(
        'bg-white rounded-2xl p-5 shadow-sm border transition-all hover:shadow-md',
        variant === 'emergency' ? 'border-red-100' : 'border-slate-100'
      )}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {variant === 'emergency' && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-black rounded uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Khẩn cấp
              </span>
            )}
            {variant === 'wishlist' && (
              <span className="px-2 py-0.5 bg-blue-50 text-[#005ac2] text-[10px] font-black rounded uppercase tracking-wider flex items-center gap-1">
                <Bookmark className="h-3 w-3" /> Nguyện vọng
              </span>
            )}
            {multiplier > 1 && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-black rounded">
                x{multiplier} lương
              </span>
            )}
          </div>
          <h3 className="text-base font-black text-slate-900">{shift.label}</h3>
          <div className="flex items-center gap-4 mt-1.5">
            <div className="flex items-center gap-1.5 text-slate-500">
              <CalendarIcon className="h-3.5 w-3.5" />
              <span className="text-sm font-bold">{shift.date}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-sm font-bold">{shift.time}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <Users className="h-4 w-4" />
          <span><span className="text-[#005ac2]">{filled}/{max}</span> đã đăng ký</span>
        </div>
        <button
          onClick={onClaim}
          disabled={claiming}
          className={cn(
            'px-5 py-2 text-white text-xs font-black rounded-xl shadow-lg transition-all flex items-center gap-2 uppercase tracking-widest',
            variant === 'emergency'
              ? 'bg-red-500 shadow-red-200 hover:bg-red-600 hover:scale-105 active:scale-95'
              : 'bg-[#005ac2] shadow-[#005ac2]/20 hover:bg-[#004fab] hover:scale-105 active:scale-95',
            claiming && 'opacity-70 cursor-not-allowed'
          )}
        >
          {claiming
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : variant === 'emergency'
              ? <><UserCheck className="h-4 w-4" /><span>Nhận ca</span></>
              : <><ChevronRight className="h-4 w-4" /><span>Đăng ký</span></>
          }
        </button>
      </div>
    </motion.div>
  );
}

interface SwapCardProps {
  request: SwapRequest;
  currentUserId?: string;
  responding: boolean;
  onAccept: () => void;
  onReject: () => void;
}

function SwapCard({ request, responding, onAccept, onReject }: SwapCardProps) {
  const isTransfer = request.swap_type === 'transfer';
  const expiresAt = new Date(request.expires_at);
  const now = new Date();
  const hoursLeft = Math.max(0, Math.round((expiresAt.getTime() - now.getTime()) / 3600000));

  return (
    <motion.div
      whileHover={{ y: -3 }}
      className={cn(
        'bg-white rounded-2xl p-5 shadow-sm border transition-all hover:shadow-md',
        isTransfer ? 'border-amber-100' : 'border-purple-100'
      )}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className={cn(
              'px-2 py-0.5 text-[10px] font-black rounded uppercase tracking-wider flex items-center gap-1',
              isTransfer ? 'bg-amber-100 text-amber-700' : 'bg-purple-100 text-purple-700'
            )}>
              {isTransfer ? <ArrowRight className="h-3 w-3" /> : <RefreshCw className="h-3 w-3" />}
              {isTransfer ? 'Ca nhượng' : 'Đề nghị đổi ca'}
            </span>
            {hoursLeft <= 12 && (
              <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-black rounded">
                còn {hoursLeft}h
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-slate-700">
            <span className="text-slate-900 font-black">{request.requester_name}</span>
            {isTransfer ? ' muốn nhượng ca cho bạn' : ' muốn đổi ca với bạn'}
          </p>
          {request.message && (
            <p className="text-sm text-slate-500 mt-1 italic">"{request.message}"</p>
          )}
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl p-3 mb-4 text-xs font-medium text-slate-600 space-y-2">
        {/* Ca được đề xuất (offered_shift) */}
        {request.offered_shift_data && (
          <div className="flex items-center gap-2">
            <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span>
              Ca nhượng:{' '}
              <span className="font-black text-slate-800">
                {new Date(request.offered_shift_data.date + 'T00:00:00').toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                {' · '}
                {request.offered_shift_data.start_time?.slice(0, 5)}–{request.offered_shift_data.end_time?.slice(0, 5)}
              </span>
            </span>
          </div>
        )}
        {/* Ca mục tiêu (target_shift) — chỉ có khi exchange */}
        {!isTransfer && request.target_shift_data && (
          <div className="flex items-center gap-2">
            <RefreshCw className="h-3.5 w-3.5 text-purple-400 shrink-0" />
            <span>
              Ca của bạn cần đổi:{' '}
              <span className="font-black text-slate-800">
                {new Date(request.target_shift_data.date + 'T00:00:00').toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                {' · '}
                {request.target_shift_data.start_time?.slice(0, 5)}–{request.target_shift_data.end_time?.slice(0, 5)}
              </span>
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          <span>Hết hạn: {expiresAt.toLocaleDateString('vi-VN')} {expiresAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-slate-50">
        <button
          onClick={onReject}
          disabled={responding}
          className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 text-xs font-black rounded-xl hover:bg-slate-200 active:scale-95 transition-all flex items-center justify-center gap-1.5"
        >
          <X className="h-4 w-4" /> Từ chối
        </button>
        <button
          onClick={onAccept}
          disabled={responding}
          className={cn(
            'flex-2 flex-grow px-4 py-2 text-white text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-lg',
            isTransfer
              ? 'bg-amber-500 shadow-amber-200 hover:bg-amber-600'
              : 'bg-purple-600 shadow-purple-200 hover:bg-purple-700',
            'active:scale-95',
            responding && 'opacity-70 cursor-not-allowed'
          )}
        >
          {responding
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <><UserCheck className="h-4 w-4" /> Đồng ý</>
          }
        </button>
      </div>
    </motion.div>
  );
}

// ─── SwapCreateModal ───────────────────────────────────────────────────────────

type SwapStep = 'offer' | 'target' | 'confirm';
type SearchMode = 'phone' | 'daterange';

interface CandidateShift {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  employees: { id: string; full_name: string; phone: string }[];
}

function SwapCreateModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<SwapStep>('offer');
  const [searchMode, setSearchMode] = useState<SearchMode>('phone');

  // Step 1 — offered shift
  const [myShifts, setMyShifts] = useState<any[]>([]);
  const [myShiftsLoading, setMyShiftsLoading] = useState(true);
  const [offeredShift, setOfferedShift] = useState<any>(null);

  // Step 2 phone mode
  const [phone, setPhone] = useState('');
  const [phoneSearching, setPhoneSearching] = useState(false);
  const [foundEmployee, setFoundEmployee] = useState<any>(null);
  const [phoneError, setPhoneError] = useState('');
  const [employeeShifts, setEmployeeShifts] = useState<CandidateShift[]>([]);
  const [employeeShiftsLoading, setEmployeeShiftsLoading] = useState(false);

  // Step 2 date range mode
  const today = new Date().toISOString().slice(0, 10);
  const minSwapDate = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })();
  const [fromDate, setFromDate] = useState(minSwapDate);
  const [toDate, setToDate] = useState('');
  const [rangeShifts, setRangeShifts] = useState<CandidateShift[]>([]);
  const [rangeLoading, setRangeLoading] = useState(false);

  // Selected target
  const [targetShift, setTargetShift] = useState<CandidateShift | null>(null);
  const [targetEmployee, setTargetEmployee] = useState<{ id: string; full_name: string } | null>(null);

  // Step 3
  const [message, setMessage] = useState('');
  const [expiresHours, setExpiresHours] = useState(48);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/shifts/my-shifts/', { params: { from: today } })
      .then(r => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().slice(0, 10);
        const eligible = r.data.filter((s: any) => s.date > tomorrowStr ||
          (s.date === tomorrowStr && (s.start_time ?? '23:59:59') > tomorrow.toTimeString().slice(0, 8))
        );
        setMyShifts(eligible);
      })
      .catch(() => {})
      .finally(() => setMyShiftsLoading(false));
  }, [today]);

  const handlePhoneSearch = async () => {
    if (!phone.trim()) return;
    setPhoneSearching(true);
    setPhoneError('');
    setFoundEmployee(null);
    setEmployeeShifts([]);
    setTargetShift(null);
    setTargetEmployee(null);
    try {
      const res = await api.get('/employees/lookup/', { params: { phone: phone.trim() } });
      setFoundEmployee(res.data);
      setEmployeeShiftsLoading(true);
      const shiftsRes = await api.get('/shifts/swap-candidates/', { params: { employee: res.data.id } });
      setEmployeeShifts(shiftsRes.data);
    } catch (err: any) {
      setPhoneError(err.response?.data?.error || 'Không tìm thấy nhân viên.');
    } finally {
      setPhoneSearching(false);
      setEmployeeShiftsLoading(false);
    }
  };

  const handleRangeSearch = async () => {
    setRangeLoading(true);
    setRangeShifts([]);
    setTargetShift(null);
    setTargetEmployee(null);
    try {
      const params: any = { from: fromDate };
      if (toDate) params.to = toDate;
      const res = await api.get('/shifts/swap-candidates/', { params });
      setRangeShifts(res.data);
    } catch {
    } finally {
      setRangeLoading(false);
    }
  };

  const selectTarget = (shift: CandidateShift, emp: { id: string; full_name: string }) => {
    setTargetShift(shift);
    setTargetEmployee(emp);
    setStep('confirm');
  };

  const handleSubmit = async () => {
    if (!offeredShift || !targetShift || !targetEmployee) return;
    setSubmitting(true);
    const expiresAt = new Date(Date.now() + expiresHours * 3600 * 1000).toISOString();
    try {
      await api.post('/shifts/swap-requests/', {
        swap_type: 'exchange',
        offered_shift: offeredShift.id,
        target_shift: targetShift.id,
        partner: targetEmployee.id,
        message,
        expires_at: expiresAt,
      });
      toast.success('Đã gửi yêu cầu đổi ca! Chờ đối tác xác nhận.');
      onClose();
    } catch {
    } finally {
      setSubmitting(false);
    }
  };

  const fmtTime = (t: string) => t.slice(0, 5);
  const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });

  const inputCls = 'w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-purple-200 focus:border-purple-400 focus:outline-none placeholder:text-slate-400 transition-colors';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-purple-100 rounded-2xl flex items-center justify-center">
              <ArrowUpDown className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="font-black text-slate-900 text-base">Tạo yêu cầu đổi ca</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                {(['offer', 'target', 'confirm'] as SwapStep[]).map((s, i) => (
                  <div key={s} className="flex items-center gap-1">
                    <div className={cn('h-1.5 w-6 rounded-full transition-colors', step === s ? 'bg-purple-600' : i < ['offer','target','confirm'].indexOf(step) ? 'bg-purple-300' : 'bg-slate-200')} />
                  </div>
                ))}
                <span className="text-[10px] font-bold text-slate-400 ml-1">
                  {step === 'offer' ? 'Chọn ca của bạn' : step === 'target' ? 'Tìm ca đổi' : 'Xác nhận'}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          <AnimatePresence mode="wait">

            {/* Step 1 — Offered shift */}
            {step === 'offer' && (
              <motion.div key="offer" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Chọn ca của bạn muốn đổi</p>
                {myShiftsLoading && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-purple-500" /></div>}
                {!myShiftsLoading && myShifts.length === 0 && (
                  <div className="text-center py-8 text-sm text-slate-500 font-medium">Không có ca nào đủ điều kiện đổi (yêu cầu trước ít nhất 1 ngày).</div>
                )}
                {myShifts.map(shift => (
                  <button
                    key={shift.id}
                    onClick={() => { setOfferedShift(shift); setStep('target'); }}
                    className={cn(
                      'w-full text-left p-4 rounded-2xl border-2 transition-all',
                      offeredShift?.id === shift.id ? 'border-purple-500 bg-purple-50' : 'border-slate-100 bg-white hover:border-purple-200'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-black text-slate-900">{fmtDate(shift.date)}</p>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          <Clock className="inline h-3 w-3 mr-1" />{fmtTime(shift.start_time)} – {fmtTime(shift.end_time)}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300" />
                    </div>
                  </button>
                ))}
              </motion.div>
            )}

            {/* Step 2 — Find target */}
            {step === 'target' && (
              <motion.div key="target" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                {/* Mode tabs */}
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setSearchMode('phone')}
                    className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all', searchMode === 'phone' ? 'bg-white shadow-sm text-purple-700' : 'text-slate-500')}
                  >
                    <Phone className="h-3.5 w-3.5" /> Tìm theo SĐT
                  </button>
                  <button
                    onClick={() => setSearchMode('daterange')}
                    className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all', searchMode === 'daterange' ? 'bg-white shadow-sm text-purple-700' : 'text-slate-500')}
                  >
                    <CalendarIcon className="h-3.5 w-3.5" /> Chọn khoảng thời gian
                  </button>
                </div>

                {searchMode === 'phone' && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        value={phone}
                        onChange={e => { setPhone(e.target.value); setPhoneError(''); }}
                        className={inputCls}
                        placeholder="Số điện thoại đồng nghiệp"
                        onKeyDown={e => e.key === 'Enter' && handlePhoneSearch()}
                      />
                      <button
                        onClick={handlePhoneSearch}
                        disabled={phoneSearching || !phone.trim()}
                        className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1.5 transition-all shrink-0"
                      >
                        {phoneSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        Tìm
                      </button>
                    </div>
                    {phoneError && (
                      <p className="text-xs text-red-500 font-medium flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" />{phoneError}</p>
                    )}
                    {foundEmployee && (
                      <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-sm">
                        <p className="font-black text-slate-900">{foundEmployee.full_name}</p>
                        <p className="text-xs text-slate-500">{foundEmployee.phone}</p>
                      </div>
                    )}
                    {employeeShiftsLoading && <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-purple-500" /></div>}
                    {!employeeShiftsLoading && foundEmployee && employeeShifts.length === 0 && (
                      <p className="text-xs text-slate-500 text-center py-4">Không có ca sắp tới.</p>
                    )}
                    {employeeShifts.map(shift => (
                      <button
                        key={shift.id}
                        onClick={() => selectTarget(shift, shift.employees[0])}
                        className="w-full text-left p-4 rounded-2xl border-2 border-slate-100 bg-white hover:border-purple-300 transition-all"
                      >
                        <p className="text-sm font-black text-slate-900">{fmtDate(shift.date)}</p>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          <Clock className="inline h-3 w-3 mr-1" />{fmtTime(shift.start_time)} – {fmtTime(shift.end_time)}
                        </p>
                      </button>
                    ))}
                  </div>
                )}

                {searchMode === 'daterange' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Từ ngày</label>
                        <input type="date" value={fromDate} min={minSwapDate} onChange={e => setFromDate(e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Đến ngày</label>
                        <input type="date" value={toDate} min={fromDate} onChange={e => setToDate(e.target.value)} className={inputCls} />
                      </div>
                    </div>
                    <button
                      onClick={handleRangeSearch}
                      disabled={rangeLoading}
                      className="w-full py-2.5 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                    >
                      {rangeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      Tìm ca
                    </button>
                    {rangeShifts.length === 0 && !rangeLoading && toDate && (
                      <p className="text-xs text-slate-500 text-center py-2">Không có ca nào trong khoảng này.</p>
                    )}
                    <div className="space-y-3">
                      {rangeShifts.map(shift => (
                        <div key={shift.id} className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
                          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                            <p className="text-xs font-black text-slate-700">
                              {fmtDate(shift.date)} · {fmtTime(shift.start_time)} – {fmtTime(shift.end_time)}
                            </p>
                          </div>
                          <div className="divide-y divide-slate-50">
                            {shift.employees.map(emp => (
                              <button
                                key={emp.id}
                                onClick={() => selectTarget(shift, emp)}
                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-purple-50 transition-colors group"
                              >
                                <div className="text-left">
                                  <p className="text-sm font-bold text-slate-900">{emp.full_name}</p>
                                  <p className="text-xs text-slate-400">{emp.phone}</p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-purple-500 transition-colors" />
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 3 — Confirm */}
            {step === 'confirm' && offeredShift && targetShift && targetEmployee && (
              <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Xác nhận yêu cầu đổi ca</p>

                <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-white rounded-xl p-3 border border-purple-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Ca của bạn</p>
                      <p className="text-sm font-black text-slate-900">{fmtDate(offeredShift.date)}</p>
                      <p className="text-xs text-slate-500">{fmtTime(offeredShift.start_time)} – {fmtTime(offeredShift.end_time)}</p>
                    </div>
                    <ArrowLeftRight className="h-5 w-5 text-purple-400 shrink-0" />
                    <div className="flex-1 bg-white rounded-xl p-3 border border-purple-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Ca của {targetEmployee.full_name.split(' ').pop()}</p>
                      <p className="text-sm font-black text-slate-900">{fmtDate(targetShift.date)}</p>
                      <p className="text-xs text-slate-500">{fmtTime(targetShift.start_time)} – {fmtTime(targetShift.end_time)}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="h-3 w-3" /> Lời nhắn (tuỳ chọn)
                  </label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={2}
                    className={inputCls + ' resize-none'}
                    placeholder="Lý do muốn đổi ca..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Thời hạn phản hồi</label>
                  <select value={expiresHours} onChange={e => setExpiresHours(Number(e.target.value))} className={inputCls}>
                    <option value={24}>24 giờ</option>
                    <option value={48}>48 giờ</option>
                    <option value={72}>72 giờ</option>
                    <option value={168}>1 tuần</option>
                  </select>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 shrink-0">
          {step !== 'offer' && (
            <button
              onClick={() => setStep(step === 'confirm' ? 'target' : 'offer')}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Quay lại
            </button>
          )}
          <button onClick={onClose} className={cn('py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors', step === 'offer' ? 'flex-1' : 'px-5')}>
            Hủy
          </button>
          {step === 'confirm' && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-black hover:bg-purple-700 transition-all shadow-lg shadow-purple-200 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
