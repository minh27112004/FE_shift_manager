import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Plus,
  Edit3,
  UserX,
  UserCheck,
  X,
  Loader2,
  Users,
  ChevronDown,
  AlertCircle,
  Eye,
  Phone,
  Mail,
  Shield
} from 'lucide-react';
import { cn } from '../lib/utils';
import api from '../lib/axios';
import { Link } from 'react-router-dom';

interface Employee {
  id: number;
  phone: string;
  email: string;
  full_name: string;
  role: 'employee' | 'manager';
  avatar_url: string;
  is_active: boolean;
  profile?: {
    hourly_rate: string;
    bank_account: string;
    bank_name: string;
    id_card_number: string;
    address: string;
    emergency_contact: string;
    start_date: string | null;
    note: string;
  };
}

const EMPTY_FORM = {
  full_name: '',
  phone: '',
  email: '',
  role: 'employee' as 'employee' | 'manager',
  password: '',
  profile: {
    hourly_rate: '',
    address: '',
    id_card_number: '',
    emergency_contact: '',
    start_date: '',
    bank_account: '',
    bank_name: '',
    note: ''
  }
};

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'employee' | 'manager'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [confirmDeactivate, setConfirmDeactivate] = useState<Employee | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await api.get('/employees/');
      setEmployees(res.data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEmployees(); }, []);

  // Filtered list
  const filtered = employees.filter(e => {
    const matchSearch =
      e.full_name.toLowerCase().includes(search.toLowerCase()) ||
      e.phone.includes(search) ||
      (e.email || '').toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || e.role === filterRole;
    const matchStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' ? e.is_active : !e.is_active);
    return matchSearch && matchRole && matchStatus;
  });

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setFormError('');
    setModal('add');
  };

  const openEdit = (emp: Employee) => {
    setEditTarget(emp);
    setForm({
      full_name: emp.full_name,
      phone: emp.phone,
      email: emp.email || '',
      role: emp.role,
      password: '',
      profile: {
        hourly_rate: emp.profile?.hourly_rate || '',
        address: emp.profile?.address || '',
        id_card_number: emp.profile?.id_card_number || '',
        emergency_contact: emp.profile?.emergency_contact || '',
        start_date: emp.profile?.start_date || '',
        bank_account: emp.profile?.bank_account || '',
        bank_name: emp.profile?.bank_name || '',
        note: emp.profile?.note || ''
      }
    });
    setFormError('');
    setModal('edit');
  };

  const closeModal = () => { setModal(null); setEditTarget(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      const payload: any = {
        full_name: form.full_name,
        phone: form.phone,
        email: form.email || undefined,
        role: form.role,
        profile: {
          hourly_rate: form.profile.hourly_rate || '0',
          address: form.profile.address,
          id_card_number: form.profile.id_card_number,
          emergency_contact: form.profile.emergency_contact,
          start_date: form.profile.start_date || null,
          bank_account: form.profile.bank_account,
          bank_name: form.profile.bank_name,
          note: form.profile.note
        }
      };
      if (modal === 'add') {
        payload.password = form.password || 'password123';
        await api.post('/employees/', payload);
      } else if (modal === 'edit' && editTarget) {
        if (form.password) payload.password = form.password;
        await api.patch(`/employees/${editTarget.id}/`, payload);
      }
      await fetchEmployees();
      closeModal();
    } catch (err: any) {
      const data = err.response?.data;
      if (data && typeof data === 'object') {
        const msgs = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ');
        setFormError(msgs);
      } else {
        setFormError('Có lỗi xảy ra. Vui lòng thử lại.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (emp: Employee) => {
    setActionLoading(emp.id);
    try {
      await api.delete(`/employees/${emp.id}/`);
      setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, is_active: false } : e));
    } catch {
      alert('Thao tác thất bại.');
    } finally {
      setActionLoading(null);
      setConfirmDeactivate(null);
    }
  };

  const handleActivate = async (emp: Employee) => {
    setActionLoading(emp.id);
    try {
      await api.post(`/employees/${emp.id}/activate/`);
      setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, is_active: true } : e));
    } catch {
      alert('Thao tác thất bại.');
    } finally {
      setActionLoading(null);
    }
  };

  const activeCount = employees.filter(e => e.is_active).length;
  const managerCount = employees.filter(e => e.role === 'manager').length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 sm:p-6 lg:p-8 pb-12">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Quản lý nhân viên</h1>
            <p className="text-slate-500 font-medium mt-1">
              {employees.length} nhân viên · {activeCount} đang hoạt động · {managerCount} quản lý
            </p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-[#005ac2] text-white px-6 py-2.5 rounded-xl font-bold shadow-md shadow-[#005ac2]/20 hover:bg-[#004fab] active:scale-95 transition-all text-sm"
          >
            <Plus className="h-4 w-4" />
            Thêm nhân viên
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên, SĐT, email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#005ac2]/20 focus:outline-none"
            />
          </div>
          <SelectFilter
            value={filterRole}
            onChange={v => setFilterRole(v as any)}
            options={[{ value: 'all', label: 'Tất cả vai trò' }, { value: 'employee', label: 'Nhân viên' }, { value: 'manager', label: 'Quản lý' }]}
          />
          <SelectFilter
            value={filterStatus}
            onChange={v => setFilterStatus(v as any)}
            options={[{ value: 'all', label: 'Tất cả trạng thái' }, { value: 'active', label: 'Đang hoạt động' }, { value: 'inactive', label: 'Đã vô hiệu hóa' }]}
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="h-7 w-7 text-[#005ac2] animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Users className="h-12 w-12 mb-3 opacity-30" />
              <p className="font-bold text-sm">Không tìm thấy nhân viên</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-6 py-3.5 text-[14px] font-black text-slate-400 uppercase tracking-widest">Nhân viên</th>
                    <th className="text-left px-4 py-3.5 text-[14px] font-black text-slate-400 uppercase tracking-widest hidden md:table-cell">Liên hệ</th>
                    <th className="text-left px-4 py-3.5 text-[14px] font-black text-slate-400 uppercase tracking-widest hidden lg:table-cell">Lương/giờ</th>
                    <th className="text-left px-4 py-3.5 text-[14px] font-black text-slate-400 uppercase tracking-widest">Vai trò</th>
                    <th className="text-left px-4 py-3.5 text-[14px] font-black text-slate-400 uppercase tracking-widest">Trạng thái</th>
                    <th className="px-4 py-3.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((emp, i) => (
                    <motion.tr
                      key={emp.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={cn(
                        'border-b border-slate-50 hover:bg-slate-50/50 transition-colors',
                        !emp.is_active && 'opacity-50'
                      )}
                    >
                      {/* Employee */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-[#005ac2]/10 flex items-center justify-center text-[#005ac2] font-black text-sm shrink-0">
                            {emp.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-base text-slate-900">{emp.full_name}</p>
                            <p className="text-xs text-slate-400">ID: {emp.id}</p>
                          </div>
                        </div>
                      </td>
                      {/* Contact */}
                      <td className="px-4 py-4 hidden md:table-cell">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-sm text-slate-600">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            {emp.phone}
                          </div>
                          {emp.email && (
                            <div className="flex items-center gap-1.5 text-sm text-slate-500">
                              <Mail className="h-3.5 w-3.5 text-slate-400" />
                              <span className="truncate max-w-[160px]">{emp.email}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      {/* Hourly rate */}
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <span className="text-sm font-bold text-slate-700">
                          {emp.profile?.hourly_rate
                            ? `${Number(emp.profile.hourly_rate).toLocaleString('vi-VN')}đ`
                            : <span className="text-slate-300">—</span>}
                        </span>
                      </td>
                      {/* Role */}
                      <td className="px-4 py-4">
                        <span className={cn(
                          'px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider',
                          emp.role === 'manager'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-50 text-[#005ac2]'
                        )}>
                          {emp.role === 'manager' ? 'Quản lý' : 'Nhân viên'}
                        </span>
                      </td>
                      {/* Status */}
                      <td className="px-4 py-4">
                        <span className={cn(
                          'px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider',
                          emp.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                        )}>
                          {emp.is_active ? 'Hoạt động' : 'Đã khóa'}
                        </span>
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1 justify-end">
                          <Link
                            to={`/profile/${emp.id}`}
                            className="p-2 text-slate-400 hover:text-[#005ac2] hover:bg-blue-50 rounded-lg transition-colors"
                            title="Xem hồ sơ"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => openEdit(emp)}
                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          {emp.is_active ? (
                            <button
                              onClick={() => setConfirmDeactivate(emp)}
                              disabled={actionLoading === emp.id}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Vô hiệu hóa"
                            >
                              {actionLoading === emp.id
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <UserX className="h-4 w-4" />}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivate(emp)}
                              disabled={actionLoading === emp.id}
                              className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Mở khóa"
                            >
                              {actionLoading === emp.id
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <UserCheck className="h-4 w-4" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {modal && (
          <EmployeeModal
            mode={modal}
            form={form}
            setForm={setForm}
            onSubmit={handleSubmit}
            onClose={closeModal}
            submitting={submitting}
            error={formError}
          />
        )}
      </AnimatePresence>

      {/* Confirm Deactivate Dialog */}
      <AnimatePresence>
        {confirmDeactivate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setConfirmDeactivate(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900">Vô hiệu hóa tài khoản</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Tài khoản sẽ bị khóa, không thể đăng nhập</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-6">
                Bạn có chắc chắn muốn vô hiệu hóa tài khoản của <strong>{confirmDeactivate.full_name}</strong>?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDeactivate(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={() => handleDeactivate(confirmDeactivate)}
                  disabled={actionLoading === confirmDeactivate.id}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                >
                  {actionLoading === confirmDeactivate.id
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : 'Vô hiệu hóa'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Select Filter ─────────────────────────────────────────────────────────────

function SelectFilter({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2.5 pr-8 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-[#005ac2]/20 focus:outline-none cursor-pointer"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
    </div>
  );
}

// ─── Employee Modal ────────────────────────────────────────────────────────────

interface ModalProps {
  mode: 'add' | 'edit';
  form: typeof EMPTY_FORM;
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  submitting: boolean;
  error: string;
}

function EmployeeModal({ mode, form, setForm, onSubmit, onClose, submitting, error }: ModalProps) {
  const [tab, setTab] = useState<'basic' | 'profile'>('basic');
  const overlayRef = useRef<HTMLDivElement>(null);

  const set = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));
  const setProfile = (field: string, value: string) =>
    setForm(prev => ({ ...prev, profile: { ...prev.profile, [field]: value } }));

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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col"
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-[#005ac2]/10 rounded-lg flex items-center justify-center">
              {mode === 'add' ? <Plus className="h-4 w-4 text-[#005ac2]" /> : <Edit3 className="h-4 w-4 text-[#005ac2]" />}
            </div>
            <h2 className="font-black text-slate-900">
              {mode === 'add' ? 'Thêm nhân viên mới' : 'Chỉnh sửa nhân viên'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4">
          {(['basic', 'profile'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-4 py-2 rounded-lg text-xs font-black transition-colors',
                tab === t ? 'bg-[#005ac2] text-white' : 'text-slate-500 hover:bg-slate-100'
              )}
            >
              {t === 'basic' ? 'Thông tin cơ bản' : 'Hồ sơ nhân viên'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 font-medium">{error}</p>
              </div>
            )}

            {tab === 'basic' && (
              <>
                <FormField label="Họ và tên *" required>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={e => set('full_name', e.target.value)}
                    required
                    placeholder="Nguyễn Văn A"
                    className={inputCls}
                  />
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Số điện thoại *" required>
                    <input
                      type="text"
                      value={form.phone}
                      onChange={e => set('phone', e.target.value)}
                      required
                      placeholder="0912345678"
                      className={inputCls}
                    />
                  </FormField>
                  <FormField label="Email">
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => set('email', e.target.value)}
                      placeholder="example@email.com"
                      className={inputCls}
                    />
                  </FormField>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Vai trò *">
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <select
                        value={form.role}
                        onChange={e => set('role', e.target.value)}
                        className={cn(inputCls, 'pl-9 appearance-none')}
                      >
                        <option value="employee">Nhân viên</option>
                        <option value="manager">Quản lý</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                  </FormField>
                  <FormField label={mode === 'add' ? 'Mật khẩu *' : 'Đặt lại mật khẩu'}>
                    <input
                      type="password"
                      value={form.password}
                      onChange={e => set('password', e.target.value)}
                      required={mode === 'add'}
                      placeholder={mode === 'add' ? 'Tối thiểu 6 ký tự' : 'Để trống = giữ nguyên'}
                      className={inputCls}
                    />
                  </FormField>
                </div>
              </>
            )}

            {tab === 'profile' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Lương/giờ (VNĐ)">
                    <input
                      type="number"
                      value={form.profile.hourly_rate}
                      onChange={e => setProfile('hourly_rate', e.target.value)}
                      placeholder="25000"
                      min="0"
                      className={inputCls}
                    />
                  </FormField>
                  <FormField label="Ngày bắt đầu">
                    <input
                      type="date"
                      value={form.profile.start_date}
                      onChange={e => setProfile('start_date', e.target.value)}
                      className={inputCls}
                    />
                  </FormField>
                </div>
                <FormField label="Số CCCD">
                  <input
                    type="text"
                    value={form.profile.id_card_number}
                    onChange={e => setProfile('id_card_number', e.target.value)}
                    placeholder="001234567890"
                    className={inputCls}
                  />
                </FormField>
                <FormField label="Địa chỉ">
                  <input
                    type="text"
                    value={form.profile.address}
                    onChange={e => setProfile('address', e.target.value)}
                    placeholder="Số nhà, đường, quận, thành phố"
                    className={inputCls}
                  />
                </FormField>
                <FormField label="Liên hệ khẩn cấp">
                  <input
                    type="text"
                    value={form.profile.emergency_contact}
                    onChange={e => setProfile('emergency_contact', e.target.value)}
                    placeholder="Tên - SĐT"
                    className={inputCls}
                  />
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Ngân hàng">
                    <input
                      type="text"
                      value={form.profile.bank_name}
                      onChange={e => setProfile('bank_name', e.target.value)}
                      placeholder="Vietcombank"
                      className={inputCls}
                    />
                  </FormField>
                  <FormField label="Số tài khoản">
                    <input
                      type="text"
                      value={form.profile.bank_account}
                      onChange={e => setProfile('bank_account', e.target.value)}
                      placeholder="1234567890"
                      className={inputCls}
                    />
                  </FormField>
                </div>
                <FormField label="Ghi chú">
                  <textarea
                    value={form.profile.note}
                    onChange={e => setProfile('note', e.target.value)}
                    rows={3}
                    placeholder="Ghi chú thêm về nhân viên..."
                    className={cn(inputCls, 'resize-none')}
                  />
                </FormField>
              </>
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
              className="flex-1 px-4 py-2.5 bg-[#005ac2] text-white rounded-xl font-bold text-sm hover:bg-[#004fab] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#005ac2]/20"
            >
              {submitting
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : mode === 'add' ? 'Thêm nhân viên' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-[#005ac2]/20 focus:border-[#005ac2]/40 focus:outline-none placeholder:text-slate-400 transition-colors';
