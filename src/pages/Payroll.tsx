import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calculator,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  DollarSign,
  FileText,
  Plus,
  RefreshCw,
  Download,
  Trash2,
  Edit3,
  Check,
  X,
  Loader2,
  Search,
  Filter,
  UserCheck,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  HelpCircle,
  Receipt,
  Eye,
} from 'lucide-react';
import api from '../lib/axios';
import { toast } from '../lib/toast';

interface Store {
  id: number;
  name: string;
}

interface PayrollDetail {
  id: number;
  user_id: number;
  user_name: string;
  user_phone: string;
  bank_account: string;
  bank_name: string;
  store_name: string;
  month: number;
  year: number;
  status_display: string;
  total_shifts: number;
  total_hours: string;
  hourly_rate: string;
  gross_amount: string;
  deduction: string;
  bonus: string;
  net_amount: string;
  note: string;
  late_count?: number;
  early_leave_count?: number;
  missing_checkout_count?: number;
}

interface PayrollPeriod {
  id: number;
  store: number;
  store_name: string;
  month: number;
  year: number;
  status: 'draft' | 'confirmed' | 'paid';
  status_display: string;
  created_by: number;
  created_by_name: string;
  confirmed_at: string | null;
  paid_at: string | null;
  note: string;
  total_employees: number;
  total_gross: string;
  total_deduction: string;
  total_bonus: string;
  total_net: string;
  details?: PayrollDetail[];
}

const fmt = (val: string | number) =>
  Number(val).toLocaleString('vi-VN') + ' đ';

export default function Payroll() {
  const now = new Date();
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<number | ''>('');
  const [filterMonth, setFilterMonth] = useState<number | ''>('');
  const [filterYear, setFilterYear] = useState<number | ''>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStoreId, setCreateStoreId] = useState<number | ''>('');
  const [createMonth, setCreateMonth] = useState<number>(now.getMonth() + 1);
  const [createYear, setCreateYear] = useState<number>(now.getFullYear());

  // Detail & Edit Modal
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Inline Detail Edit
  const [editingDetail, setEditingDetail] = useState<PayrollDetail | null>(null);
  const [editBonus, setEditBonus] = useState('');
  const [editDeduction, setEditDeduction] = useState('');
  const [editNote, setEditNote] = useState('');

  // Initial Data
  useEffect(() => {
    fetchStores();
  }, []);

  useEffect(() => {
    fetchPeriods();
  }, [selectedStoreId, filterMonth, filterYear, filterStatus]);

  const fetchStores = async () => {
    try {
      const r = await api.get('/stores/');
      setStores(r.data);
      if (r.data.length > 0) {
        setCreateStoreId(r.data[0].id);
      }
    } catch {
      toast.error('Không tải được danh sách cửa hàng.');
    }
  };

  const fetchPeriods = async () => {
    setLoading(true);
    try {
      const p = {
        store_id: selectedStoreId || undefined,
        month: filterMonth || undefined,
        year: filterYear || undefined,
        status: filterStatus || undefined,
      };
      const res = await api.get('/payroll/periods/', { params: p });
      setPeriods(res.data);
    } catch {
      toast.error('Không tải được danh sách kỳ lương.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrRecalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createStoreId) {
      toast.error('Vui lòng chọn cửa hàng');
      return;
    }
    setActionLoading(true);
    try {
      await api.post('/payroll/periods/', {
        store_id: createStoreId,
        month: createMonth,
        year: createYear,
      });
      toast.success(`Đã tổng hợp thành công kỳ lương Tháng ${createMonth}/${createYear}`);
      setShowCreateModal(false);
      fetchPeriods();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Có lỗi xảy ra khi tạo kỳ lương';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmPeriod = async (periodId: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn CHỐT bảng lương này? Sau khi chốt sẽ không thể chỉnh sửa và hệ thống sẽ gửi thông báo đến tất cả nhân viên.')) return;
    setActionLoading(true);
    try {
      await api.post(`/payroll/periods/${periodId}/confirm/`);
      toast.success('Đã chốt bảng lương thành công và gửi thông báo cho nhân viên!');
      fetchPeriods();
      if (selectedPeriod?.id === periodId) {
        fetchPeriodDetail(periodId);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Lỗi khi chốt bảng lương');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePayPeriod = async (periodId: number) => {
    if (!window.confirm('Xác nhận ĐÃ THANH TOÁN toàn bộ bảng lương này? Hệ thống sẽ gửi thông báo nhận lương thành công tới nhân viên.')) return;
    setActionLoading(true);
    try {
      await api.post(`/payroll/periods/${periodId}/pay/`);
      toast.success('Đã cập nhật trạng thái thanh toán và gửi thông báo thành công!');
      fetchPeriods();
      if (selectedPeriod?.id === periodId) {
        fetchPeriodDetail(periodId);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Lỗi khi xác nhận thanh toán');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecalculatePeriod = async (periodId: number) => {
    if (!window.confirm('Bạn muốn tính toán lại công cho bảng lương này? Hệ thống sẽ cập nhật dữ liệu chấm công mới nhất và giữ nguyên các khoản thưởng/phạt thủ công.')) return;
    setActionLoading(true);
    try {
      await api.post(`/payroll/periods/${periodId}/recalculate/`);
      toast.success('Đã tính toán lại công thành công!');
      fetchPeriods();
      if (selectedPeriod?.id === periodId) {
        fetchPeriodDetail(periodId);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Lỗi khi tính lại công');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePeriod = async (periodId: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa kỳ lương nháp này?')) return;
    setActionLoading(true);
    try {
      await api.delete(`/payroll/periods/${periodId}/`);
      toast.success('Đã xóa kỳ lương thành công');
      setSelectedPeriod(null);
      fetchPeriods();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Lỗi khi xóa kỳ lương');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportCSV = async (period: PayrollPeriod) => {
    try {
      setActionLoading(true);
      const response = await api.get(`/payroll/periods/${period.id}/export-csv/`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payroll_${period.store}_${period.month}_${period.year}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Đã tải xuống file CSV thành công');
    } catch (err: any) {
      toast.error('Lỗi khi xuất file CSV');
    } finally {
      setActionLoading(false);
    }
  };

  const fetchPeriodDetail = async (periodId: number) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/payroll/periods/${periodId}/`);
      setSelectedPeriod(res.data);
    } catch {
      toast.error('Không tải được chi tiết kỳ lương');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleStartEditDetail = (detail: PayrollDetail) => {
    setEditingDetail(detail);
    setEditBonus(detail.bonus);
    setEditDeduction(detail.deduction);
    setEditNote(detail.note);
  };

  const handleSaveDetailEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDetail || !selectedPeriod) return;
    setActionLoading(true);
    try {
      await api.patch(`/payroll/details/${editingDetail.id}/`, {
        bonus: editBonus || 0,
        deduction: editDeduction || 0,
        note: editNote || '',
      });
      toast.success('Đã cập nhật chi tiết phiếu lương thành công');
      setEditingDetail(null);
      await fetchPeriodDetail(selectedPeriod.id);
      fetchPeriods();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Lỗi khi cập nhật chi tiết');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string, statusDisplay: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-200/60 inline-flex items-center gap-1.5 shadow-sm">
            <Check className="h-3.5 w-3.5" /> {statusDisplay}
          </span>
        );
      case 'paid':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200/60 inline-flex items-center gap-1.5 shadow-sm">
            <CheckCircle2 className="h-3.5 w-3.5" /> {statusDisplay}
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-700 border border-amber-200/60 inline-flex items-center gap-1.5 shadow-sm">
            <Clock className="h-3.5 w-3.5 animate-pulse" /> {statusDisplay}
          </span>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6"
    >
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#005ac2] via-[#00479b] to-[#002f68] p-6 sm:p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-semibold uppercase tracking-wider text-blue-100">
            <Calculator className="h-3.5 w-3.5" /> Hệ thống Tính lương Tự động
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Quản lý Bảng lương</h1>
          <p className="text-blue-100 text-sm max-w-xl font-medium">
            Tự động tổng hợp công từ máy chấm công và ca làm việc, hỗ trợ điều chỉnh thưởng phạt, xuất file CSV kế toán và tự động phát thông báo đa kênh.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2.5 px-6 py-3.5 bg-white text-[#005ac2] hover:bg-blue-50 rounded-2xl font-black text-sm shadow-xl hover:shadow-2xl active:scale-95 transition-all group"
          >
            <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform" />
            Tạo bảng lương kỳ mới
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 font-bold text-slate-700 text-sm">
          <Filter className="h-4 w-4 text-[#005ac2]" /> Bộ lọc tìm kiếm:
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-[180px]">
          <Building2 className="h-4 w-4 text-slate-400" />
          <select
            value={selectedStoreId}
            onChange={(e) => setSelectedStoreId(e.target.value ? Number(e.target.value) : '')}
            className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#005ac2]/20"
          >
            <option value="">Tất cả cửa hàng</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value ? Number(e.target.value) : '')}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#005ac2]/20"
          >
            <option value="">Tất cả tháng</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>Tháng {m}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value ? Number(e.target.value) : '')}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#005ac2]/20"
          >
            <option value="">Tất cả năm</option>
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
              <option key={y} value={y}>Năm {y}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#005ac2]/20"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="draft">Nháp (Đang xử lý)</option>
            <option value="confirmed">Đã chốt</option>
            <option value="paid">Đã thanh toán</option>
          </select>
        </div>
      </div>

      {/* Main Grid / Table of Periods */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-24 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <Loader2 className="h-10 w-10 text-[#005ac2] animate-spin" />
          </div>
        ) : periods.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-16 text-center space-y-4">
            <div className="h-20 w-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-[#005ac2]">
              <Receipt className="h-10 w-10" />
            </div>
            <h3 className="font-black text-slate-800 text-lg">Không tìm thấy kỳ lương nào</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Sử dụng nút <strong className="text-[#005ac2]">"Tạo bảng lương kỳ mới"</strong> ở phía trên để tự động tổng hợp công và tính lương.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {periods.map((p) => {
              const isDraft = p.status === 'draft';
              const isConfirmed = p.status === 'confirmed';
              const isPaid = p.status === 'paid';

              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg transition-all p-6 sm:p-8 space-y-6 relative overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/60 border border-blue-200 flex items-center justify-center text-[#005ac2] font-black text-xl shadow-inner">
                        T{p.month}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                            Kỳ lương Tháng {p.month}/{p.year}
                          </h2>
                          {getStatusBadge(p.status, p.status_display)}
                        </div>
                        <p className="text-xs sm:text-sm font-semibold text-slate-500 flex items-center gap-2 mt-1">
                          <Building2 className="h-4 w-4 text-[#005ac2]" /> Cửa hàng: <strong className="text-slate-700 font-bold">{p.store_name}</strong>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-400">Tạo bởi: {p.created_by_name || 'Hệ thống'}</span>
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                      <button
                        onClick={() => {
                          setSelectedPeriod(p);
                          fetchPeriodDetail(p.id);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-[#005ac2] font-bold rounded-xl text-xs transition-colors"
                      >
                        <Eye className="h-4 w-4" /> Chi tiết & Chỉnh sửa
                      </button>

                      <button
                        onClick={() => handleExportCSV(p)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                      >
                        <Download className="h-4 w-4" /> Xuất file CSV
                      </button>

                      {isDraft && (
                        <>
                          <button
                            onClick={() => handleRecalculatePeriod(p.id)}
                            disabled={actionLoading}
                            className="flex items-center gap-1.5 px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-xl text-xs transition-colors"
                          >
                            <RefreshCw className={`h-4 w-4 ${actionLoading ? 'animate-spin' : ''}`} /> Tính lại
                          </button>

                          <button
                            onClick={() => handleConfirmPeriod(p.id)}
                            disabled={actionLoading}
                            className="flex items-center gap-1.5 px-5 py-2 bg-[#005ac2] hover:bg-[#004ab0] text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-95"
                          >
                            <Check className="h-4 w-4" /> Chốt bảng lương
                          </button>

                          <button
                            onClick={() => handleDeletePeriod(p.id)}
                            disabled={actionLoading}
                            className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors"
                            title="Xóa kỳ lương"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}

                      {isConfirmed && (
                        <button
                          onClick={() => handlePayPeriod(p.id)}
                          disabled={actionLoading}
                          className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-95"
                        >
                          <CheckCircle2 className="h-4 w-4" /> Đã thanh toán
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Metrics Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Số nhân sự</p>
                      <p className="text-xl font-black text-slate-800 mt-1">{p.total_employees} người</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng lương chính</p>
                      <p className="text-xl font-black text-slate-800 mt-1">{fmt(p.total_gross)}</p>
                    </div>
                    <div className="bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100">
                      <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                        <ArrowUpRight className="h-3.5 w-3.5" /> Tổng thưởng
                      </p>
                      <p className="text-xl font-black text-emerald-700 mt-1">+{fmt(p.total_bonus)}</p>
                    </div>
                    <div className="bg-red-50/40 p-4 rounded-2xl border border-red-100">
                      <p className="text-xs font-bold text-red-600 uppercase tracking-wider flex items-center gap-1">
                        <ArrowDownRight className="h-3.5 w-3.5" /> Tổng khấu trừ
                      </p>
                      <p className="text-xl font-black text-red-700 mt-1">-{fmt(p.total_deduction)}</p>
                    </div>
                    <div className="bg-blue-50/50 p-4 rounded-2xl border border-[#005ac2]/20 col-span-2 sm:col-span-1">
                      <p className="text-xs font-black text-[#005ac2] uppercase tracking-wider">Tổng chi trả (Thực lĩnh)</p>
                      <p className="text-2xl font-black text-[#005ac2] mt-1">{fmt(p.total_net)}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── CREATE / RECALCULATE MODAL ──────────────────────────────────────── */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 sm:p-8 max-w-md w-full space-y-6 relative"
            >
              <button
                onClick={() => setShowCreateModal(false)}
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="space-y-2">
                <div className="h-12 w-12 rounded-2xl bg-blue-50 text-[#005ac2] flex items-center justify-center font-bold">
                  <Calculator className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Tạo / Tính lương kỳ mới</h3>
                <p className="text-sm font-medium text-slate-500">
                  Hệ thống sẽ tự động quét chấm công hợp lệ trong tháng và áp dụng hệ số nhân để tổng hợp công.
                </p>
              </div>

              <form onSubmit={handleCreateOrRecalculate} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Cửa hàng áp dụng</label>
                  <select
                    value={createStoreId}
                    onChange={(e) => setCreateStoreId(Number(e.target.value))}
                    required
                    className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm font-medium bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#005ac2]/20 focus:bg-white transition-all"
                  >
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Tháng</label>
                    <select
                      value={createMonth}
                      onChange={(e) => setCreateMonth(Number(e.target.value))}
                      className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm font-medium bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#005ac2]/20"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>Tháng {m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Năm</label>
                    <select
                      value={createYear}
                      onChange={(e) => setCreateYear(Number(e.target.value))}
                      className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm font-medium bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#005ac2]/20"
                    >
                      {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-5 py-3 border border-slate-200 hover:bg-slate-100 rounded-2xl text-sm font-bold text-slate-600 transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-6 py-3 bg-[#005ac2] hover:bg-[#004ab0] active:scale-95 text-white rounded-2xl font-bold text-sm shadow-lg transition-all disabled:opacity-60"
                  >
                    {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Bắt đầu tính lương
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── PERIOD DETAIL & EDIT MODAL ─────────────────────────────────────── */}
      <AnimatePresence>
        {selectedPeriod && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-6xl w-full max-h-[92vh] flex flex-col relative overflow-hidden my-auto"
            >
              {/* Modal Header */}
              <div className="p-6 sm:p-8 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 pr-12">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black px-3 py-1 rounded-full bg-blue-100 text-[#005ac2] uppercase tracking-wider">
                      Chi tiết bảng lương
                    </span>
                    {getStatusBadge(selectedPeriod.status, selectedPeriod.status_display)}
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight pt-1">
                    Tháng {selectedPeriod.month}/{selectedPeriod.year} - {selectedPeriod.store_name}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExportCSV(selectedPeriod)}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-slate-700 font-bold text-xs shadow-sm transition-all"
                  >
                    <Download className="h-4 w-4 text-[#005ac2]" /> Xuất CSV
                  </button>

                  {selectedPeriod.status === 'draft' && (
                    <button
                      onClick={() => handleConfirmPeriod(selectedPeriod.id)}
                      disabled={actionLoading}
                      className="flex items-center gap-1.5 px-5 py-2.5 bg-[#005ac2] hover:bg-[#004ab0] text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-95"
                    >
                      <Check className="h-4 w-4" /> Chốt bảng lương
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedPeriod(null)}
                    className="p-2.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Table Content */}
              <div className="p-6 sm:p-8 flex-1 overflow-auto">
                {detailLoading ? (
                  <div className="flex items-center justify-center py-32">
                    <Loader2 className="h-10 w-10 text-[#005ac2] animate-spin" />
                  </div>
                ) : !selectedPeriod.details || selectedPeriod.details.length === 0 ? (
                  <div className="py-20 text-center text-slate-400 font-bold">
                    Không có dữ liệu chi tiết nhân viên trong kỳ này.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200/80 shadow-sm">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-100/70">
                          <th className="px-4 py-3.5 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Nhân sự</th>
                          <th className="px-4 py-3.5 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Ngân hàng</th>
                          <th className="px-4 py-3.5 text-right text-xs font-black text-slate-500 uppercase tracking-wider">Số ca</th>
                          <th className="px-4 py-3.5 text-right text-xs font-black text-slate-500 uppercase tracking-wider">Tổng giờ</th>
                          <th className="px-4 py-3.5 text-right text-xs font-black text-slate-500 uppercase tracking-wider">Lương chính</th>
                          <th className="px-4 py-3.5 text-right text-xs font-black text-emerald-600 uppercase tracking-wider">Thưởng (+)</th>
                          <th className="px-4 py-3.5 text-right text-xs font-black text-red-600 uppercase tracking-wider">Khấu trừ (-)</th>
                          <th className="px-4 py-3.5 text-right text-xs font-black text-[#005ac2] uppercase tracking-wider">Thực lĩnh</th>
                          <th className="px-4 py-3.5 text-center text-xs font-black text-slate-500 uppercase tracking-wider">Vi phạm</th>
                          <th className="px-4 py-3.5 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Ghi chú</th>
                          {selectedPeriod.status === 'draft' && (
                            <th className="px-4 py-3.5 text-center text-xs font-black text-slate-500 uppercase tracking-wider">Thao tác</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {selectedPeriod.details.map((d) => (
                          <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-4">
                              <p className="font-bold text-slate-900">{d.user_name}</p>
                              <p className="text-xs text-slate-400">{d.user_phone}</p>
                            </td>
                            <td className="px-4 py-4">
                              <p className="font-semibold text-slate-700">{d.bank_name || '—'}</p>
                              <p className="text-xs font-mono text-slate-500">{d.bank_account || 'Chưa cập nhật'}</p>
                            </td>
                            <td className="px-4 py-4 text-right font-semibold text-slate-700">{d.total_shifts}</td>
                            <td className="px-4 py-4 text-right font-semibold text-slate-700">{Number(d.total_hours).toFixed(2)}h</td>
                            <td className="px-4 py-4 text-right font-bold text-slate-800">{fmt(d.gross_amount)}</td>
                            <td className="px-4 py-4 text-right font-bold text-emerald-600">+{fmt(d.bonus)}</td>
                            <td className="px-4 py-4 text-right font-bold text-red-600">-{fmt(d.deduction)}</td>
                            <td className="px-4 py-4 text-right font-black text-[#005ac2] text-base">{fmt(d.net_amount)}</td>
                            <td className="px-4 py-4 text-center">
                              <div className="flex flex-wrap items-center justify-center gap-1">
                                {d.late_count ? (
                                  <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-bold rounded-lg text-xs border border-amber-200" title={`Đi muộn ${d.late_count} lần`}>
                                    Muộn: {d.late_count}
                                  </span>
                                ) : null}
                                {d.early_leave_count ? (
                                  <span className="px-2 py-0.5 bg-orange-50 text-orange-700 font-bold rounded-lg text-xs border border-orange-200" title={`Về sớm ${d.early_leave_count} lần`}>
                                    Sớm: {d.early_leave_count}
                                  </span>
                                ) : null}
                                {d.missing_checkout_count ? (
                                  <span className="px-2 py-0.5 bg-red-50 text-red-700 font-bold rounded-lg text-xs border border-red-200" title={`Quên check-out ${d.missing_checkout_count} lần`}>
                                    Quên C/O: {d.missing_checkout_count}
                                  </span>
                                ) : null}
                                {(!d.late_count && !d.early_leave_count && !d.missing_checkout_count) ? (
                                  <span className="text-xs text-slate-400 font-medium">Không</span>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-4 py-4 max-w-xs truncate text-slate-600" title={d.note}>{d.note || '—'}</td>
                            {selectedPeriod.status === 'draft' && (
                              <td className="px-4 py-4 text-center">
                                <button
                                  onClick={() => handleStartEditDetail(d)}
                                  className="p-2 bg-blue-50 hover:bg-blue-100 text-[#005ac2] rounded-xl font-bold text-xs inline-flex items-center gap-1 transition-colors"
                                >
                                  <Edit3 className="h-3.5 w-3.5" /> Sửa
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 sm:p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Tổng số nhân sự: {selectedPeriod.details?.length || 0}
                </span>
                <button
                  onClick={() => setSelectedPeriod(null)}
                  className="px-6 py-2.5 bg-slate-700 hover:bg-slate-800 text-white rounded-2xl font-bold text-sm transition-colors"
                >
                  Đóng cửa sổ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── INLINE DETAIL ADJUSTMENT MODAL ─────────────────────────────────── */}
      <AnimatePresence>
        {editingDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 sm:p-8 max-w-md w-full space-y-6 relative"
            >
              <button
                onClick={() => setEditingDetail(null)}
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="space-y-1">
                <span className="text-xs font-bold text-[#005ac2] bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wider">
                  Điều chỉnh phiếu lương
                </span>
                <h3 className="text-xl font-black text-slate-900 tracking-tight pt-2">
                  {editingDetail.user_name}
                </h3>
                <p className="text-xs text-slate-500 font-medium">Lương chính gốc: {fmt(editingDetail.gross_amount)}</p>
              </div>

              <form onSubmit={handleSaveDetailEdit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                    <ArrowUpRight className="h-3.5 w-3.5 font-bold" /> Thưởng / Phụ cấp (VND)
                  </label>
                  <input
                    type="number"
                    value={editBonus}
                    onChange={(e) => setEditBonus(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-3 border border-emerald-200 rounded-2xl text-sm font-bold bg-emerald-50/30 text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-red-700 uppercase tracking-wider flex items-center gap-1">
                    <ArrowDownRight className="h-3.5 w-3.5 font-bold" /> Khấu trừ / Phạt (VND)
                  </label>
                  <input
                    type="number"
                    value={editDeduction}
                    onChange={(e) => setEditDeduction(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-3 border border-red-200 rounded-2xl text-sm font-bold bg-red-50/30 text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Ghi chú điều chỉnh</label>
                  <textarea
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    rows={3}
                    placeholder="Nhập lý do thưởng hoặc khấu trừ (nếu có)..."
                    className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm font-medium bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#005ac2]/20"
                  />
                </div>

                <div className="pt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingDetail(null)}
                    className="px-5 py-3 border border-slate-200 hover:bg-slate-100 rounded-2xl text-sm font-bold text-slate-600 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-6 py-3 bg-[#005ac2] hover:bg-[#004ab0] active:scale-95 text-white rounded-2xl font-bold text-sm shadow-lg transition-all"
                  >
                    {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Lưu điều chỉnh
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
