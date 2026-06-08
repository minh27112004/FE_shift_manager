import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Clock,
  Edit3,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../lib/utils';
import api from '../lib/axios';
import { useAuth } from '../context/AuthContext';
import { toast } from '../lib/toast';

export default function EmployeeProfile() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  
  console.log("EmployeeProfile Debug:", {
    id,
    currentUserRole: currentUser?.role,
    shouldShowAttendance: (!id || id === 'me') || currentUser?.role === 'admin' || currentUser?.role === 'manager'
  });
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    address: '',
    telegram_chat_id: '',
    emergency_contact: '',
  });

  const fetchEmployee = async () => {
    setLoading(true);
    try {
      if (!id || isNaN(Number(id))) {
        const response = await api.get('/me/');
        setEmployee(response.data);
        setFormData({
          full_name: response.data.full_name || '',
          email: response.data.email || '',
          address: response.data.profile?.address || '',
          telegram_chat_id: response.data.telegram_chat_id || '',
          emergency_contact: response.data.profile?.emergency_contact || '',
        });
      } else {
        const response = await api.get(`/employees/${id}/`);
        setEmployee(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch employee profile', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployee();
  }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.patch('/me/', {
        full_name: formData.full_name,
        email: formData.email,
        telegram_chat_id: formData.telegram_chat_id,
        profile: {
          address: formData.address,
          emergency_contact: formData.emergency_contact
        }
      });
      setIsEditing(false);
      await fetchEmployee();
      toast.success('Cập nhật hồ sơ thành công!');
    } catch {
    }
  };

  const stats = [
    { label: 'Lương/giờ', value: employee?.profile?.hourly_rate ? `${Number(employee.profile.hourly_rate).toLocaleString('vi-VN')}đ` : '—', icon: Clock, color: 'text-blue-600' },
    { label: 'Trạng thái', value: 'Đang làm việc', icon: CheckCircle2, color: 'text-green-600' },
  ];

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Đang tải hồ sơ nhân viên...</div>;
  }

  if (!employee) {
    return <div className="p-8 text-center text-red-500">Không tìm thấy hồ sơ nhân viên.</div>;
  }

  const fullName = employee.full_name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || employee.email || 'Nhân viên';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-8 pb-12"
    >
      <div className="max-w-5xl mx-auto">
        {/* Profile Header */}
        <div className="relative mb-8">
          <div className="h-48 w-full bg-gradient-to-r from-[#005ac2] to-[#5f5c78] rounded-3xl shadow-lg"></div>
          <div className="absolute -bottom-12 left-8 flex items-end gap-6">
            <div className="relative">
              <div className="h-32 w-32 rounded-3xl border-4 border-white shadow-xl bg-slate-200 flex items-center justify-center overflow-hidden">
                <span className="text-4xl font-black text-slate-500 uppercase">{fullName.charAt(0)}</span>
              </div>
              <button className="absolute -right-2 -bottom-2 h-10 w-10 bg-white rounded-xl shadow-lg border border-slate-100 flex items-center justify-center text-[#005ac2] hover:scale-110 transition-transform">
                <Camera className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-4">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">{fullName}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="px-3 py-1 bg-[#d8e2ff] text-[#005ac2] text-[10px] font-black rounded-full uppercase tracking-widest">
                  {employee.role || 'Nhân viên chính thức'}
                </span>
              </div>
            </div>
          </div>
          <div className="absolute bottom-4 right-8">
            {(!id || id === 'me') && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-6 py-2.5 bg-white/20 backdrop-blur-md text-white border border-white/30 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-white/30 transition-all"
              >
                <Edit3 className="h-4 w-4" />
                {isEditing ? 'Hủy chỉnh sửa' : 'Chỉnh sửa hồ sơ'}
              </button>
            )}
          </div>
        </div>

        {isEditing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="mt-20 bg-white p-8 rounded-3xl shadow-sm border border-slate-100 mb-8"
          >
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Cập nhật thông tin</h2>
            <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Họ và tên</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-[#005ac2]/20 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-[#005ac2]/20 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Telegram Chat ID</label>
                <input
                  type="text"
                  value={formData.telegram_chat_id}
                  onChange={e => setFormData({ ...formData, telegram_chat_id: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-[#005ac2]/20 outline-none"
                  placeholder="ID chat nhận thông báo..."
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Địa chỉ</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-[#005ac2]/20 outline-none"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Liên hệ khẩn cấp</label>
                <input
                  type="text"
                  value={formData.emergency_contact}
                  onChange={e => setFormData({ ...formData, emergency_contact: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-[#005ac2]/20 outline-none"
                />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <button type="submit" className="px-8 py-3 bg-[#005ac2] text-white font-black text-xs rounded-xl shadow-lg shadow-[#005ac2]/20 hover:bg-[#004fab] transition-all uppercase tracking-widest">
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </motion.div>
        )}

        <div className={cn("grid grid-cols-1 lg:grid-cols-3 gap-8", !isEditing ? "mt-20" : "mt-8")}>
          {/* Left Column: Info */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Thông tin liên hệ</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-slate-400 uppercase">Email</p>
                    <p className="text-base font-bold text-slate-700 truncate">{employee.email}</p>
                  </div>
                </div>
                {employee.phone && (
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase">Số điện thoại</p>
                      <p className="text-base font-bold text-slate-700">{employee.phone}</p>
                    </div>
                  </div>
                )}
                {employee.address && (
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase">Địa chỉ</p>
                      <p className="text-base font-bold text-slate-700">{employee.address}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Công việc</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Vai trò</p>
                    <p className="text-base font-bold text-slate-700 capitalize">{employee.role || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Ngày gia nhập</p>
                    <p className="text-base font-bold text-slate-700">{new Date(employee.date_joined || Date.now()).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Stats & Performance */}
          <div className="lg:col-span-2 space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map((stat) => (
                <div key={stat.label} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 text-center">
                  <div className={cn("h-10 w-10 mx-auto rounded-2xl bg-slate-50 flex items-center justify-center mb-3", stat.color)}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <p className="text-xl font-black text-slate-900">{stat.value}</p>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Profile details */}
            {employee?.profile && (
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Thông tin bổ sung</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {employee.profile.id_card_number && (
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Số CCCD</p>
                      <p className="text-base font-bold text-slate-700 mt-0.5">{employee.profile.id_card_number}</p>
                    </div>
                  )}
                  {employee.profile.bank_name && (
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ngân hàng</p>
                      <p className="text-base font-bold text-slate-700 mt-0.5">{employee.profile.bank_name} · {employee.profile.bank_account || '—'}</p>
                    </div>
                  )}
                  {employee.profile.emergency_contact && (
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Liên hệ khẩn cấp</p>
                      <p className="text-base font-bold text-slate-700 mt-0.5">{employee.profile.emergency_contact}</p>
                    </div>
                  )}
                  {employee.profile.note && (
                    <div className="sm:col-span-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ghi chú</p>
                      <p className="text-base text-slate-600 mt-0.5">{employee.profile.note}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tính công */}
        {((!id || id === 'me') || currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
          <AttendanceSection 
            userId={id && id !== 'me' ? Number(id) : undefined} 
            employeeName={fullName}
          />
        )}
      </div>
    </motion.div>
  );
}

interface AttendanceRecord {
  id: number | null;
  shift: number;
  user: number;
  shift_date: string;
  shift_start: string;
  shift_end: string;
  store_name: string;
  checkin_at: string | null;
  checkout_at: string | null;
  worked_minutes: number | null;
  is_late: boolean;
  late_minutes: number;
  auto_checkout?: boolean;
  is_manual_override?: boolean;
  overridden_by_name?: string;
  override_reason?: string;
}

function AttendanceSection({ userId, employeeName }: { userId?: number; employeeName: string }) {
  const { user: currentUser } = useAuth();
  const isAdminOrManager = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Manual override states
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideData, setOverrideData] = useState({
    checkin_at: '',
    checkout_at: '',
    reason: '',
  });
  const [overrideError, setOverrideError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRecords = () => {
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
    setLoading(true);
    setError('');
    const url = userId
      ? `/attendance/records/user/${userId}/?from=${from}&to=${to}`
      : `/attendance/records/me/?from=${from}&to=${to}`;
    api.get(url)
      .then(r => setRecords(r.data))
      .catch(err => {
        setRecords([]);
        setError(err.response?.data?.detail || 'Không thể tải dữ liệu chấm công.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRecords();
  }, [year, month, userId]);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };
  const isNextDisabled = year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);

  const completedRecords = records.filter(r => r.checkin_at && r.checkout_at);
  const totalShifts = completedRecords.length;
  const totalMinutes = completedRecords.reduce((s, r) => s + (r.worked_minutes ?? 0), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const lateCount = completedRecords.filter(r => r.is_late).length;
  const totalLateMinutes = completedRecords.reduce((s, r) => s + (r.late_minutes ?? 0), 0);

  const fmt = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const isShiftEnded = (r: AttendanceRecord) => {
    if (!r.shift_end || !r.shift_start) return false;
    const [endHour, endMin] = r.shift_end.split(':').map(Number);
    const shiftEndDt = new Date(r.shift_date);
    shiftEndDt.setHours(endHour, endMin, 0, 0);

    const [startHour, startMin] = r.shift_start.split(':').map(Number);
    if (endHour < startHour) {
      shiftEndDt.setDate(shiftEndDt.getDate() + 1);
    }
    return shiftEndDt < new Date();
  };

  const toLocalDatetimeLocalString = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const getShiftDatetimeLocal = (shiftDate: string, shiftTime: string) => {
    return `${shiftDate}T${shiftTime.slice(0, 5)}`;
  };

  const handleOpenOverrideModal = (record: AttendanceRecord) => {
    setSelectedRecord(record);
    setOverrideError('');
    setOverrideData({
      checkin_at: toLocalDatetimeLocalString(record.checkin_at) || getShiftDatetimeLocal(record.shift_date, record.shift_start),
      checkout_at: toLocalDatetimeLocalString(record.checkout_at) || getShiftDatetimeLocal(record.shift_date, record.shift_end),
      reason: record.override_reason || '',
    });
    setIsOverrideModalOpen(true);
  };

  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    if (!overrideData.reason.trim()) {
      setOverrideError('Lý do chỉnh sửa là bắt buộc.');
      return;
    }
    const checkinDate = new Date(overrideData.checkin_at);
    const checkoutDate = overrideData.checkout_at ? new Date(overrideData.checkout_at) : null;
    if (checkoutDate && checkoutDate < checkinDate) {
      setOverrideError('Thời gian check-out không được trước thời gian check-in.');
      return;
    }

    setSubmitting(true);
    setOverrideError('');
    try {
      await api.post(`/attendance/records/override-shift/`, {
        shift_id: selectedRecord.shift,
        user_id: selectedRecord.user,
        checkin_at: overrideData.checkin_at,
        checkout_at: overrideData.checkout_at || null,
        reason: overrideData.reason,
      });
      toast.success('Chỉnh sửa chấm công thành công!');
      setIsOverrideModalOpen(false);
      fetchRecords();
    } catch (err: any) {
      setOverrideError(err.response?.data?.detail || 'Lỗi hệ thống khi chỉnh sửa chấm công.');
    } finally {
      setSubmitting(false);
    }
  };

  const summary = [
    { label: 'Ca hoàn thành', value: `${totalShifts} ca`, icon: Calendar, color: 'bg-blue-50 text-blue-600' },
    { label: 'Tổng giờ làm', value: `${totalHours}h`, icon: Clock, color: 'bg-green-50 text-green-600' },
    { label: 'Số ca đi muộn', value: `${lateCount} ca`, icon: AlertTriangle, color: lateCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400' },
    { label: 'Tổng phút muộn', value: `${totalLateMinutes} phút`, icon: Clock, color: totalLateMinutes > 0 ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400' },
  ];


  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Bảng tính công</h2>
        <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-2xl px-3 py-2 shadow-sm">
          <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-slate-100 transition-colors text-slate-500">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-black text-slate-700 min-w-[90px] text-center">
            Tháng {month}/{year}
          </span>
          <button onClick={nextMonth} disabled={isNextDisabled} className="p-1 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {summary.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
            <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0', s.color)}>
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-black text-slate-900">{s.value}</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-300">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 text-[#005ac2] animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-red-400">
            <AlertTriangle className="h-10 w-10 mb-3 text-red-200" />
            <p className="text-sm font-bold">{error}</p>
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Calendar className="h-10 w-10 mb-3 text-slate-200" />
            <p className="text-sm font-bold">Không có dữ liệu chấm công trong tháng này</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="text-left px-5 py-3 text-xs font-black text-slate-400 uppercase tracking-wider">Ngày</th>
                  <th className="text-left px-5 py-3 text-xs font-black text-slate-400 uppercase tracking-wider">Ca làm</th>
                  <th className="text-left px-5 py-3 text-xs font-black text-slate-400 uppercase tracking-wider">Check-in</th>
                  <th className="text-left px-5 py-3 text-xs font-black text-slate-400 uppercase tracking-wider">Check-out</th>
                  <th className="text-right px-5 py-3 text-xs font-black text-slate-400 uppercase tracking-wider">Giờ làm</th>
                  <th className="text-center px-5 py-3 text-xs font-black text-slate-400 uppercase tracking-wider">Trạng thái</th>
                  {isAdminOrManager && (
                    <th className="text-center px-5 py-3 text-xs font-black text-slate-400 uppercase tracking-wider">Thao tác</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {records.map(r => (
                  <tr key={r.id || `placeholder-${r.shift}-${r.user}`} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-700">
                      {new Date(r.shift_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {r.shift_start?.slice(0, 5)} – {r.shift_end?.slice(0, 5)}
                    </td>
                    <td className="px-5 py-4 text-slate-700 font-medium">{fmt(r.checkin_at)}</td>
                    <td className="px-5 py-4 text-slate-700 font-medium">{fmt(r.checkout_at)}</td>
                    <td className="px-5 py-4 text-right font-bold text-slate-700">
                      {r.worked_minutes != null ? `${(r.worked_minutes / 60).toFixed(1)}h` : '—'}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center gap-1.5 justify-center">
                        {!r.checkin_at ? (
                          isShiftEnded(r) ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 text-rose-600 text-xs font-black">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              Vắng mặt
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-400 text-xs font-black">
                              <Clock className="h-3.5 w-3.5" />
                              Chưa check-in
                            </span>
                          )
                        ) : r.auto_checkout ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-red-500 text-xs font-black" title="Hệ thống tự động chốt ca vì quên checkout">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Quên checkout
                          </span>
                        ) : !r.checkout_at ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-500 text-xs font-black">
                            <Clock className="h-3.5 w-3.5" />
                            Chưa check-out
                          </span>
                        ) : r.is_late ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-600 text-xs font-black">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Muộn {r.late_minutes}p
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 text-green-600 text-xs font-black">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Hoàn thành
                          </span>
                        )}
                        {r.is_manual_override && (
                          <span 
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black cursor-help uppercase tracking-wider" 
                            title={`Chỉnh sửa bởi ${r.overridden_by_name || 'Admin'}\nLý do: ${r.override_reason}`}
                          >
                            Đã sửa
                          </span>
                        )}
                      </div>
                    </td>
                    {isAdminOrManager && (
                      <td className="px-5 py-4 text-center">
                        <button
                          onClick={() => handleOpenOverrideModal(r)}
                          className="px-4 py-2 bg-gradient-to-r from-[#005ac2]/10 to-[#5f5c78]/10 text-[#005ac2] text-xs font-black uppercase tracking-widest rounded-xl hover:from-[#005ac2] hover:to-[#5f5c78] hover:text-white transition-all shadow-sm duration-300"
                        >
                          Sửa
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

      {/* Manual Override Modal */}
      {isOverrideModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-md"
            onClick={() => setIsOverrideModalOpen(false)}
          ></div>
          
          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 overflow-hidden z-10"
          >
            <h3 className="text-xl font-black text-slate-900 tracking-tight mb-1">
              Chỉnh sửa chấm công
            </h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">
              Nhân viên: {employeeName} <br /> 
              Ngày ca làm: {new Date(selectedRecord.shift_date).toLocaleDateString('vi-VN')} ({selectedRecord.shift_start?.slice(0, 5)} - {selectedRecord.shift_end?.slice(0, 5)})
            </p>

            <form onSubmit={handleOverrideSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider block">
                  Thời gian Check-in <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={overrideData.checkin_at}
                  onChange={e => setOverrideData({ ...overrideData, checkin_at: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-sm focus:ring-2 focus:ring-[#005ac2]/20 outline-none font-bold text-slate-700"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider block">
                  Thời gian Check-out
                </label>
                <input
                  type="datetime-local"
                  value={overrideData.checkout_at}
                  onChange={e => setOverrideData({ ...overrideData, checkout_at: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-sm focus:ring-2 focus:ring-[#005ac2]/20 outline-none font-bold text-slate-700"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider block">
                  Lý do chỉnh sửa <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={overrideData.reason}
                  onChange={e => setOverrideData({ ...overrideData, reason: e.target.value })}
                  required
                  rows={3}
                  placeholder="Nhập lý do bắt buộc (ví dụ: Quên check-in/out, máy quét lỗi...)"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-sm focus:ring-2 focus:ring-[#005ac2]/20 outline-none text-slate-700 placeholder:text-slate-400 placeholder:font-normal"
                />
              </div>

              {overrideError && (
                <p className="text-xs font-bold text-red-500 animate-pulse">{overrideError}</p>
              )}

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsOverrideModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors font-black text-xs uppercase tracking-widest rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-[#005ac2] text-white hover:bg-[#004fab] transition-all font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-[#005ac2]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

