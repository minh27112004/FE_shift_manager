import { useState } from 'react';
import { motion } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Info,
  Bot,
  ArrowRight,
  BarChart3,
  Loader2,
  CalendarCheck
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useShifts } from '../context/ShiftContext';
import { useAuth } from '../context/AuthContext';

function buildCalendarDays(year: number, month: number) {
  // month: 0-indexed (0 = Jan)
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  // Adjust so Monday = 0
  const startOffset = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const cells: { day: number; date: string; prevMonth?: boolean; nextMonth?: boolean; today?: boolean }[] = [];

  // Previous month padding
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

  // Next month padding to complete grid (multiples of 7)
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

export default function CalendarPage() {
  const { shifts, isLoading } = useShifts();
  const { user } = useAuth();
  const role = user?.role || 'employee';

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0-indexed

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

  // For employees: only show their assigned shifts
  const displayShifts = role === 'employee'
    ? shifts.filter(s => s.backendData?.assignments?.some(
        (a: any) => a.user_id === user?.id || a.user?.id === user?.id
      ))
    : shifts;

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
            <button className="bg-[#005ac2] text-white px-6 py-2.5 rounded-xl font-bold shadow-md hover:bg-[#004fab] active:scale-95 transition-all flex items-center gap-2">
              <PlusCircle className="h-5 w-5" />
              Tạo ca làm
            </button>
          )}
        </div>
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-[#005ac2] animate-spin" />
        </div>
      )}

      {/* Calendar Grid */}
      {!isLoading && (
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
                        className={cn(
                          "px-2 py-1 rounded-md text-[11px] font-bold border-l-4",
                          shift.type === 'primary' && "bg-[#d8e2ff]/40 text-[#004eaa] border-[#005ac2]",
                          shift.type === 'tertiary' && "bg-[#d3ceef]/50 text-[#47445f] border-[#5f5c78]",
                          shift.type === 'error' && "bg-[#fe8983]/30 text-[#752121] border-[#9f403d]",
                          role === 'employee' && "ring-2 ring-[#005ac2] ring-offset-1"
                        )}
                      >
                        <div className="truncate">{shift.label}</div>
                        <div className="text-[9px] opacity-70">{shift.time}</div>
                        {role === 'employee' && (
                          <span className="flex items-center gap-0.5 text-[9px] font-black text-[#005ac2] mt-0.5">
                            <CalendarCheck className="h-2.5 w-2.5" /> Của tôi
                          </span>
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

      {/* Legend & Insights */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <p className="text-[11px] text-slate-400 mt-3">
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
                <p className="text-[11px] text-slate-400 mt-3">
                  {shifts.filter(s => s.backendData?.is_open).length} ca còn trống trong tháng
                </p>
              </>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#005ac2]/10 to-[#5f5c78]/10 p-6 rounded-xl shadow-sm border border-[#005ac2]/20 relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-sm font-black text-[#005ac2] mb-2 flex items-center gap-2">
              <Bot className="h-4 w-4" />
              GỢI Ý AI
            </h3>
            <p className="text-xs font-medium text-slate-600 leading-relaxed">
              Thứ Năm thường có tỷ lệ nghỉ việc cao hơn 20%. Hãy cân nhắc sắp xếp dư 1 người cho ca đêm.
            </p>
            <button className="mt-4 text-xs font-bold text-[#005ac2] flex items-center gap-1 hover:underline">
              Áp dụng đề xuất
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <BarChart3 className="absolute -right-4 -bottom-4 h-24 w-24 text-[#005ac2] opacity-10" />
        </div>
      </div>
    </motion.div>
  );
}
