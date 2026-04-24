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
  Award, 
  Clock, 
  Star,
  Edit3,
  Camera,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import api from '../lib/axios';
import { useAuth } from '../context/AuthContext';

export default function EmployeeProfile() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ phone: '', address: '', first_name: '', last_name: '' });

  const fetchEmployee = async () => {
    setLoading(true);
    try {
      if (!id || isNaN(Number(id))) {
        const response = await api.get('/me/');
        setEmployee(response.data);
        setFormData({
          phone: response.data.phone || '',
          address: response.data.address || '',
          first_name: response.data.first_name || '',
          last_name: response.data.last_name || ''
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
      await api.patch('/me/', formData);
      setIsEditing(false);
      await fetchEmployee();
      alert('Cập nhật hồ sơ thành công!');
    } catch (error: any) {
      alert('Cập nhật thất bại: ' + (error.response?.data?.detail || 'Lỗi hệ thống'));
    }
  };

  const startDate = employee?.profile?.start_date;
  const tenureYears = startDate
    ? ((Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24 * 365)).toFixed(1)
    : null;

  const stats = [
    { label: 'Ngày bắt đầu', value: startDate ? new Date(startDate).toLocaleDateString('vi-VN') : '—', icon: CheckCircle2, color: 'text-green-600' },
    { label: 'Lương/giờ', value: employee?.profile?.hourly_rate ? `${Number(employee.profile.hourly_rate).toLocaleString('vi-VN')}đ` : '—', icon: Clock, color: 'text-blue-600' },
    { label: 'Thâm niên', value: tenureYears ? `${tenureYears} năm` : '—', icon: Award, color: 'text-purple-600' },
    { label: 'Trạng thái', value: employee?.is_active ? 'Đang làm' : 'Đã nghỉ', icon: Star, color: employee?.is_active ? 'text-green-600' : 'text-red-500' },
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
                <span className="text-sm font-bold text-slate-500">ID: EMP-{employee.id || 'N/A'}</span>
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
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Họ</label>
                <input 
                  type="text" 
                  value={formData.first_name} 
                  onChange={e => setFormData({...formData, first_name: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-[#005ac2]/20 outline-none" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tên</label>
                <input 
                  type="text" 
                  value={formData.last_name} 
                  onChange={e => setFormData({...formData, last_name: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-[#005ac2]/20 outline-none" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Số điện thoại</label>
                <input 
                  type="text" 
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-[#005ac2]/20 outline-none" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Địa chỉ</label>
                <input 
                  type="text" 
                  value={formData.address} 
                  onChange={e => setFormData({...formData, address: e.target.value})}
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
      </div>
    </motion.div>
  );
}
