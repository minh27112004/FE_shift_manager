import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  PlusCircle, Search, Pencil, Trash2, Loader2,
  Clock, CalendarCheck, Users, ChevronLeft, ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { cn } from '../lib/utils';
import api from '../lib/axios';
import { toast } from '../lib/toast';
import { ShiftFormModal, SHIFT_FORM_DEFAULT, type ShiftFormValues } from '../components/ShiftFormModal';

interface Shift {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  store: number;
  store_name?: string;
  max_workers: number;
  salary_multiplier: string;
  is_open: boolean;
  is_emergency: boolean;
  note: string;
  created_by_name?: string;
  assignments: { id: number; user: number; user_name?: string; status: string }[];
}

const EMPTY_FORM = SHIFT_FORM_DEFAULT;

function getTodayRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const from = `${y}-${m}-01`;
  const last = new Date(y, now.getMonth() + 1, 0).getDate();
  const to = `${y}-${m}-${String(last).padStart(2, '0')}`;
  return { from, to };
}

function shiftStatus(s: Shift) {
  if (s.is_emergency) return { label: 'Khẩn cấp', cls: 'bg-red-100 text-red-700' };
  if (s.is_open) return { label: 'Mở đăng ký', cls: 'bg-blue-100 text-blue-700' };
  return { label: 'Đủ nhân sự', cls: 'bg-slate-100 text-slate-600' };
}

export default function ShiftManagement() {
  const range = getTodayRange();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterFrom, setFilterFrom] = useState(range.from);
  const [filterTo, setFilterTo] = useState(range.to);
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'closed' | 'emergency'>('all');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Shift | null>(null);
  const [form, setForm] = useState<ShiftFormValues>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchShifts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterFrom) params.from = filterFrom;
      if (filterTo) params.to = filterTo;
      const res = await api.get('/shifts/', { params });
      setShifts(res.data);
      setPage(1);
    } catch {
      toast.error('Không tải được danh sách ca làm.');
    } finally {
      setLoading(false);
    }
  }, [filterFrom, filterTo]);

  useEffect(() => { fetchShifts(); }, [fetchShifts]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (s: Shift) => {
    setEditTarget(s);
    setForm({
      date: s.date,
      start_time: s.start_time.slice(0, 5),
      end_time: s.end_time.slice(0, 5),
      note: s.note,
      max_workers: s.max_workers,
      salary_multiplier: s.salary_multiplier,
      is_open: s.is_open,
      is_emergency: s.is_emergency,
      store: s.store,
    });
    setFormError('');
    setShowForm(true);
  };

  const handleDelete = async (s: Shift) => {
    const confirmed = await toast.confirm(
      `Xóa ca ${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)} ngày ${s.date}?`,
      'Xóa'
    );
    if (!confirmed) return;
    try {
      await api.delete(`/shifts/${s.id}/`);
      setShifts(prev => prev.filter(x => x.id !== s.id));
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Xóa thất bại.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (form.start_time >= form.end_time) {
      setFormError('Giờ kết thúc phải sau giờ bắt đầu.');
      return;
    }
    setSaving(true);
    try {
      const pad = (t: string) => t.length === 5 ? t + ':00' : t;
      const payload = {
        date: form.date,
        start_time: pad(form.start_time),
        end_time: pad(form.end_time),
        note: form.note,
        max_workers: Number(form.max_workers),
        salary_multiplier: form.salary_multiplier,
        is_open: form.is_open,
        is_emergency: form.is_emergency,
        store: form.store,
      };
      if (editTarget) {
        const res = await api.patch(`/shifts/${editTarget.id}/`, payload);
        setShifts(prev => prev.map(x => x.id === editTarget.id ? res.data : x));
      } else {
        const res = await api.post('/shifts/', payload);
        setShifts(prev => [res.data, ...prev]);
      }
      setShowForm(false);
    } catch (err: any) {
      const data = err.response?.data;
      if (data && typeof data === 'object') {
        setFormError(Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | '));
      } else {
        setFormError('Lưu thất bại. Vui lòng thử lại.');
      }
    } finally {
      setSaving(false);
    }
  };

  // Filter & search
  const filtered = shifts.filter(s => {
    if (filterStatus === 'open' && (!s.is_open || s.is_emergency)) return false;
    if (filterStatus === 'closed' && (s.is_open || s.is_emergency)) return false;
    if (filterStatus === 'emergency' && !s.is_emergency) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.date.includes(q) ||
        (s.note ?? '').toLowerCase().includes(q) ||
        (s.store_name ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const confirmedCount = (s: Shift) => s.assignments.filter(a => a.status === 'confirmed').length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 sm:p-6 lg:p-8 pb-4"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Quản lý ca làm việc</h1>
          <p className="text-slate-500 font-medium mt-1">Tạo, chỉnh sửa và xóa ca làm việc</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[#005ac2] text-white px-5 py-2.5 rounded-xl font-bold shadow-md hover:bg-[#004fab] active:scale-95 transition-all"
        >
          <PlusCircle className="h-5 w-5" />
          Tạo ca mới
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-4 flex flex-wrap gap-3 items-end">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Tìm theo ngày, ghi chú..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#005ac2]/20 focus:border-[#005ac2]/40"
          />
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">Từ ngày</label>
          <input
            type="date"
            value={filterFrom}
            onChange={e => { setFilterFrom(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#005ac2]/20 focus:border-[#005ac2]/40"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">Đến ngày</label>
          <input
            type="date"
            value={filterTo}
            onChange={e => { setFilterTo(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#005ac2]/20 focus:border-[#005ac2]/40"
          />
        </div>

        {/* Status filter */}
        <div className="flex gap-1.5">
          {(['all', 'open', 'closed', 'emergency'] as const).map(s => (
            <button
              key={s}
              onClick={() => { setFilterStatus(s); setPage(1); }}
              className={cn(
                'px-3 py-2 rounded-xl text-xs font-black transition-all border',
                filterStatus === s
                  ? s === 'emergency'
                    ? 'bg-red-500 text-white border-red-500'
                    : 'bg-[#005ac2] text-white border-[#005ac2]'
                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'
              )}
            >
              {{ all: 'Tất cả', open: 'Mở', closed: 'Đầy', emergency: 'Khẩn cấp' }[s]}
            </button>
          ))}
        </div>

        {/* Reset */}
        <button
          onClick={() => { setSearch(''); setFilterFrom(range.from); setFilterTo(range.to); setFilterStatus('all'); setPage(1); }}
          className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          title="Đặt lại bộ lọc"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-7 w-7 text-[#005ac2] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <CalendarCheck className="h-12 w-12 mb-3 text-slate-200" />
            <p className="font-bold text-sm">Không tìm thấy ca làm nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {['Ngày', 'Giờ ca', 'Ghi chú', 'Nhân sự', 'Hệ số lương', 'Trạng thái', 'Thao tác'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginated.map(s => {
                  const st = shiftStatus(s);
                  const cnt = confirmedCount(s);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">
                        {new Date(s.date + 'T00:00:00').toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="flex items-center gap-1 text-slate-700 font-medium">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate">
                        {s.note || <span className="text-slate-300 italic">—</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={cn(
                          'flex items-center gap-1 font-bold text-sm',
                          cnt >= s.max_workers ? 'text-green-600' : 'text-slate-700'
                        )}>
                          <Users className="h-3.5 w-3.5 text-slate-400" />
                          {cnt}/{s.max_workers}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={cn(
                          'font-bold',
                          Number(s.salary_multiplier) > 1 ? 'text-orange-600' : 'text-slate-500'
                        )}>
                          x{Number(s.salary_multiplier).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs font-black px-2.5 py-1 rounded-full', st.cls)}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(s)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#005ac2] hover:bg-[#005ac2]/10 transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(s)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-400 font-medium">
              {filtered.length} ca · Trang {page}/{totalPages}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Summary row */}
      {!loading && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Tổng ca', value: filtered.length, color: 'text-slate-700' },
            { label: 'Mở đăng ký', value: filtered.filter(s => s.is_open && !s.is_emergency).length, color: 'text-blue-600' },
            { label: 'Khẩn cấp', value: filtered.filter(s => s.is_emergency).length, color: 'text-red-600' },
            { label: 'Đủ nhân sự', value: filtered.filter(s => !s.is_open && !s.is_emergency).length, color: 'text-green-600' },
          ].map(item => (
            <div key={item.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
              <p className={cn('text-2xl font-black', item.color)}>{item.value}</p>
              <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">{item.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <AnimatePresence>
        {showForm && (
          <ShiftFormModal
            form={form}
            setForm={setForm}
            onSubmit={handleSubmit}
            onClose={() => setShowForm(false)}
            submitting={saving}
            error={formError}
            editMode={!!editTarget}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
