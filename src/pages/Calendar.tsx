import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Info,
  Bot,
  ArrowRight,
  BarChart3,
  Loader2,
  CalendarCheck,
  X,
  Clock,
  Users,
  AlertTriangle,
  AlarmClock,
  AlertCircle,
  BadgeDollarSign
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useShifts } from '../context/ShiftContext';
import { useAuth } from '../context/AuthContext';
import api from '../lib/axios';

function buildCalendarDays(year: number, month: number) {

  const firstDay = new Date(year, month, 1).getDay(); 

  const startOffset = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const cells: { day: number; date: string; prevMonth?: boolean; nextMonth?: boolean; today?: boolean }[] = [];

  for (let i = startOffset - 1; i >= 0; i--) {
    const d = daysInPrev - i;
    const m = month - 1 < 0 ? 11 : month - 1;
    const y = month - 1 < 0 ? year - 1 : year;
    cells.push({ day: d, date: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, prevMonth: true });
  }

  const todayStr = new Date().toISOString().split('T')[0];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, date: dateStr, today: dateStr === todayStr });
  }

  let next = 1;
  while (cells.length % 7 !== 0) {
    const m = month + 1 > 11 ? 0 : month + 1;
    const y = month + 1 > 11 ? year + 1 : year;
    cells.push({ day: next, date: `${y}-${String(m + 1).padStart(2, '0')}-${String(next).padStart(2, '0')}`, nextMonth: true });
    next++;
  }

  return cells;
}

const MONTH_NAMES = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

const EMPTY_FORM = {
  date: '',
  start_time: '',
  end_time: '',
  note: '',
  max_workers: 1,
  salary_multiplier: '1.00',
  is_open: true,
  is_emergency: false
};

function transformShift(s: any) {
  const timeStr = `${s.start_time?.substring(0, 5)} - ${s.end_time?.substring(0, 5)}`;
  return {
    id: s.id,
    name: s.created_by_name || 'Hệ thống',
    time: timeStr,
    date: s.date,
    type: (s.is_emergency ? 'error' : s.is_open ? 'primary' : 'tertiary') as 'primary' | 'tertiary' | 'error',
    label: s.note || `Ca làm (${s.assignments?.length || 0}/${s.max_workers})`,
    backendData: s,
  };
}

export default function CalendarPage() {
  const { shifts, isLoading, addShift } = useShifts();
  const { user } = useAuth();
  const role = user?.role || 'employee';

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Employee-specific: fetch personal shifts from dedicated endpoint
  const [myShifts, setMyShifts] = useState<ReturnType<typeof transformShift>[]>([]);
  const [myShiftsLoading, setMyShiftsLoading] = useState(false);

  useEffect(() => {
    if (role !== 'employee') return;
    const fetch = async () => {
      setMyShiftsLoading(true);
      try {
        const res = await api.get('/shifts/my-shifts/');
        setMyShifts((res.data as any[]).map(transformShift));
      } catch {
        // fallback: filter from global shifts
        setMyShifts(
          shifts
            .filter(s => s.backendData?.assignments?.some(
              (a: any) => String(a.user ?? a.user_id) === String(user?.id)
            ))
            .map(s => ({ ...s, backendData: s.backendData ?? {} }))
        );
      } finally {
        setMyShiftsLoading(false);
      }
    };
    fetch();
  // re-fetch whenever global shifts refresh (e.g. after claiming)
  }, [role, shifts]);

  const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];
  const calendarData = buildCalendarDays(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };
  const goToday = () => { setViewYear(now.getFullYear()); setViewMonth(now.getMonth()); };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    if (createForm.start_time >= createForm.end_time) {
      setCreateError('Giờ kết thúc phải sau giờ bắt đầu.');
      return;
    }
    setCreating(true);
    try {
      await addShift({
        date: createForm.date,
        start_time: createForm.start_time,
        end_time: createForm.end_time,
        note: createForm.note,
        is_open: createForm.is_open,
        is_emergency: createForm.is_emergency,
        max_workers: Number(createForm.max_workers),
        salary_multiplier: createForm.salary_multiplier,
      });
      setShowCreate(false);
      setCreateForm(EMPTY_FORM);
    } catch (err: any) {
      const data = err.response?.data;
      if (data && typeof data === 'object') {
        const msgs = Object.entries(data)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(' | ');
        setCreateError(msgs);
      } else {
        setCreateError('Tạo ca thất bại. Vui lòng thử lại.');
      }
    } finally {
      setCreating(false);
    }
  };

  const displayShifts = role === 'employee' ? myShifts : shifts;
  const calendarLoading = isLoading || (role === 'employee' && myShiftsLoading);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 sm:p-6 lg:p-8 pb-4"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {role === 'employee' ? 'Lịch ca của tôi' : 'Lịch trình ca làm'}
          </h1>
          <p className="text-slate-500 font-medium">
            {MONTH_NAMES[viewMonth]}, {viewYear}
            {role === 'employee' && ' · Các ca bạn đã được phân công'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white rounded-xl shadow-sm px-2 border border-slate-100">
            <button onClick={prevMonth} className="p-2 text-slate-500 hover:text-[#005ac2] transition-colors">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={goToday} className="px-4 font-bold text-sm hover:text-[#005ac2] transition-colors">
              Hôm nay
            </button>
            <button onClick={nextMonth} className="p-2 text-slate-500 hover:text-[#005ac2] transition-colors">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          {(role === 'admin' || role === 'manager') && (
            <button
              onClick={() => { setCreateForm(EMPTY_FORM); setCreateError(''); setShowCreate(true); }}
              className="bg-[#005ac2] text-white px-6 py-2.5 rounded-xl font-bold shadow-md hover:bg-[#004fab] active:scale-95 transition-all flex items-center gap-2"
            >
              <PlusCircle className="h-5 w-5" />
              Tạo ca làm
            </button>
          )}
        </div>
      </div>

      {/* Loading overlay */}
      {calendarLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-[#005ac2] animate-spin" />
        </div>
      )}

      {/* Calendar Grid */}
      {!calendarLoading && (
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200/50 overflow-x-auto">
          <div className="min-w-[560px]">
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-slate-100">
            {days.map(day => (
              <div key={day} className="py-3 text-center text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-400">{day}</div>
            ))}
          </div>

          {/* Cells */}
          <div className="grid grid-cols-7 auto-rows-[minmax(100px,_auto)] sm:auto-rows-[minmax(130px,_auto)]">
            {calendarData.map((cell, i) => {
              const dayShifts = displayShifts.filter(s => s.date === cell.date);
              return (
                <div
                  key={i}
                  className={cn(
                    "p-2 border-r border-b border-slate-100 transition-colors",
                    (cell.prevMonth || cell.nextMonth) && "bg-slate-50/30 opacity-40",
                    cell.today && "bg-[#005ac2]/5"
                  )}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={cn(
                      "text-sm font-bold ml-1",
                      cell.today ? "h-6 w-6 bg-[#005ac2] text-white rounded-full flex items-center justify-center text-xs font-black" : "text-slate-900"
                    )}>{cell.day}</span>
                  </div>

                  <div className="flex flex-col gap-1">
                    {dayShifts.map((shift, si) => (
                      <div
                        key={si}
                        className={cn(
                          "px-2 py-1 rounded-md text-xs font-bold border-l-4",
                          shift.type === 'primary' && "bg-[#d8e2ff]/40 text-[#004eaa] border-[#005ac2]",
                          shift.type === 'tertiary' && "bg-[#d3ceef]/50 text-[#47445f] border-[#5f5c78]",
                          shift.type === 'error' && "bg-[#fe8983]/30 text-[#752121] border-[#9f403d]",
                          role === 'employee' && "ring-2 ring-[#005ac2] ring-offset-1"
                        )}
                      >
                        <div className="truncate">{shift.label}</div>
                        <div className="text-xs opacity-70">{shift.time}</div>
                        {role === 'employee' && (
                          <span className="flex items-center gap-0.5 text-xs font-black text-[#005ac2] mt-0.5">
                            <CalendarCheck className="h-2.5 w-2.5" /> Của tôi
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        </div>
      )}

      {/* Create Shift Modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateShiftModal
            form={createForm}
            setForm={setCreateForm}
            onSubmit={handleCreateSubmit}
            onClose={() => setShowCreate(false)}
            submitting={creating}
            error={createError}
          />
        )}
      </AnimatePresence>

      {/* Legend & Insights */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
            <Info className="h-4 w-4 text-[#005ac2]" />
            Chú giải màu sắc
          </h3>
          <div className="space-y-3">
            {role === 'employee' ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full border-2 border-[#005ac2] bg-white"></div>
                  <span className="text-sm text-slate-500 font-medium">Ca thường</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-[#9f403d]"></div>
                  <span className="text-sm text-slate-500 font-medium">Ca khẩn cấp</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-[#005ac2]"></div>
                  <span className="text-sm text-slate-500 font-medium">Ca mở · Đang cần nhân viên</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-[#5f5c78]"></div>
                  <span className="text-sm text-slate-500 font-medium">Ca đã đủ nhân sự</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-[#9f403d]"></div>
                  <span className="text-sm text-slate-500 font-medium">Ca khẩn cấp</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-center">
          <div className="text-center">
            {role === 'employee' ? (
              <>
                <div className="text-4xl font-black text-[#005ac2]">{displayShifts.length}</div>
                <div className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-wider">Ca tháng này</div>
                <p className="text-sm text-slate-400 mt-3">
                  {displayShifts.filter(s => s.backendData?.is_emergency).length} ca khẩn cấp
                </p>
              </>
            ) : (
              <>
                <div className="text-4xl font-black text-[#005ac2]">
                  {shifts.length > 0
                    ? Math.round((shifts.filter(s => !s.backendData?.is_open).length / shifts.length) * 100)
                    : 0}%
                </div>
                <div className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-wider">Độ phủ tháng này</div>
                <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#005ac2] transition-all"
                    style={{
                      width: shifts.length > 0
                        ? `${Math.round((shifts.filter(s => !s.backendData?.is_open).length / shifts.length) * 100)}%`
                        : '0%'
                    }}
                  ></div>
                </div>
                <p className="text-sm text-slate-400 mt-3">
                  {shifts.filter(s => s.backendData?.is_open).length} ca còn trống trong tháng
                </p>
              </>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#005ac2]/10 to-[#5f5c78]/10 p-6 rounded-xl shadow-sm border border-[#005ac2]/20 relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-sm font-black text-[#005ac2] mb-2 flex items-center gap-2">
              <Bot className="h-4 w-4" />
              GỢI Ý AI
            </h3>
            <p className="text-xs font-medium text-slate-600 leading-relaxed">
              Thứ Năm thường có tỷ lệ nghỉ việc cao hơn 20%. Hãy cân nhắc sắp xếp dư 1 người cho ca đêm.
            </p>
            <button className="mt-4 text-xs font-bold text-[#005ac2] flex items-center gap-1 hover:underline">
              Áp dụng đề xuất
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <BarChart3 className="absolute -right-4 -bottom-4 h-24 w-24 text-[#005ac2] opacity-10" />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Create Shift Modal ────────────────────────────────────────────────────────

interface CreateShiftModalProps {
  form: typeof EMPTY_FORM;
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  submitting: boolean;
  error: string;
}

function CreateShiftModal({ form, setForm, onSubmit, onClose, submitting, error }: CreateShiftModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const set = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <motion.div
      ref={overlayRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-[#005ac2]/10 rounded-lg flex items-center justify-center">
              <PlusCircle className="h-4 w-4 text-[#005ac2]" />
            </div>
            <h2 className="font-black text-slate-900 text-lg">Tạo ca làm mới</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            {/* Ngày */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <CalendarCheck className="h-3.5 w-3.5" /> Ngày làm việc *
              </label>
              <input
                type="date"
                value={form.date}
                onChange={e => set('date', e.target.value)}
                required
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-[#005ac2]/20 focus:border-[#005ac2]/40 focus:outline-none transition-colors"
              />
            </div>

            {/* Giờ */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Giờ bắt đầu *
                </label>
                <input
                  type="time"
                  value={form.start_time}
                  onChange={e => set('start_time', e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-[#005ac2]/20 focus:border-[#005ac2]/40 focus:outline-none transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlarmClock className="h-3.5 w-3.5" /> Giờ kết thúc *
                </label>
                <input
                  type="time"
                  value={form.end_time}
                  onChange={e => set('end_time', e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-[#005ac2]/20 focus:border-[#005ac2]/40 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Ghi chú */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Tên / Ghi chú ca</label>
              <input
                type="text"
                value={form.note}
                onChange={e => set('note', e.target.value)}
                placeholder="VD: Ca sáng cửa hàng A"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-[#005ac2]/20 focus:border-[#005ac2]/40 focus:outline-none placeholder:text-slate-400 transition-colors"
              />
            </div>

            {/* Số nhân viên + Hệ số lương */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Số nhân viên tối đa
                </label>
                <input
                  type="number"
                  value={form.max_workers}
                  onChange={e => set('max_workers', Math.max(1, Number(e.target.value)))}
                  min={1}
                  max={50}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-[#005ac2]/20 focus:border-[#005ac2]/40 focus:outline-none transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <BadgeDollarSign className="h-3.5 w-3.5" /> Hệ số lương
                </label>
                <input
                  type="number"
                  value={form.salary_multiplier}
                  onChange={e => set('salary_multiplier', e.target.value)}
                  min="1"
                  step="0.1"
                  placeholder="1.00"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-[#005ac2]/20 focus:border-[#005ac2]/40 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => set('is_open', !form.is_open)}
                className={cn(
                  'flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all',
                  form.is_open
                    ? 'border-[#005ac2] bg-[#005ac2]/5'
                    : 'border-slate-200 bg-slate-50 opacity-60'
                )}
              >
                <div className={cn(
                  'h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                  form.is_open ? 'border-[#005ac2] bg-[#005ac2]' : 'border-slate-300'
                )}>
                  {form.is_open && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>
                <div>
                  <p className={cn('text-sm font-black', form.is_open ? 'text-[#005ac2]' : 'text-slate-500')}>Mở đăng ký</p>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">Nhân viên có thể đăng ký</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => set('is_emergency', !form.is_emergency)}
                className={cn(
                  'flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all',
                  form.is_emergency
                    ? 'border-red-500 bg-red-50'
                    : 'border-slate-200 bg-slate-50 opacity-60'
                )}
              >
                <div className={cn(
                  'h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                  form.is_emergency ? 'border-red-500 bg-red-500' : 'border-slate-300'
                )}>
                  {form.is_emergency && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>
                <div>
                  <p className={cn('text-sm font-black', form.is_emergency ? 'text-red-600' : 'text-slate-500')}>Ca khẩn cấp</p>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">Xác nhận tức thì</p>
                </div>
              </button>
            </div>

            {/* Preview */}
            {form.date && form.start_time && form.end_time && (
              <div className={cn(
                'p-4 rounded-xl border-l-4',
                form.is_emergency
                  ? 'bg-red-50 border-red-500'
                  : form.is_open
                    ? 'bg-[#d8e2ff]/40 border-[#005ac2]'
                    : 'bg-[#d3ceef]/30 border-[#5f5c78]'
              )}>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Xem trước</p>
                <p className={cn(
                  'text-sm font-black',
                  form.is_emergency ? 'text-red-700' : form.is_open ? 'text-[#005ac2]' : 'text-[#5f5c78]'
                )}>
                  {form.note || 'Ca làm'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {form.date} · {form.start_time} – {form.end_time} · {form.max_workers} nhân viên
                  {Number(form.salary_multiplier) > 1 && ` · x${form.salary_multiplier} lương`}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={cn(
                'flex-1 px-4 py-2.5 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg',
                form.is_emergency
                  ? 'bg-red-500 shadow-red-200 hover:bg-red-600'
                  : 'bg-[#005ac2] shadow-[#005ac2]/20 hover:bg-[#004fab]',
                submitting && 'opacity-70 cursor-not-allowed'
              )}
            >
              {submitting
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : form.is_emergency
                  ? <><AlertTriangle className="h-4 w-4" /> Tạo ca khẩn cấp</>
                  : <><PlusCircle className="h-4 w-4" /> Tạo ca làm</>
              }
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
