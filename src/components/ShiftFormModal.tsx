import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  PlusCircle, X, AlarmClock, CalendarCheck, Clock,
  Users, BadgeDollarSign, AlertCircle, AlertTriangle, Loader2, Store,
} from 'lucide-react';
import { cn } from '../lib/utils';
import api from '../lib/axios';

export const SHIFT_FORM_DEFAULT = {
  date: '',
  start_time: '',
  end_time: '',
  note: '',
  max_workers: 1,
  salary_multiplier: '1.00',
  is_open: true,
  is_emergency: false,
  store: 0,
};

export type ShiftFormValues = typeof SHIFT_FORM_DEFAULT;

interface StoreOption {
  id: number;
  name: string;
}

interface ShiftTemplate {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  min_workers: number;
  max_workers: number;
  is_active: boolean;
}

export interface ShiftFormModalProps {
  form: ShiftFormValues;
  setForm: React.Dispatch<React.SetStateAction<ShiftFormValues>>;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  submitting: boolean;
  error: string;
  editMode?: boolean;
}

export function ShiftFormModal({ form, setForm, onSubmit, onClose, submitting, error, editMode = false }: ShiftFormModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const set = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [selectedTplId, setSelectedTplId] = useState<number | null>(null);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [dateError, setDateError] = useState('');

  const getLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalDateString(new Date());
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = getLocalDateString(tomorrowObj);

  const validateDate = (dateVal: string, isEmergency: boolean) => {
    if (!dateVal) { setDateError(''); return; }
    if (!editMode && dateVal < todayStr) {
      setDateError('Không thể chọn ngày trong quá khứ.');
    } else if (isEmergency && dateVal > tomorrowStr) {
      setDateError('Ca khẩn cấp chỉ được phép chọn ngày hôm nay hoặc ngày mai.');
    } else {
      setDateError('');
    }
  };

  useEffect(() => {
    api.get('/shifts/templates/')
      .then(r => setTemplates(r.data.filter((t: ShiftTemplate) => t.is_active)))
      .catch(() => { });
    api.get('/stores/')
      .then(r => {
        setStores(r.data);
        // Auto-chọn store đầu tiên nếu form chưa có store
        if (r.data.length === 1 && !form.store) {
          setForm(f => ({ ...f, store: r.data[0].id }));
        }
      })
      .catch(() => { });
  }, []);

  const applyTemplate = (tpl: ShiftTemplate) => {
    setSelectedTplId(tpl.id);
    setForm(f => ({ ...f, start_time: tpl.start_time.slice(0, 5), end_time: tpl.end_time.slice(0, 5), max_workers: tpl.max_workers, note: tpl.name }));
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
            <h2 className="font-black text-slate-900 text-lg">
              {editMode ? 'Chỉnh sửa ca làm' : 'Tạo ca làm mới'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
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

            {/* Template picker — chỉ hiển thị khi tạo mới */}
            {!editMode && templates.length > 0 && (
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
                      <p className="text-xs opacity-70">{tpl.start_time.slice(0, 5)} – {tpl.end_time.slice(0, 5)}</p>
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

            {/* Cửa hàng */}
            {stores.length > 1 && (
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Store className="h-3.5 w-3.5" /> Cửa hàng *
                </label>
                <select
                  value={form.store}
                  onChange={e => set('store', Number(e.target.value))}
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-[#005ac2]/20 focus:border-[#005ac2]/40 focus:outline-none transition-colors"
                >
                  <option value={0} disabled>Chọn cửa hàng...</option>
                  {stores.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
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
                onChange={e => {
                  set('date', e.target.value);
                  validateDate(e.target.value, form.is_emergency);
                }}
                required
                min={editMode ? undefined : todayStr}
                className={cn(
                  'w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:outline-none transition-colors',
                  dateError
                    ? 'border-red-400 focus:ring-red-200 focus:border-red-400'
                    : 'border-slate-200 focus:ring-[#005ac2]/20 focus:border-[#005ac2]/40'
                )}
              />
              {dateError && (
                <p className="text-xs text-red-500 font-medium flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {dateError}
                </p>
              )}
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
                  min={1} max={50}
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
                  min="1" step="0.1" placeholder="1.00"
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
                  form.is_open ? 'border-[#005ac2] bg-[#005ac2]/5' : 'border-slate-200 bg-slate-50 opacity-60'
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
                onClick={() => {
                  const next = !form.is_emergency;
                  setForm(f => ({ ...f, is_emergency: next, salary_multiplier: next ? '1.5' : '1.00' }));
                  validateDate(form.date, next);
                }}
                className={cn(
                  'flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all',
                  form.is_emergency ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-slate-50 opacity-60'
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
                form.is_emergency ? 'bg-red-50 border-red-500' : form.is_open ? 'bg-[#d8e2ff]/40 border-[#005ac2]' : 'bg-[#d3ceef]/30 border-[#5f5c78]'
              )}>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Xem trước</p>
                <p className={cn('text-sm font-black', form.is_emergency ? 'text-red-700' : form.is_open ? 'text-[#005ac2]' : 'text-[#5f5c78]')}>
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
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={cn(
                'flex-1 px-4 py-2.5 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg',
                form.is_emergency ? 'bg-red-500 shadow-red-200 hover:bg-red-600' : 'bg-[#005ac2] shadow-[#005ac2]/20 hover:bg-[#004fab]',
                submitting && 'opacity-70 cursor-not-allowed'
              )}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editMode ? (
                'Lưu thay đổi'
              ) : form.is_emergency ? (
                <><AlertTriangle className="h-4 w-4" /> Tạo ca khẩn cấp</>
              ) : (
                <><PlusCircle className="h-4 w-4" /> Tạo ca làm</>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
