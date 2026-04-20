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
  Check
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useShifts } from '../context/ShiftContext';
import { useAuth } from '../context/AuthContext';
import api from '../lib/axios';

type Tab = 'wishlist' | 'emergency' | 'handoff' | 'swap';

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
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Thao tác thất bại.');
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
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Thao tác thất bại.');
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
              <p className="text-xs text-slate-400 truncate max-w-xs">{person.sub}</p>
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
  const { shifts, claimShift, isLoading } = useShifts();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('wishlist');
  const [claimingId, setClaimingId] = useState<string | number | null>(null);
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [swapLoading, setSwapLoading] = useState(false);
  const [respondingId, setRespondingId] = useState<number | null>(null);

  // Ca nguyện vọng: open, non-emergency, not already my shift
  const wishlistShifts = shifts.filter(s =>
    !s.backendData?.is_emergency &&
    s.backendData?.is_open &&
    !s.backendData?.assignments?.some((a: any) => a.user_id === user?.id || a.user?.id === user?.id)
  );

  // Ca khẩn cấp: emergency + open, not already my shift
  const emergencyShifts = shifts.filter(s =>
    s.backendData?.is_emergency &&
    s.backendData?.is_open &&
    !s.backendData?.assignments?.some((a: any) => a.user_id === user?.id || a.user?.id === user?.id)
  );

  // Ca nhượng: transfer requests where I am the partner (someone is giving me their shift)
  const handoffRequests = swapRequests.filter(
    r => r.swap_type === 'transfer' && String(r.partner) === user?.id && r.status === 'pending'
  );

  // Ca đổi: exchange requests where I am the partner
  const swapExchangeRequests = swapRequests.filter(
    r => r.swap_type === 'exchange' && String(r.partner) === user?.id && r.status === 'pending'
  );

  useEffect(() => {
    const fetchSwapRequests = async () => {
      setSwapLoading(true);
      try {
        const res = await api.get('/shifts/swap-requests/');
        setSwapRequests(res.data);
      } catch {
        // silently fail
      } finally {
        setSwapLoading(false);
      }
    };
    fetchSwapRequests();
  }, []);

  const handleClaim = async (shiftId: string | number) => {
    if (claimingId) return;
    if (!window.confirm('Bạn có chắc chắn muốn đăng ký ca này?')) return;
    setClaimingId(shiftId);
    try {
      await claimShift(shiftId);
      alert('Đã gửi đăng ký thành công! Vui lòng chờ quản lý duyệt.');
    } catch {
      alert('Đăng ký thất bại. Ca có thể đã đầy hoặc lỗi hệ thống.');
    } finally {
      setClaimingId(null);
    }
  };

  const handleClaimEmergency = async (shiftId: string | number) => {
    if (claimingId) return;
    if (!window.confirm('Bạn có chắc chắn muốn nhận ca khẩn cấp này?')) return;
    setClaimingId(shiftId);
    try {
      await claimShift(shiftId);
      alert('Đã nhận ca khẩn cấp thành công!');
    } catch {
      alert('Nhận ca thất bại. Ca có thể đã đầy hoặc lỗi hệ thống.');
    } finally {
      setClaimingId(null);
    }
  };

  const handleSwapRespond = async (swapId: number, accept: boolean) => {
    if (respondingId) return;
    const action = accept ? 'đồng ý' : 'từ chối';
    if (!window.confirm(`Bạn có chắc chắn muốn ${action} yêu cầu này?`)) return;
    setRespondingId(swapId);
    try {
      const endpoint = accept ? `partner-accept` : `partner-reject`;
      await api.post(`/shifts/swap-requests/${swapId}/${endpoint}/`);
      setSwapRequests(prev => prev.filter(r => r.id !== swapId));
      alert(accept ? 'Đã đồng ý. Vui lòng chờ quản lý xác nhận.' : 'Đã từ chối yêu cầu.');
    } catch {
      alert('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setRespondingId(null);
    }
  };

  const myAssignedCount = shifts.filter(s =>
    s.backendData?.assignments?.some((a: any) => a.user_id === user?.id || a.user?.id === user?.id)
  ).length;

  const tabs: { id: Tab; label: string; icon: any; count: number; color: string; badgeColor: string }[] = [
    { id: 'wishlist', label: 'Nguyện vọng', icon: Bookmark, count: wishlistShifts.length, color: 'text-[#005ac2]', badgeColor: 'bg-[#005ac2]' },
    { id: 'emergency', label: 'Khẩn cấp', icon: AlertTriangle, count: emergencyShifts.length, color: 'text-red-600', badgeColor: 'bg-red-500' },
    { id: 'handoff', label: 'Ca nhượng', icon: ArrowLeftRight, count: handoffRequests.length, color: 'text-amber-600', badgeColor: 'bg-amber-500' },
    { id: 'swap', label: 'Ca đổi', icon: RefreshCw, count: swapExchangeRequests.length, color: 'text-purple-600', badgeColor: 'bg-purple-500' },
  ];

  return (
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
              <span className="text-xs font-bold">{shift.date}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-xs font-bold">{shift.time}</span>
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
            <p className="text-xs text-slate-500 mt-1 italic">"{request.message}"</p>
          )}
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl p-3 mb-4 text-xs font-medium text-slate-600 space-y-1">
        <div className="flex items-center gap-2">
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
