import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Clock, CalendarCheck, Users, CheckCircle2,
  QrCode, UserPlus, Trash2, Loader2, AlertCircle, ArrowRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import api from '../lib/axios';
import { toast } from '../lib/toast';
import { useShifts } from '../context/ShiftContext';

interface ShiftDetailModalProps {
  shift: any;
  onClose: () => void;
  onOpenQR: () => void;
  userRole: string;
}

function fmtTime(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function fmtMinutes(min: number | null | undefined) {
  if (min == null) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}g${m > 0 ? m + 'p' : ''}` : `${m}p`;
}

export function ShiftDetailModal({ shift, onClose, onOpenQR, userRole }: ShiftDetailModalProps) {
  const { assignEmployee, unassignEmployee, fetchShifts } = useShifts();
  const [tab, setTab] = useState<'assignments' | 'checkins'>('assignments');
  const [detail, setDetail] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dữ liệu danh sách nhân viên để thêm vào ca
  const [availableEmployees, setAvailableEmployees] = useState<any[]>([]);
  const [conflictingEmployees, setConflictingEmployees] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [assigning, setAssigning] = useState(false);
  const [unassigningId, setUnassigningId] = useState<number | null>(null);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const fetchShiftData = async () => {
    setLoading(true);
    try {
      const [shiftRes, recRes] = await Promise.all([
        api.get(`/shifts/${shift.id}/`),
        api.get(`/attendance/records/shift/${shift.id}/`),
      ]);
      setDetail(shiftRes.data);
      setRecords(recRes.data);
    } catch {
      setDetail(shift.backendData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShiftData();
  }, [shift.id]);

  // Fetch danh sách nhân viên khả dụng & trùng ca khi mở modal thêm
  const fetchAvailableEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const res = await api.get(`/shifts/${shift.id}/available-employees/`);
      setAvailableEmployees(res.data.available ?? []);
      setConflictingEmployees(res.data.conflicting ?? []);
    } catch (err) {
      console.error('Lỗi lấy danh sách nhân viên:', err);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const isAdminOrManager = userRole === 'admin' || userRole === 'manager';

  const currentShiftData = detail ?? shift.backendData;
  const assignments: any[] = currentShiftData?.assignments ?? [];

  const shiftDate = currentShiftData?.date;
  const shiftStartTime = currentShiftData?.start_time;
  const shiftEndTime = currentShiftData?.end_time;

  let isPastShift = false;
  if (shiftDate && shiftEndTime && shiftStartTime) {
    const endDt = new Date(`${shiftDate}T${shiftEndTime}`);
    const startDt = new Date(`${shiftDate}T${shiftStartTime}`);
    if (endDt < startDt) {
      endDt.setDate(endDt.getDate() + 1);
    }
    isPastShift = new Date() > endDt;
  }

  const handleAssign = async () => {
    if (!selectedEmpId) {
      toast.error('Vui lòng chọn nhân viên.');
      return;
    }
    setAssigning(true);
    try {
      await assignEmployee(shift.id, Number(selectedEmpId));
      setShowAddModal(false);
      setSelectedEmpId('');
      await fetchShiftData();
    } catch (err: any) {
      console.error(err);
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassign = async (userId: number, userName: string) => {
    const confirmed = await toast.confirm(`Xóa nhân viên ${userName} khỏi ca này?`, 'Xóa nhân viên');
    if (!confirmed) return;
    setUnassigningId(userId);
    try {
      await unassignEmployee(shift.id, userId);
      await fetchShiftData();
    } catch (err: any) {
      console.error(err);
    } finally {
      setUnassigningId(null);
    }
  };

  const checkedInCount = records.filter(r => r.checkin_at).length;
  const checkedOutCount = records.filter(r => r.checkout_at).length;

  const statusLabel: Record<string, { label: string; cls: string }> = {
    confirmed: { label: 'Đã phân công', cls: 'bg-green-100 text-green-700 border border-green-200' },
    pending:   { label: 'Chờ duyệt', cls: 'bg-yellow-100 text-yellow-700 border border-yellow-200' },
    rejected:  { label: 'Từ chối', cls: 'bg-red-100 text-red-700 border border-red-200' },
    cancelled: { label: 'Đã hủy', cls: 'bg-slate-100 text-slate-500 border border-slate-200' },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="w-full max-w-xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden border border-slate-100"
      >
        {/* Header */}
        <div className={cn(
          'px-6 py-5 shrink-0 transition-colors',
          shift.type === 'error' ? 'bg-red-50/80 border-b border-red-100' : 'bg-gradient-to-r from-[#005ac2]/10 to-[#005ac2]/5 border-b border-[#005ac2]/10'
        )}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                {shift.type === 'error' && (
                  <span className="text-[10px] font-black bg-red-500 text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">Khẩn cấp</span>
                )}
                <h2 className="font-black text-slate-900 text-xl leading-tight">{shift.label}</h2>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 font-medium">
                <span className="flex items-center gap-1 bg-white/60 px-2.5 py-1 rounded-lg border border-slate-200/60 shadow-2xs">
                  <Clock className="h-3.5 w-3.5 text-[#005ac2]" />{shift.time}
                </span>
                <span className="flex items-center gap-1 bg-white/60 px-2.5 py-1 rounded-lg border border-slate-200/60 shadow-2xs">
                  <CalendarCheck className="h-3.5 w-3.5 text-[#005ac2]" />{shift.date}
                </span>
                <span className="flex items-center gap-1 bg-white/60 px-2.5 py-1 rounded-lg border border-slate-200/60 shadow-2xs">
                  <Users className="h-3.5 w-3.5 text-[#005ac2]" />
                  {assignments.filter(a => a.status === 'confirmed').length}/{detail?.max_workers ?? shift.backendData?.max_workers ?? '?'}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-2xl bg-white/80 text-slate-400 hover:text-slate-600 hover:bg-white shadow-sm border border-slate-100 transition-all shrink-0 active:scale-95">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tabs & Add Button */}
          <div className="flex items-center justify-between gap-2 mt-5">
            <div className="flex gap-1 bg-slate-200/60 p-1 rounded-2xl">
              <button
                onClick={() => setTab('assignments')}
                className={cn(
                  'px-4 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5',
                  tab === 'assignments'
                    ? 'bg-white text-[#005ac2] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                Nhân sự ({assignments.length})
              </button>
              <button
                onClick={() => setTab('checkins')}
                className={cn(
                  'px-4 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5',
                  tab === 'checkins'
                    ? 'bg-white text-[#005ac2] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                Check-in
                {checkedInCount > 0 && (
                  <span className={cn(
                    'text-[10px] font-black px-1.5 py-0.5 rounded-full',
                    tab === 'checkins' ? 'bg-[#005ac2] text-white' : 'bg-slate-400 text-white'
                  )}>{checkedInCount}</span>
                )}
              </button>
            </div>

            {isAdminOrManager && tab === 'assignments' && (
              !isPastShift ? (
                <button
                  onClick={() => { fetchAvailableEmployees(); setShowAddModal(true); }}
                  className="flex items-center gap-1.5 bg-[#005ac2] text-white px-3.5 py-1.5 rounded-xl text-xs font-black shadow-md hover:bg-[#004fab] transition-all active:scale-95"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Thêm nhân viên
                </button>
              ) : (
                <div className="flex items-center gap-1.5 bg-slate-100 text-slate-500 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 shadow-2xs">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  Ca làm đã kết thúc
                </div>
              )
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 bg-slate-50/30">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Loader2 className="h-8 w-8 text-[#005ac2] animate-spin mb-2" />
              <p className="text-xs font-bold tracking-wider">Đang tải dữ liệu ca làm...</p>
            </div>
          ) : tab === 'assignments' ? (
            /* ── Tab: Nhân sự ── */
            assignments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200 p-8 text-center">
                <div className="h-16 w-16 rounded-3xl bg-slate-100 flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-base font-black text-slate-700">Chưa có nhân viên nào trong ca</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  {isAdminOrManager && !isPastShift ? 'Nhấp vào nút "Thêm nhân viên" phía trên để phân công nhân sự vào ca này.' : 'Ca làm này đang trống, chưa có ai được phân công.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Danh sách nhân sự được phân công</p>
                  <span className="text-xs font-bold text-slate-500">
                    {assignments.filter(a => a.status === 'confirmed').length} chính thức
                  </span>
                </div>
                <div className="space-y-2.5">
                  {assignments.map((a: any) => {
                    const userId = a.user ?? a.user_id;
                    const rec = records.find((r: any) => String(r.user) === String(userId));
                    const st = statusLabel[a.status] ?? { label: a.status, cls: 'bg-slate-100 text-slate-500' };
                    const isUnassigning = unassigningId === userId;

                    return (
                      <div key={a.id} className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200/80 hover:border-[#005ac2]/40 hover:shadow-md transition-all bg-white group">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#005ac2]/10 to-[#005ac2]/20 flex items-center justify-center shrink-0 border border-[#005ac2]/10 shadow-2xs">
                          <span className="text-lg font-black text-[#005ac2]">
                            {(a.user_name ?? a.full_name ?? '?')[0]?.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-bold text-slate-900 truncate">{a.user_name ?? a.full_name ?? `NV #${userId}`}</p>
                          {a.user_phone ? (
                            <p className="text-xs text-slate-500 font-medium">{a.user_phone}</p>
                          ) : (
                            <p className="text-xs text-slate-400 font-medium italic">Không có sđt</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <div className="flex items-center gap-2">
                            <span className={cn('text-xs font-black px-2.5 py-1 rounded-full shadow-2xs', st.cls)}>{st.label}</span>
                            {isAdminOrManager && a.status === 'confirmed' && !isPastShift && (
                              <button
                                onClick={() => handleUnassign(userId, a.user_name ?? a.full_name ?? `NV #${userId}`)}
                                disabled={isUnassigning}
                                className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all border border-transparent hover:border-red-100 active:scale-95"
                                title="Xóa nhân viên khỏi ca"
                              >
                                {isUnassigning ? <Loader2 className="h-4 w-4 animate-spin text-red-600" /> : <Trash2 className="h-4 w-4" />}
                              </button>
                            )}
                          </div>
                          {rec ? (
                            <span className="text-xs font-bold text-green-600 flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded-lg border border-green-100">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {fmtTime(rec.checkin_at)}
                              {rec.is_late && <span className="text-orange-600 font-black">· muộn {rec.late_minutes}p</span>}
                            </span>
                          ) : a.status === 'confirmed' ? (
                            <span className="text-xs font-bold text-slate-400 italic">Chưa check-in</span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          ) : (
            /* ── Tab: Check-in ── */
            <div className="space-y-4">
              {/* Summary bar */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Đã check-in', value: checkedInCount, color: 'text-green-600', bg: 'bg-green-50/80 border border-green-100' },
                  { label: 'Đã checkout', value: checkedOutCount, color: 'text-blue-600', bg: 'bg-blue-50/80 border border-blue-100' },
                  { label: 'Chưa check-in', value: assignments.filter((a: any) => a.status === 'confirmed').length - checkedInCount, color: 'text-slate-600', bg: 'bg-slate-100 border border-slate-200' },
                ].map(s => (
                  <div key={s.label} className={cn('rounded-2xl p-3.5 text-center shadow-2xs', s.bg)}>
                    <p className={cn('text-2xl font-black leading-tight', s.color)}>{Math.max(0, s.value)}</p>
                    <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">{s.label}</p>
                  </div>
                ))}
              </div>

              {records.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200 p-8 text-center">
                  <div className="h-16 w-16 rounded-3xl bg-slate-100 flex items-center justify-center mb-4">
                    <CalendarCheck className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="text-base font-black text-slate-700">Chưa có ai check-in ca này</p>
                  <p className="text-xs text-slate-400 mt-1">Dữ liệu chấm công sẽ xuất hiện khi nhân viên quét mã check-in.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider px-1">Chi tiết chấm công</p>
                  {records.map((r: any) => (
                    <div key={r.id} className="p-5 rounded-3xl border border-slate-200/80 bg-white shadow-xs space-y-4 hover:border-slate-300 transition-colors">
                      {/* Employee row */}
                      <div className="flex items-center gap-3.5">
                        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-[#005ac2]/10 to-[#005ac2]/20 flex items-center justify-center shrink-0 border border-[#005ac2]/10">
                          <span className="text-base font-black text-[#005ac2]">
                            {(r.user_name ?? '?')[0]?.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-bold text-slate-900 truncate">{r.user_name ?? `NV #${r.user}`}</p>
                          {r.user_phone && <p className="text-xs text-slate-500 font-medium">{r.user_phone}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {r.is_late ? (
                            <span className="text-xs font-black bg-orange-100 text-orange-700 px-3 py-1 rounded-full border border-orange-200 shadow-2xs">
                              Trễ {r.late_minutes}p
                            </span>
                          ) : (
                            <span className="text-xs font-black bg-green-100 text-green-700 px-3 py-1 rounded-full border border-green-200 shadow-2xs">
                              Đúng giờ
                            </span>
                          )}
                          {r.geo_valid ? (
                            <span className="text-xs font-black bg-blue-100 text-blue-700 px-3 py-1 rounded-full border border-blue-200 shadow-2xs">GPS ✓</span>
                          ) : (
                            <span className="text-xs font-black bg-red-100 text-red-700 px-3 py-1 rounded-full border border-red-200 shadow-2xs">GPS ✗</span>
                          )}
                        </div>
                      </div>

                      {/* Time grid */}
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-3">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Check-in</p>
                          <p className="text-base font-black text-slate-800">{fmtTime(r.checkin_at)}</p>
                        </div>
                        <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-3">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Check-out</p>
                          <p className={cn('text-base font-black', r.checkout_at ? 'text-slate-800' : 'text-slate-300')}>
                            {r.checkout_at ? fmtTime(r.checkout_at) : '—'}
                          </p>
                        </div>
                        <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-3">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Giờ làm</p>
                          <p className={cn('text-base font-black', r.worked_minutes ? 'text-[#005ac2]' : 'text-slate-300')}>
                            {fmtMinutes(r.worked_minutes)}
                          </p>
                        </div>
                      </div>

                      {/* Distance */}
                      {r.checkin_distance_meters != null && (
                        <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-100">
                          <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          Khoảng cách check-in: <span className="font-black text-slate-700">{r.checkin_distance_meters}m</span>
                        </p>
                      )}

                      {/* Note */}
                      {r.note && (
                        <p className="text-xs text-slate-600 bg-amber-50/60 rounded-xl px-3.5 py-2.5 border border-amber-100/60 italic">
                          "{r.note}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex gap-3 shrink-0">
          {isAdminOrManager && (
            <button
              onClick={onOpenQR}
              disabled={isPastShift}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-sm transition-all active:scale-95",
                !isPastShift
                  ? "bg-gradient-to-r from-[#005ac2]/10 to-[#005ac2]/20 border border-[#005ac2]/30 text-[#005ac2] shadow-sm hover:from-[#005ac2]/20 hover:to-[#005ac2]/30"
                  : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60"
              )}
            >
              <QrCode className="h-4 w-4" /> {isPastShift ? "Ca làm đã kết thúc" : "Tạo QR Check-in"}
            </button>
          )}
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 font-black text-sm hover:bg-slate-200 transition-all active:scale-95">
            Đóng
          </button>
        </div>
      </motion.div>

      {/* Modal Thêm Nhân Viên */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            onClick={e => { if (e.target === e.currentTarget) setShowAddModal(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full border border-slate-100 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-2xl bg-[#005ac2]/10 flex items-center justify-center text-[#005ac2]">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Thêm nhân viên vào ca</h3>
                    <p className="text-xs text-slate-500 font-medium">Chọn nhân viên từ danh sách bên dưới</p>
                  </div>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">Chọn nhân viên</label>
                {loadingEmployees ? (
                  <div className="flex items-center justify-center py-8 text-slate-400">
                    <Loader2 className="h-6 w-6 text-[#005ac2] animate-spin mr-2" />
                    <span className="text-sm font-bold">Đang kiểm tra lịch làm việc...</span>
                  </div>
                ) : availableEmployees.length === 0 && conflictingEmployees.length === 0 ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-sm font-medium flex items-center gap-2.5">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                    <span>Tất cả nhân viên đã được phân công vào ca này hoặc hệ thống chưa có dữ liệu nhân viên.</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <select
                      value={selectedEmpId}
                      onChange={e => setSelectedEmpId(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#005ac2]/20 focus:border-[#005ac2] transition-all"
                    >
                      <option value="">-- Chọn nhân viên --</option>
                      {availableEmployees.length > 0 && (
                        <optgroup label="Nhân viên khả dụng (Rảnh trong khung giờ này)">
                          {availableEmployees.map(emp => (
                            <option key={emp.id} value={emp.id}>
                              {emp.full_name || emp.username} {emp.phone ? `(${emp.phone})` : ''}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {conflictingEmployees.length > 0 && (
                        <optgroup label="Nhân viên bị trùng ca (Không thể phân công)">
                          {conflictingEmployees.map(emp => {
                            const overlaps = emp.overlapping_shifts?.map((s: any) => `${s.start_time}-${s.end_time}`).join(', ');
                            return (
                              <option key={emp.id} value={emp.id} disabled>
                                ⚠️ {emp.full_name || emp.username} - Bị trùng ca ({overlaps})
                              </option>
                            );
                          })}
                        </optgroup>
                      )}
                    </select>

                    {conflictingEmployees.length > 0 && (
                      <div className="p-3 bg-red-50 border border-red-100 rounded-2xl text-xs text-red-700 space-y-1.5">
                        <p className="font-bold flex items-center gap-1.5 text-red-800">
                          <AlertCircle className="h-4 w-4 shrink-0" /> Có {conflictingEmployees.length} nhân sự vướng lịch làm việc trùng giờ:
                        </p>
                        <div className="max-h-24 overflow-y-auto space-y-1 pr-1 font-medium">
                          {conflictingEmployees.map(emp => (
                            <p key={emp.id} className="text-slate-600 ml-5">
                              • <span className="font-bold text-slate-800">{emp.full_name || emp.username}</span> (Ca trùng: {emp.overlapping_shifts?.map((s: any) => `${s.start_time}-${s.end_time}`).join(', ')})
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm transition-all"
                >
                  Hủy
                </button>
                <button
                  onClick={handleAssign}
                  disabled={assigning || availableEmployees.length === 0 || !selectedEmpId}
                  className="flex-1 py-3 rounded-2xl bg-[#005ac2] hover:bg-[#004fab] text-white font-black text-sm shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  Xác nhận thêm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
