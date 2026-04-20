import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  Bell,
  Shield,
  Globe,
  Moon,
  HelpCircle,
  LogOut,
  ChevronRight,
  CreditCard,
  Lock,
  Store,
  MapPin,
  Phone,
  Navigation,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Save,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../lib/axios';

interface StoreData {
  id: number;
  name: string;
  address: string;
  phone: string;
  geo_latitude: string;
  geo_longitude: string;
  geo_radius_meters: number;
}

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const role = user?.role || 'employee';
  const isAdmin = role === 'admin' || role === 'manager';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sections = [
    {
      title: 'Tài khoản',
      items: [
        { icon: User,       label: 'Thông tin cá nhân',      desc: 'Cập nhật tên, email và ảnh đại diện',     color: 'bg-blue-100 text-blue-600',   path: '/profile/me' },
        { icon: Lock,       label: 'Mật khẩu & Bảo mật',    desc: 'Thay đổi mật khẩu và xác thực 2 lớp',    color: 'bg-purple-100 text-purple-600' },
        { icon: CreditCard, label: 'Phương thức thanh toán', desc: 'Quản lý tài khoản nhận lương',            color: 'bg-green-100 text-green-600' },
      ]
    },
    {
      title: 'Ứng dụng',
      items: [
        { icon: Bell,   label: 'Thông báo',       desc: 'Cấu hình thông báo đẩy và email',  color: 'bg-amber-100 text-amber-600' },
        { icon: Globe,  label: 'Ngôn ngữ',        desc: 'Tiếng Việt (Mặc định)',             color: 'bg-indigo-100 text-indigo-600' },
        { icon: Moon,   label: 'Chế độ tối',      desc: 'Tự động theo hệ thống',            color: 'bg-slate-100 text-slate-600', toggle: true },
      ]
    },
    {
      title: 'Hỗ trợ',
      items: [
        { icon: HelpCircle, label: 'Trung tâm trợ giúp',           desc: 'Câu hỏi thường gặp và hướng dẫn', color: 'bg-pink-100 text-pink-600' },
        { icon: Shield,     label: 'Điều khoản & Quyền riêng tư', desc: 'Chính sách bảo mật dữ liệu',      color: 'bg-cyan-100 text-cyan-600' },
      ]
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-4 sm:p-8 pb-12 max-w-4xl mx-auto"
    >
      <div className="mb-10">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Cài đặt</h1>
        <p className="text-slate-500 font-medium mt-1">Quản lý trải nghiệm ứng dụng và tài khoản của bạn</p>
      </div>

      <div className="space-y-10">

        {/* Store settings — admin only */}
        {isAdmin && <StoreSettings />}

        {/* Personal + App sections */}
        {sections.map((section) => (
          <div key={section.title}>
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1">{section.title}</h2>
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="divide-y divide-slate-50">
                {section.items.map((item: any) => (
                  <button
                    key={item.label}
                    onClick={() => item.path && navigate(item.path)}
                    className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn('h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm', item.color)}>
                        <item.icon className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-sm font-black text-slate-900">{item.label}</h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {item.toggle ? (
                        <div className="h-6 w-11 bg-slate-200 rounded-full relative p-1">
                          <div className="h-4 w-4 bg-white rounded-full shadow-sm"></div>
                        </div>
                      ) : (
                        <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-[#005ac2] group-hover:translate-x-1 transition-all" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Logout */}
        <div className="pt-2">
          <button
            onClick={handleLogout}
            className="w-full p-5 bg-red-50 text-red-600 rounded-3xl border border-red-100 font-black text-sm flex items-center justify-center gap-3 hover:bg-red-100 transition-all"
          >
            <LogOut className="h-5 w-5" />
            Đăng xuất khỏi thiết bị này
          </button>
          <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mt-6">
            ShiftMate v1.0.0
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function StoreSettings() {
  const [stores, setStores] = useState<StoreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<StoreData>>({});
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');

  useEffect(() => {
    api.get('/stores/')
      .then(r => setStores(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const startEdit = (store: StoreData) => {
    setEditingId(store.id);
    setForm({ ...store });
    setSaveStatus('idle');
    setErrorMsg('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({});
    setSaveStatus('idle');
  };

  const handleSave = async () => {
    if (!editingId) return;
    setSaving(true);
    setSaveStatus('idle');
    try {
      const res = await api.patch(`/stores/${editingId}/`, {
        name: form.name,
        address: form.address,
        phone: form.phone,
        geo_latitude: form.geo_latitude,
        geo_longitude: form.geo_longitude,
        geo_radius_meters: Number(form.geo_radius_meters),
      });
      setStores(prev => prev.map(s => s.id === editingId ? res.data : s));
      setSaveStatus('success');
      setTimeout(() => { setEditingId(null); setSaveStatus('idle'); }, 1200);
    } catch (err: any) {
      const data = err.response?.data;
      setErrorMsg(data ? Object.values(data).flat().join(', ') : 'Lưu thất bại.');
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const set = (field: keyof StoreData, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocError('Trình duyệt không hỗ trợ định vị.');
      return;
    }
    setLocating(true);
    setLocError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(prev => ({
          ...prev,
          geo_latitude: pos.coords.latitude.toFixed(8),
          geo_longitude: pos.coords.longitude.toFixed(8),
        }));
        setLocating(false);
      },
      (err) => {
        setLocError(
          err.code === 1 ? 'Bị từ chối quyền truy cập vị trí.' :
          err.code === 2 ? 'Không xác định được vị trí.' :
          'Hết thời gian lấy vị trí.'
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div>
      <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1 flex items-center gap-2">
        <Store className="h-3.5 w-3.5" />
        Cài đặt cửa hàng
      </h2>

      <div className="space-y-4">
        {loading && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 text-[#005ac2] animate-spin" />
          </div>
        )}

        {!loading && stores.length === 0 && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 text-center">
            <Store className="h-10 w-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-500">Chưa có cửa hàng nào</p>
          </div>
        )}

        {!loading && stores.map(store => (
          <div key={store.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Store header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-[#005ac2]/10 rounded-xl flex items-center justify-center">
                  <Store className="h-5 w-5 text-[#005ac2]" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900">{store.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">ID #{store.id}</p>
                </div>
              </div>
              {editingId !== store.id ? (
                <button
                  onClick={() => startEdit(store)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-700 text-sm font-bold rounded-xl hover:bg-[#005ac2] hover:text-white transition-all"
                >
                  <Edit3 className="h-4 w-4" /> Chỉnh sửa
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={cancelEdit}
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className={cn(
                      'flex items-center gap-1.5 px-4 py-2 text-sm font-black rounded-xl transition-all',
                      saveStatus === 'success'
                        ? 'bg-green-500 text-white'
                        : 'bg-[#005ac2] text-white hover:bg-[#004fab] shadow-lg shadow-[#005ac2]/20'
                    )}
                  >
                    {saving
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : saveStatus === 'success'
                        ? <><CheckCircle2 className="h-4 w-4" /> Đã lưu</>
                        : <><Save className="h-4 w-4" /> Lưu</>}
                  </button>
                </div>
              )}
            </div>

            {/* View mode */}
            {editingId !== store.id && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-slate-50">
                <InfoRow icon={<MapPin className="h-4 w-4" />} label="Địa chỉ" value={store.address} />
                <InfoRow icon={<Phone className="h-4 w-4" />} label="Số điện thoại" value={store.phone || '—'} />
                <InfoRow icon={<Navigation className="h-4 w-4" />} label="Tọa độ" value={`${store.geo_latitude}, ${store.geo_longitude}`} />
                <InfoRow icon={<Navigation className="h-4 w-4" />} label="Bán kính check-in" value={`${store.geo_radius_meters} mét`} />
              </div>
            )}

            {/* Edit mode */}
            <AnimatePresence>
              {editingId === store.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-6 py-5 space-y-4"
                >
                  {saveStatus === 'error' && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3">
                      <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-700 font-medium">{errorMsg}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Tên cửa hàng *">
                      <input
                        value={form.name ?? ''}
                        onChange={e => set('name', e.target.value)}
                        className={inputCls}
                        placeholder="Tên cửa hàng"
                      />
                    </Field>
                    <Field label="Số điện thoại">
                      <input
                        value={form.phone ?? ''}
                        onChange={e => set('phone', e.target.value)}
                        className={inputCls}
                        placeholder="0912345678"
                      />
                    </Field>
                  </div>

                  <Field label="Địa chỉ *">
                    <input
                      value={form.address ?? ''}
                      onChange={e => set('address', e.target.value)}
                      className={inputCls}
                      placeholder="Số nhà, đường, quận, thành phố"
                    />
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field label="Vĩ độ (Latitude)">
                      <input
                        type="number"
                        step="0.00000001"
                        value={form.geo_latitude ?? ''}
                        onChange={e => set('geo_latitude', e.target.value)}
                        className={inputCls}
                        placeholder="10.77609"
                      />
                    </Field>
                    <Field label="Kinh độ (Longitude)">
                      <input
                        type="number"
                        step="0.00000001"
                        value={form.geo_longitude ?? ''}
                        onChange={e => set('geo_longitude', e.target.value)}
                        className={inputCls}
                        placeholder="106.69508"
                      />
                    </Field>
                    <Field label="Bán kính check-in (m)">
                      <input
                        type="number"
                        min="10"
                        max="2000"
                        value={form.geo_radius_meters ?? ''}
                        onChange={e => set('geo_radius_meters', e.target.value)}
                        className={inputCls}
                        placeholder="100"
                      />
                    </Field>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleGetLocation}
                      disabled={locating}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 text-sm font-bold rounded-xl hover:bg-[#005ac2] hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {locating
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Navigation className="h-4 w-4" />}
                      {locating ? 'Đang lấy vị trí...' : 'Lấy vị trí hiện tại'}
                    </button>
                    {locError && (
                      <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" /> {locError}
                      </p>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Navigation className="h-3.5 w-3.5" />
                    Tọa độ và bán kính xác định khu vực hợp lệ để nhân viên thực hiện check-in QR.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 px-6 py-4">
      <div className="text-slate-400 mt-0.5 shrink-0">{icon}</div>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-bold text-slate-700 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-black text-slate-400 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-[#005ac2]/20 focus:border-[#005ac2]/40 focus:outline-none placeholder:text-slate-400 transition-colors';
