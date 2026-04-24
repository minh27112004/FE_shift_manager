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
  BadgeDollarSign,
  QrCode,
  Copy,
  CheckCircle2,
  RefreshCw,
  Edit3,
  Trash2,
  Plus,
  Save,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '../lib/utils';
import { useShifts } from '../context/ShiftContext';
import { useAuth } from '../context/AuthContext';
import api from '../lib/axios';
import { toast } from '../lib/toast';

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
  const [qrShift, setQrShift] = useState<{ id: number; label: string; time: string; date: string } | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [detailShift, setDetailShift] = useState<ReturnType<typeof transformShift> | null>(null);

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

  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
            <div className="flex gap-2">
              <button
                onClick={() => setShowTemplates(true)}
                className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold shadow-sm hover:bg-slate-50 active:scale-95 transition-all flex items-center gap-2"
              >
                <AlarmClock className="h-4 w-4" />
                Template
              </button>
              <button
                onClick={() => { setCreateForm(EMPTY_FORM); setCreateError(''); setShowCreate(true); }}
                className="bg-[#005ac2] text-white px-6 py-2.5 rounded-xl font-bold shadow-md hover:bg-[#004fab] active:scale-95 transition-all flex items-center gap-2"
              >
                <PlusCircle className="h-5 w-5" />
                Tạo ca làm
              </button>
            </div>
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
                        onClick={() => { if (role === 'admin' || role === 'manager') setDetailShift(shift as ReturnType<typeof transformShift>); }}
                        className={cn(
                          "px-2 py-1 rounded-md text-xs font-bold border-l-4",
                          shift.type === 'primary' && "bg-[#d8e2ff]/40 text-[#004eaa] border-[#005ac2]",
                          shift.type === 'tertiary' && "bg-[#d3ceef]/50 text-[#47445f] border-[#5f5c78]",
                          shift.type === 'error' && "bg-[#fe8983]/30 text-[#752121] border-[#9f403d]",
                          role === 'employee' && "ring-2 ring-[#005ac2] ring-offset-1",
                          (role === 'admin' || role === 'manager') && "cursor-pointer hover:brightness-95 transition-all"
                        )}
                      >
                        <div className="truncate">{shift.label}</div>
                        <div className="text-xs opacity-70">{shift.time}</div>
                        {role === 'employee' && (
                          <span className="flex items-center gap-0.5 text-xs font-black text-[#005ac2] mt-0.5">
                            <CalendarCheck className="h-2.5 w-2.5" /> Của tôi
                          </span>
                        )}
                        {(role === 'admin' || role === 'manager') && (
                          <button
                            onClick={e => { e.stopPropagation(); setQrShift({ id: shift.id, label: shift.label, time: shift.time, date: shift.date }); }}
                            className="mt-1 flex items-center gap-0.5 text-[9px] font-black text-[#005ac2] hover:text-[#004fab] transition-colors"
                          >
                            <QrCode className="h-2.5 w-2.5" /> Tạo QR
                          </button>
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

      {/* Template Manager Modal */}
      <AnimatePresence>
        {showTemplates && <TemplateManagerModal onClose={() => setShowTemplates(false)} />}
      </AnimatePresence>

      {/* QR Modal */}
      <AnimatePresence>
        {qrShift && <QRModal shift={qrShift} onClose={() => setQrShift(null)} />}
      </AnimatePresence>

      {/* Shift Detail Modal */}
      <AnimatePresence>
        {detailShift && (
          <ShiftDetailModal
            shift={detailShift}
            onClose={() => setDetailShift(null)}
            onOpenQR={() => { setQrShift({ id: detailShift.id, label: detailShift.label, time: detailShift.time, date: detailShift.date }); setDetailShift(null); }}
          />
        )}
      </AnimatePresence>

      {/* Legend & Insights */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
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
      </div>
    </motion.div>
  );
}

// ─── Create Shift Modal ────────────────────────────────────────────────────────

interface CreateShiftModalProps {
  form: typeof EMPTY_FORM;
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  submitting: boolean;
  error: string;
}

function CreateShiftModal({ form, setForm, onSubmit, onClose, submitting, error }: CreateShiftModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const set = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [selectedTplId, setSelectedTplId] = useState<number | null>(null);

  useEffect(() => {
    api.get('/shifts/templates/').then(r => setTemplates(r.data.filter((t: ShiftTemplate) => t.is_active))).catch(() => {});
  }, []);

  const applyTemplate = (tpl: ShiftTemplate) => {
    setSelectedTplId(tpl.id);
    setForm(f => ({ ...f, start_time: tpl.start_time.slice(0,5), end_time: tpl.end_time.slice(0,5), max_workers: tpl.max_workers, note: tpl.name }));
  };

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

            {/* Template picker */}
            {templates.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlarmClock className="h-3.5 w-3.5" /> Chọn template
                </label>
                <div className="flex flex-wrap gap-2">
                  {templates.map(tpl => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => applyTemplate(tpl)}
                      className={cn(
                        'px-3 py-2 rounded-xl border text-sm font-bold transition-all text-left',
                        selectedTplId === tpl.id
                          ? 'border-[#005ac2] bg-[#005ac2]/10 text-[#005ac2]'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-[#005ac2]/40 hover:bg-[#005ac2]/5'
                      )}
                    >
                      <p className="font-black">{tpl.name}</p>
                      <p className="text-xs opacity-70">{tpl.start_time.slice(0,5)} – {tpl.end_time.slice(0,5)}</p>
                    </button>
                  ))}
                  {selectedTplId !== null && (
                    <button
                      type="button"
                      onClick={() => { setSelectedTplId(null); setForm(f => ({ ...f, start_time: '', end_time: '', max_workers: 1, note: '' })); }}
                      className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-400 hover:bg-slate-100 transition-colors"
                    >
                      Xóa chọn
                    </button>
                  )}
                </div>
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
                onClick={() => setForm(f => ({ ...f, is_emergency: !f.is_emergency, salary_multiplier: !f.is_emergency ? '1.5' : '1.00' }))}
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

const QR_TTL = 120; 

function QRModal({ shift, onClose }: { shift: { id: number; label: string; time: string; date: string }; onClose: () => void }) {
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
        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="font-black text-slate-900">Mã QR Check-in</h2>
            <p className="text-xs text-slate-400 mt-0.5">{shift.label} · {shift.time} · {shift.date}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 flex flex-col items-center gap-5">
          {loading && <Loader2 className="h-8 w-8 text-[#005ac2] animate-spin" />}

          {error && (
            <div className="w-full flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl p-3">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
              <p className="text-xs text-red-700 font-medium">{error}</p>
            </div>
          )}

          {token && !loading && (
            <>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <QRCodeSVG value={token} size={200} />
              </div>

              <p className="text-[10px] text-slate-400 font-medium text-center">
                QR có hiệu lực <span className="font-black text-slate-600">2 phút</span>. Nhân viên quét hoặc nhập token bên dưới.
              </p>

              <div className="w-full flex gap-2">
                <code className="flex-1 bg-slate-100 rounded-xl px-3 py-2 text-xs text-slate-700 font-mono truncate">
                  {token}
                </code>
                <button
                  onClick={copyToken}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors shrink-0"
                >
                  {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
          <button
            onClick={generate}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Tạo QR mới
          </button>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-[#005ac2] text-white text-sm font-black hover:bg-[#004fab] transition-colors">
            Đóng
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Shift Detail Modal ───────────────────────────────────────────────────────

type TransformedShift = ReturnType<typeof transformShift>;

function ShiftDetailModal({ shift, onClose, onOpenQR }: {
  shift: TransformedShift;
  onClose: () => void;
  onOpenQR: () => void;
}) {
  const [detail, setDetail] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
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
    fetchAll();
  }, [shift.id]);

  const assignments: any[] = detail?.assignments ?? shift.backendData?.assignments ?? [];

  const statusLabel: Record<string, { label: string; cls: string }> = {
    confirmed: { label: 'Đã duyệt', cls: 'bg-green-100 text-green-700' },
    pending:   { label: 'Chờ duyệt', cls: 'bg-yellow-100 text-yellow-700' },
    rejected:  { label: 'Từ chối', cls: 'bg-red-100 text-red-700' },
    cancelled: { label: 'Đã hủy', cls: 'bg-slate-100 text-slate-500' },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
      >
        {/* Header */}
        <div className={cn(
          'px-6 py-5 shrink-0',
          shift.type === 'error' ? 'bg-red-50 border-b border-red-100' : 'bg-[#005ac2]/5 border-b border-[#005ac2]/10'
        )}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {shift.type === 'error' && (
                  <span className="text-[10px] font-black bg-red-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">Khẩn cấp</span>
                )}
                <h2 className="font-black text-slate-900 text-lg leading-tight">{shift.label}</h2>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{shift.time}</span>
                <span className="flex items-center gap-1"><CalendarCheck className="h-3.5 w-3.5" />{shift.date}</span>
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />
                  {assignments.filter((a: any) => a.status === 'confirmed').length}/{detail?.max_workers ?? shift.backendData?.max_workers ?? '?'}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-white/80 transition-colors shrink-0">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 text-[#005ac2] animate-spin" /></div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Users className="h-10 w-10 mx-auto mb-3 text-slate-200" />
              <p className="text-sm font-bold">Chưa có nhân viên đăng ký</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Danh sách nhân viên</p>
              {assignments.map((a: any) => {
                const rec = records.find((r: any) => String(r.user) === String(a.user ?? a.user_id));
                const st = statusLabel[a.status] ?? { label: a.status, cls: 'bg-slate-100 text-slate-500' };
                return (
                  <div key={a.id} className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors bg-white">
                    <div className="h-9 w-9 rounded-xl bg-[#005ac2]/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-black text-[#005ac2]">
                        {(a.user_name ?? a.full_name ?? '?')[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{a.user_name ?? a.full_name ?? `NV #${a.user ?? a.user_id}`}</p>
                      {a.user_phone && <p className="text-xs text-slate-400 font-medium">{a.user_phone}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-full', st.cls)}>{st.label}</span>
                      {rec ? (
                        <span className="text-[10px] font-bold text-green-600 flex items-center gap-0.5">
                          <CheckCircle2 className="h-3 w-3" />
                          {rec.checkin_at ? new Date(rec.checkin_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''} check-in
                          {rec.is_late && <span className="ml-1 text-orange-500">· muộn {rec.late_minutes}p</span>}
                        </span>
                      ) : a.status === 'confirmed' ? (
                        <span className="text-[10px] font-bold text-slate-400">Chưa check-in</span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 shrink-0">
          <button
            onClick={onOpenQR}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#005ac2] text-[#005ac2] text-sm font-black hover:bg-[#005ac2]/5 transition-colors"
          >
            <QrCode className="h-4 w-4" /> Tạo QR Check-in
          </button>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200 transition-colors">
            Đóng
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface ShiftTemplate {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  min_workers: number;
  max_workers: number;
  is_active: boolean;
  store: number;
}

const EMPTY_TPL = { name: '', start_time: '', end_time: '', min_workers: 1, max_workers: 3, is_active: true };

function TemplateManagerModal({ onClose }: { onClose: () => void }) {
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [form, setForm] = useState<typeof EMPTY_TPL>(EMPTY_TPL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchTemplates = () => {
    setLoading(true);
    api.get('/shifts/templates/')
      .then(r => setTemplates(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTemplates(); }, []);

  const startEdit = (tpl: ShiftTemplate) => {
    setEditingId(tpl.id);
    setForm({ name: tpl.name, start_time: tpl.start_time.slice(0,5), end_time: tpl.end_time.slice(0,5), min_workers: tpl.min_workers, max_workers: tpl.max_workers, is_active: tpl.is_active });
    setError('');
  };

  const startNew = () => {
    setEditingId('new');
    setForm(EMPTY_TPL);
    setError('');
  };

  const cancelEdit = () => { setEditingId(null); setError(''); };

  const handleSave = async () => {
    if (!form.name || !form.start_time || !form.end_time) { setError('Vui lòng điền đầy đủ thông tin.'); return; }
    if (form.start_time >= form.end_time) { setError('Giờ kết thúc phải sau giờ bắt đầu.'); return; }
    setSaving(true);
    setError('');
    try {
      if (editingId === 'new') {
        await api.post('/shifts/templates/', { ...form, store: 1 });
      } else {
        await api.patch(`/shifts/templates/${editingId}/`, form);
      }
      setEditingId(null);
      fetchTemplates();
    } catch (err: any) {
      const data = err.response?.data;
      setError(data ? Object.values(data).flat().join(', ') : 'Lưu thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!await toast.confirm('Xóa template này?', 'Xóa')) return;
    try {
      await api.delete(`/shifts/templates/${id}/`);
      fetchTemplates();
    } catch {}
  };

  const inputCls = 'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-[#005ac2]/20 focus:border-[#005ac2]/40 focus:outline-none placeholder:text-slate-400';

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="font-black text-slate-900">Quản lý template ca làm</h2>
            <p className="text-xs text-slate-400 mt-0.5">Chọn template để điền nhanh khi tạo ca mới</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={startNew} className="flex items-center gap-1.5 px-3 py-2 bg-[#005ac2] text-white text-base font-black rounded-xl hover:bg-[#004fab] transition-colors">
              <Plus className="h-4 w-4" /> Thêm mới
            </button>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
          {/* New / Edit form */}
          <AnimatePresence>
            {editingId !== null && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3 overflow-hidden"
              >
                <p className="text-xs font-black text-slate-500 uppercase tracking-wider">
                  {editingId === 'new' ? 'Tạo template mới' : 'Chỉnh sửa template'}
                </p>
                {error && <p className="text-xs text-red-500 font-medium flex items-center gap-1"><AlertCircle className="h-3 w-3" />{error}</p>}
                <input className={inputCls} placeholder="Tên template (vd: Ca sáng)" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Giờ bắt đầu</label>
                    <input type="time" className={inputCls + ' mt-1'} value={form.start_time} onChange={e => setForm(f => ({...f, start_time: e.target.value}))} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Giờ kết thúc</label>
                    <input type="time" className={inputCls + ' mt-1'} value={form.end_time} onChange={e => setForm(f => ({...f, end_time: e.target.value}))} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tối thiểu NV</label>
                    <input type="number" min={1} className={inputCls + ' mt-1'} value={form.min_workers} onChange={e => setForm(f => ({...f, min_workers: +e.target.value}))} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tối đa NV</label>
                    <input type="number" min={1} className={inputCls + ' mt-1'} value={form.max_workers} onChange={e => setForm(f => ({...f, max_workers: +e.target.value}))} />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={cancelEdit} className="flex-1 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">Hủy</button>
                  <button onClick={handleSave} disabled={saving} className="flex-1 py-2 rounded-xl bg-[#005ac2] text-white text-sm font-black hover:bg-[#004fab] transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Lưu
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Template list */}
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 text-[#005ac2] animate-spin" /></div>
          ) : templates.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <AlarmClock className="h-10 w-10 mx-auto mb-3 text-slate-200" />
              <p className="text-sm font-bold">Chưa có template nào</p>
            </div>
          ) : (
            templates.map(tpl => (
              <div key={tpl.id} className={cn('flex items-center justify-between p-4 rounded-2xl border transition-colors', tpl.is_active ? 'bg-white border-slate-100 hover:border-[#005ac2]/30' : 'bg-slate-50 border-slate-100 opacity-50')}>
                <div className="flex-1 text-left">
                  <p className="font-black text-slate-900 text-base">{tpl.name}</p>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {tpl.start_time.slice(0,5)} – {tpl.end_time.slice(0,5)} · {tpl.min_workers}–{tpl.max_workers} nhân viên
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-3 shrink-0">
                  <button onClick={() => startEdit(tpl)} className="p-1.5 rounded-lg text-slate-400 hover:text-[#005ac2] hover:bg-blue-50 transition-colors">
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(tpl.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
