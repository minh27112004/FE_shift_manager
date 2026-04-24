import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  BadgeCheck,
  Clock,
  AlertTriangle,
  Wallet,
  TrendingUp,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Plus,
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
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    api.get('/employees/').then(r => setEmployeeCount(r.data.length)).catch(() => {});
    api.get('/shifts/swap-requests/').then(r => {
      const pending = r.data.filter((s: any) => s.status === 'pending' || s.status === 'partner_accepted');
      setPendingSwaps(pending.length);
    }).catch(() => {});
    api.get('/notifications/').then(r => setRecentActivity(r.data.slice(0, 4))).catch(() => {});
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

  // Build current week days dynamically
  const getWeekDays = () => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
    const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];
    return dayNames.map((name, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return { name, date: d.toISOString().split('T')[0] };
    });
  };
  const weekDays = getWeekDays();
  const weekStart = new Date(weekDays[0].date);
  const weekEnd = new Date(weekDays[6].date);
  const weekLabel = `${weekStart.getDate()} tháng ${weekStart.getMonth() + 1} — ${weekEnd.getDate()} tháng ${weekEnd.getMonth() + 1}, ${weekEnd.getFullYear()}`;

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

      <div className="flex flex-col xl:flex-row gap-6 xl:gap-8 items-start">
        <section className="w-full xl:flex-1 min-w-0">
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900">Lịch làm việc hàng tuần</h2>
                <p className="text-sm sm:text-base text-slate-500">{weekLabel}</p>
              </div>
              <div className="flex gap-2">
                <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button className="px-3 py-1.5 bg-slate-100 text-slate-900 rounded-lg text-sm font-semibold hover:bg-slate-200">Hôm nay</button>
              </div>
            </div>

            {/* Scrollable on mobile */}
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <div className="min-w-[560px]">
                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map((day, i) => (
                    <div key={day.name} className="text-center pb-3 border-b border-slate-100">
                      <span className={cn(
                        "block text-xs font-black uppercase tracking-widest mb-1",
                        i === 2 ? "text-[#005ac2]" : "text-slate-400"
                      )}>{day.name}</span>
                      <span className={cn(
                        "text-lg font-extrabold",
                        i === 2 ? "text-[#005ac2]" : "text-slate-900"
                      )}>{day.date.split('-')[2]}</span>
                    </div>
                  ))}

                  {weekDays.map((day) => {
                    const dayShifts = shifts.filter(s => s.date === day.date);
                    return (
                      <div key={day.date} className="space-y-2 pt-3">
                        {dayShifts.length > 0 ? (
                          dayShifts.map((shift) => (
                            <div key={shift.id} className={cn(
                              "p-2 rounded-lg border-l-4",
                              shift.type === 'primary' ? "bg-[#d8e2ff]/40 border-[#005ac2]" :
                              shift.type === 'tertiary' ? "bg-[#d3ceef]/30 border-[#5f5c78]" : "bg-[#fe8983]/20 border-[#9f403d]"
                            )}>
                              <p className={cn(
                                "text-sm font-bold uppercase",
                                shift.type === 'primary' ? "text-[#005ac2]" :
                                shift.type === 'tertiary' ? "text-[#5f5c78]" : "text-[#9f403d]"
                              )}>{shift.time.split(' ')[0]}</p>
                              <p className="text-sm font-semibold mt-0.5 truncate">{shift.name}</p>
                            </div>
                          ))
                        ) : (
                          <div className="p-2 bg-slate-50 rounded-lg text-center py-6">
                            <Bed className="h-4 w-4 mx-auto text-slate-200" />
                          </div>
                        )}
                        <div className="p-2 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center opacity-40 hover:opacity-100 cursor-pointer transition-opacity">
                          <Plus className="h-3 w-3" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="w-full xl:w-80 xl:shrink-0">
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-extrabold tracking-tight text-slate-900 uppercase">Hoạt động gần đây</h2>
              <button className="text-[#005ac2] text-sm font-semibold hover:underline">Xem tất cả</button>
            </div>
            <div className="space-y-4">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">Chưa có hoạt động nào.</p>
              ) : recentActivity.map((notif: any, i: number) => (
                <div key={notif.id ?? i} className="flex gap-3 relative">
                  {i !== recentActivity.length - 1 && (
                    <div className="absolute left-[15px] top-8 bottom-0 w-[1px] bg-slate-100"></div>
                  )}
                  <div className="h-8 w-8 rounded-full bg-[#d8e2ff] text-[#005ac2] flex items-center justify-center shrink-0 z-10">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-slate-900">{notif.title}</p>
                    <p className="text-base text-slate-500 leading-relaxed">{notif.message}</p>
                    <p className="text-sm text-slate-400 mt-1">{new Date(notif.created_at).toLocaleString('vi-VN')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* FAB — hidden on mobile (overlaps bottom nav) */}
      <button className="hidden lg:flex fixed bottom-8 right-8 h-14 w-14 bg-[#005ac2] text-white rounded-full shadow-2xl items-center justify-center hover:scale-110 active:scale-95 transition-transform z-40">
        <Plus className="h-6 w-6" />
      </button>
    </motion.div>
  );
}

function EmployeeDashboard({ shifts, user }: { shifts: any[], user: any }) {
  const navigate = useNavigate();
  const [activeAttendance, setActiveAttendance] = useState<any>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(true);

  // Fetch current attendance status and history
  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const response = await api.get('/attendance/records/me/');
        const records = response.data;
        // Backend returns records, find the one without check_out
        const ongoing = records.find((r: any) => !r.check_out);
        setActiveAttendance(ongoing);
        setAttendanceHistory(records.slice(0, 5)); // Keep last 5 records
      } catch (error) {
        console.error('Failed to fetch attendance:', error);
      } finally {
        setLoadingAttendance(false);
      }
    };
    if (user) fetchAttendance();
  }, [user]);

  const handleCheckOut = async () => {
    if (!activeAttendance) return;
    try {
      if (window.confirm('Bạn có chắc chắn muốn kết thúc ca làm việc này?')) {
        await api.post('/attendance/records/checkout/', {
          shift_id: activeAttendance.shift
        });
        setActiveAttendance(null);
        // Refresh history
        const response = await api.get('/attendance/records/me/');
        setAttendanceHistory(response.data.slice(0, 5));
        alert('Đã kết thúc ca làm việc thành công!');
      }
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Lỗi khi check-out');
    }
  };

  // Filter shifts specifically for this employee
  const myShifts = shifts.filter(s =>
    s.backendData?.assignments?.some((a: any) => String(a.user ?? a.user_id) === String(user?.id))
  );

  const upcomingShifts = myShifts.filter(s => new Date(s.date) >= new Date()).slice(0, 3);

  // Calculate total hours from history (simplified)
  const totalHours = attendanceHistory.reduce((acc, curr) => {
    if (curr.check_in && curr.check_out) {
      const duration = (new Date(curr.check_out).getTime() - new Date(curr.check_in).getTime()) / (1000 * 60 * 60);
      return acc + duration;
    }
    return acc;
  }, 0).toFixed(1);
  
  const stats = [
    { 
      label: 'Ca làm sắp tới', 
      value: upcomingShifts.length.toString(), 
      trend: 'Trong tuần này', 
      icon: Clock, 
      color: 'bg-[#d8e2ff] text-[#005ac2]',
      tag: 'Cá nhân'
    },
    { 
      label: 'Số giờ đã làm', 
      value: totalHours, 
      trend: 'Tính từ các ca gần nhất', 
      icon: History, 
      color: 'bg-[#d3ceef] text-[#5f5c78]',
      tag: 'Tháng này'
    },
    {
      label: 'Ca đã hoàn thành',
      value: attendanceHistory.filter((r: any) => r.check_out).length.toString(),
      trend: 'Từ lịch sử điểm danh',
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
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Ca làm sắp diễn ra</h2>
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

          {/* History / Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Hoạt động điểm danh gần đây</h2>
            </div>
            <div className="space-y-4">
              {attendanceHistory.length > 0 ? (
                attendanceHistory.map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-full", record.check_out ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600")}>
                        {record.check_out ? <CheckCircle2 className="h-4 w-4" /> : <Timer className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-base font-bold text-slate-900">
                          {record.check_out ? 'Đã hoàn thành ca' : 'Đang làm việc'}
                        </p>
                        <p className="text-sm text-slate-500">
                          {new Date(record.check_in).toLocaleDateString()} · {new Date(record.check_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          {record.check_out && ` - ${new Date(record.check_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
                        </p>
                      </div>
                    </div>
                    {record.check_out && (
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                        {((new Date(record.check_out).getTime() - new Date(record.check_in).getTime()) / (1000 * 60 * 60)).toFixed(1)} giờ
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-center py-4 text-slate-400 text-sm font-medium">Chưa có lịch sử điểm danh.</p>
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
                   <p className="text-lg font-black tracking-tight">Bắt đầu lúc: {new Date(activeAttendance.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
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
