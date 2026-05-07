import { useState, useEffect } from 'react';
import { toast } from '../lib/toast';
import { motion } from 'motion/react';
import {
  BadgeCheck,
  Clock,
  AlertTriangle,
  Wallet,
  TrendingUp,
  CheckCircle2,
  Bed,
  History,
  Timer,
  LogOut,
  Bell
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useShifts } from '../context/ShiftContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../lib/axios';

export default function Dashboard() {
  const { shifts } = useShifts();
  const { user } = useAuth();
  const role = user?.role || 'employee';

  if (role === 'admin' || role === 'manager') {
    return <AdminDashboard shifts={shifts} />;
  }
  return <EmployeeDashboard shifts={shifts} user={user} />;
}

function AdminDashboard({ shifts }: { shifts: any[] }) {
  const [employeeCount, setEmployeeCount] = useState<number | null>(null);
  const [pendingSwaps, setPendingSwaps] = useState<number | null>(null);
  useEffect(() => {
    api.get('/employees/').then(r => setEmployeeCount(r.data.length)).catch(() => {});
    api.get('/shifts/swap-requests/').then(r => {
      const pending = r.data.filter((s: any) => s.status === 'pending' || s.status === 'partner_accepted');
      setPendingSwaps(pending.length);
    }).catch(() => {});
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayShifts = shifts.filter(s => s.date === todayStr);

  const stats = [
    {
      label: 'Tổng nhân viên',
      value: employeeCount !== null ? employeeCount.toString() : '—',
      trend: 'Nhân viên đang hoạt động',
      icon: BadgeCheck,
      color: 'bg-[#d8e2ff] text-[#005ac2]',
      tag: 'Trực tiếp'
    },
    {
      label: 'Ca làm hôm nay',
      value: todayShifts.length.toString(),
      trend: `${todayShifts.filter(s => !s.backendData?.is_open).length} đã có người`,
      icon: Clock,
      color: 'bg-[#d3ceef] text-[#5f5c78]',
      tag: 'Hôm nay'
    },
    {
      label: 'Yêu cầu đang chờ',
      value: pendingSwaps !== null ? pendingSwaps.toString() : '—',
      trend: 'Đổi ca / nhượng ca',
      icon: AlertTriangle,
      color: 'bg-[#fe8983]/20 text-[#9f403d]',
      tag: 'Cảnh báo'
    },
    {
      label: 'Ca trống tháng này',
      value: shifts.filter(s => s.backendData?.is_open).length.toString(),
      trend: 'Chưa có người nhận',
      icon: Wallet,
      color: 'bg-[#e2e2e9] text-[#3e3f45]',
      tag: 'Lịch trình'
    },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 sm:p-6 lg:p-8 pb-4"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={cn("p-2 rounded-lg", stat.color)}>
                <stat.icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold text-slate-400 tracking-widest uppercase">{stat.tag}</span>
            </div>
            <h3 className="text-slate-500 text-base font-medium">{stat.label}</h3>
            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{stat.value}</p>
            <div className="mt-4 flex items-center gap-1 text-sm font-semibold">
              {stat.label === 'Tổng nhân viên' ? (
                <div className="flex items-center gap-1 text-green-600">
                  <TrendingUp className="h-3 w-3" />
                  <span>{stat.trend}</span>
                </div>
              ) : (
                <span className="text-slate-400">{stat.trend}</span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

    </motion.div>
  );
}

function EmployeeDashboard({ user }: { shifts: any[], user: any }) {
  const navigate = useNavigate();
  const [activeAttendance, setActiveAttendance] = useState<any>(null);
  const [completedShifts, setCompletedShifts] = useState<number>(0);
  const [totalRegistered, setTotalRegistered] = useState<number>(0);
  const [upcomingShifts, setUpcomingShifts] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    const from = `${year}-${month}-01`;
    const to = `${year}-${month}-${lastDay}`;
    const todayStr = now.toISOString().split('T')[0];

    api.get(`/attendance/records/me/?from=${from}&to=${to}`).then(r => {
      const records: any[] = r.data;
      const ongoing = records.find((rec: any) => rec.checkin_at && !rec.checkout_at);
      setActiveAttendance(ongoing ?? null);
      setCompletedShifts(records.filter((rec: any) => rec.checkin_at && rec.checkout_at).length);
    }).catch(() => {});

    api.get(`/shifts/my-shifts/?from=${todayStr}`).then(r => {
      const myShifts: any[] = r.data;
      setTotalRegistered(myShifts.length);
      const todayShifts = myShifts
        .filter((s: any) => s.date === todayStr)
        .map((s: any) => ({
          id: s.id,
          name: s.store_address || s.store_name || 'Hệ thống',
          time: `${s.start_time?.substring(0, 5)} - ${s.end_time?.substring(0, 5)}`,
          date: s.date,
          type: s.is_emergency ? 'error' : 'tertiary',
        }));
      setUpcomingShifts(todayShifts);
    }).catch(() => {});
  }, [user]);

  const handleCheckOut = async () => {
    if (!activeAttendance) return;
    const shiftEnd = activeAttendance.shift_end
      ? new Date(`1970-01-01T${activeAttendance.shift_end}`)
      : null;
    const now = new Date();
    const nowTime = new Date(`1970-01-01T${now.toTimeString().slice(0, 8)}`);
    const minutesLeft = shiftEnd ? Math.round((shiftEnd.getTime() - nowTime.getTime()) / 60000) : 0;
    const msg = minutesLeft > 0
      ? `Ca làm vẫn còn ${minutesLeft} phút nữa mới kết thúc. Bạn có chắc chắn muốn checkout sớm?`
      : 'Bạn có chắc chắn muốn kết thúc ca làm việc này?';
    const ok = await toast.confirm(msg, 'Kết thúc ca');
    if (!ok) return;
    try {
      await api.post('/attendance/records/checkout/', { shift_id: activeAttendance.shift });
      setActiveAttendance(null);
    } catch {
      // axios interceptor đã tự toast lỗi từ backend
    }
  };

  const stats = [
    {
      label: 'Ca làm hôm nay',
      value: upcomingShifts.length.toString(),
      trend: 'Ngày hôm nay',
      icon: Clock,
      color: 'bg-[#d8e2ff] text-[#005ac2]',
      tag: 'Hôm nay'
    },
    {
      label: 'Ca đã hoàn thành',
      value: completedShifts.toString(),
      trend: 'Tính đến hôm nay',
      icon: History,
      color: 'bg-[#d3ceef] text-[#5f5c78]',
      tag: 'Tháng này'
    },
    {
      label: 'Tổng ca đã đăng ký',
      value: totalRegistered.toString(),
      trend: 'Ca được xác nhận',
      icon: Wallet,
      color: 'bg-[#e2e2e9] text-[#3e3f45]',
      tag: 'Tháng này'
    },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 pb-12"
    >
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Chào mừng trở lại, {user?.full_name || 'Nhân viên'}!</h1>
        <p className="text-slate-500 font-medium mt-1">Chúc bạn một ngày làm việc hiệu quả.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={cn("p-2 rounded-lg", stat.color)}>
                <stat.icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold text-slate-400 tracking-widest uppercase">{stat.tag}</span>
            </div>
            <h3 className="text-slate-500 text-base font-medium">{stat.label}</h3>
            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{stat.value}</p>
            <div className="mt-4 flex items-center gap-1 text-sm font-semibold">
              <span className="text-slate-400">{stat.trend}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 space-y-8">
          {/* Upcoming Shifts */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Ca làm hôm nay</h2>
              <button 
                onClick={() => navigate('/calendar')}
                className="text-[#005ac2] text-xs font-semibold hover:underline"
              >
                Xem toàn bộ lịch
              </button>
            </div>
            
            <div className="space-y-4">
              {upcomingShifts.length > 0 ? (
                upcomingShifts.map((shift) => (
                  <div key={shift.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4 mb-4 md:mb-0">
                      <div className={cn(
                        "p-3 rounded-xl border flex flex-col items-center justify-center min-w-[70px]",
                        shift.type === 'primary' ? "bg-[#d8e2ff]/40 border-[#005ac2]/20 text-[#005ac2]" : 
                        shift.type === 'tertiary' ? "bg-[#d3ceef]/30 border-[#5f5c78]/20 text-[#5f5c78]" : "bg-[#fe8983]/20 border-[#9f403d]/20 text-[#9f403d]"
                      )}>
                        <span className="text-sm font-black">{new Date(shift.date).getDate()}</span>
                        <span className="text-xs uppercase font-bold tracking-widest">Tháng {new Date(shift.date).getMonth() + 1}</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{shift.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="h-3 w-3 text-slate-400" />
                          <span className="text-xs font-medium text-slate-500">{shift.time}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Bed className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm font-medium">Bạn không có ca làm nào sắp tới.</p>
                  <button 
                    onClick={() => navigate('/calendar')}
                    className="mt-4 px-6 py-2 bg-[#005ac2] text-white font-bold rounded-lg text-sm hover:bg-[#004fab] transition-colors"
                  >
                    Đăng ký ca ngay
                  </button>
                </div>
              )}
            </div>
          </div>

        </section>

        <aside>
          <div className="bg-gradient-to-br from-[#005ac2] to-[#5f5c78] rounded-xl shadow-lg p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
            
            <h2 className="text-base font-bold uppercase tracking-widest text-[#d8e2ff] mb-6 relative z-10">Thao tác nhanh</h2>
            
            <div className="relative z-10 space-y-4">
              {activeAttendance ? (
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 mb-4">
                   <div className="flex items-center justify-between mb-2">
                     <span className="text-xs font-black uppercase tracking-widest text-blue-200">Đang thực hiện ca</span>
                     <Timer className="h-4 w-4 text-green-400 animate-pulse" />
                   </div>
                   <p className="text-lg font-black tracking-tight">Bắt đầu lúc: {new Date(activeAttendance.checkin_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              ) : (
                <button 
                  onClick={() => navigate('/qr-scanner')}
                  className="w-full bg-white text-[#005ac2] hover:bg-slate-50 font-black tracking-tight py-4 px-6 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  <BadgeCheck className="h-5 w-5" />
                  QUÉT QR Check-in
                </button>
              )}
              
              <button 
                onClick={handleCheckOut}
                disabled={!activeAttendance}
                className={cn(
                  "w-full font-black tracking-tight py-4 px-6 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-3",
                  activeAttendance 
                    ? "bg-red-500 text-white shadow-lg hover:bg-red-600" 
                    : "bg-white/10 border border-white/20 text-white/50 cursor-not-allowed"
                )}
              >
                <LogOut className="h-5 w-5" />
                Kết thúc ca (Check-out)
              </button>
            </div>
            
            <div className="mt-6 pt-4 border-t border-white/10 relative z-10">
              <p className="text-sm text-blue-200 font-medium">
                {activeAttendance 
                  ? "Bạn đã ghi nhận check-in. Đừng quên bấm kết thúc ca khi hoàn thành công việc."
                  : "Hãy nhớ truy cập mạng WiFi nội bộ của cửa hàng trước khi thực hiện Check-in / Check-out."}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </motion.div>
  );
}
