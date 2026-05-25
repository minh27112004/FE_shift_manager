import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart3,
  Clock,
  AlertTriangle,
  AlertCircle,
  Calendar,
  Building2,
  Users,
  Search,
  ArrowUpRight,
  Download,
  UserCheck,
  TrendingUp,
  FileSpreadsheet,
  ChevronDown,
  Info
} from 'lucide-react';
import api from '../lib/axios';
import { toast } from '../lib/toast';
import { cn } from '../lib/utils';

interface Store {
  id: number;
  name: string;
}

interface Employee {
  id: number;
  full_name: string;
  phone: string;
}

interface SummaryStats {
  total_shifts: number;
  total_worked_hours: number;
  late_count: number;
  early_checkout_count: number;
  absent_count: number;
  late_rate: number;
  early_checkout_rate: number;
  absent_rate: number;
}

interface DailyStat {
  date: string;
  worked_hours: number;
  late_count: number;
  early_checkout_count: number;
  absent_count: number;
}

interface EmployeeStat {
  id: number;
  full_name: string;
  phone: string;
  avatar_url?: string;
  total_shifts: number;
  total_worked_hours: number;
  late_count: number;
  early_checkout_count: number;
  absent_count: number;
}

interface ReportData {
  summary: SummaryStats;
  daily_stats: DailyStat[];
  employee_stats: EmployeeStat[];
}

export default function Reports() {
  const now = new Date();
  
  // Date Helpers
  const getStartOfMonth = (d: Date) => {
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  };
  const getTodayStr = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Filter States
  const [startDate, setStartDate] = useState(getStartOfMonth(now));
  const [endDate, setEndDate] = useState(getTodayStr());
  const [selectedStoreId, setSelectedStoreId] = useState<number | ''>('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | ''>('');
  const [preset, setPreset] = useState<string>('this-month');

  // Metadata States
  const [stores, setStores] = useState<Store[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Main stats data state
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<keyof EmployeeStat>('total_worked_hours');
  const [sortAsc, setSortAsc] = useState(false);
  const [chartType, setChartType] = useState<'hours' | 'violations'>('hours');

  // Fetch initial select filter metadata
  useEffect(() => {
    api.get('/stores/').then(r => setStores(r.data)).catch(() => {});
    api.get('/employees/').then(r => setEmployees(r.data)).catch(() => {});
  }, []);

  // Fetch report data when filters change
  const fetchReportData = async () => {
    setLoading(true);
    try {
      const params: any = {
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        store_id: selectedStoreId || undefined,
        user_id: selectedEmployeeId || undefined
      };
      const res = await api.get('/attendance/records/admin-stats/', { params });
      setData(res.data);
    } catch {
      toast.error('Không thể tải dữ liệu báo cáo thống kê');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [startDate, endDate, selectedStoreId, selectedEmployeeId]);

  // Handle Preset Ranges
  const handlePresetChange = (val: string) => {
    setPreset(val);
    const d = new Date();
    if (val === 'today') {
      const today = d.toISOString().split('T')[0];
      setStartDate(today);
      setEndDate(today);
    } else if (val === 'yesterday') {
      d.setDate(d.getDate() - 1);
      const yesterday = d.toISOString().split('T')[0];
      setStartDate(yesterday);
      setEndDate(yesterday);
    } else if (val === '7-days') {
      const today = d.toISOString().split('T')[0];
      d.setDate(d.getDate() - 6);
      const past = d.toISOString().split('T')[0];
      setStartDate(past);
      setEndDate(today);
    } else if (val === '30-days') {
      const today = d.toISOString().split('T')[0];
      d.setDate(d.getDate() - 29);
      const past = d.toISOString().split('T')[0];
      setStartDate(past);
      setEndDate(today);
    } else if (val === 'this-month') {
      const today = getTodayStr();
      const firstDay = getStartOfMonth(new Date());
      setStartDate(firstDay);
      setEndDate(today);
    } else if (val === 'last-month') {
      const firstOfLast = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      const lastOfLast = new Date(d.getFullYear(), d.getMonth(), 0);
      setStartDate(firstOfLast.toISOString().split('T')[0]);
      setEndDate(lastOfLast.toISOString().split('T')[0]);
    }
  };

  // Export CSV of employee stats
  const handleExportCSV = () => {
    if (!data || data.employee_stats.length === 0) return;
    try {
      const headers = ['Mã NV', 'Họ tên', 'Số điện thoại', 'Số ca làm', 'Tổng giờ làm', 'Đi muộn', 'Về sớm', 'Vắng mặt'];
      const rows = data.employee_stats.map(emp => [
        emp.id,
        `"${emp.full_name}"`,
        `'${emp.phone}`,
        emp.total_shifts,
        emp.total_worked_hours,
        emp.late_count,
        emp.early_checkout_count,
        emp.absent_count
      ]);
      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `bao_cao_cong_nhan_vien_${startDate}_to_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Đã xuất file báo cáo CSV thành công');
    } catch {
      toast.error('Xuất file báo cáo thất bại');
    }
  };

  // Filter and Sort Table
  const filteredEmployees = data?.employee_stats.filter(emp => 
    emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.phone.includes(searchQuery)
  ) || [];

  const handleSort = (field: keyof EmployeeStat) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];
    if (typeof valA === 'string') {
      valA = valA.toLowerCase();
      valB = (valB as string).toLowerCase();
    }
    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  // Render SVG Chart helpers
  const renderSVGChart = () => {
    if (!data || data.daily_stats.length === 0) return null;
    const daily = data.daily_stats;
    const width = 600;
    const height = 240;
    const paddingLeft = 45;
    const paddingRight = 20;
    const paddingTop = 25;
    const paddingBottom = 40;
    
    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    if (chartType === 'hours') {
      // Worked Hours Area Chart
      const maxHours = Math.max(...daily.map(d => d.worked_hours), 5);
      const points = daily.map((d, i) => {
        const x = paddingLeft + (i / Math.max(daily.length - 1, 1)) * chartWidth;
        const y = paddingTop + chartHeight - (d.worked_hours / maxHours) * chartHeight;
        return { x, y, value: d.worked_hours, date: d.date };
      });

      const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
      const areaPath = points.length > 0 
        ? `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`
        : '';

      // Date labels on X-axis (limit to max 7 labels to avoid clutter)
      const labelInterval = Math.max(1, Math.floor(daily.length / 6));

      return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#005ac2" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#005ac2" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = paddingTop + ratio * chartHeight;
            const value = (maxHours * (1 - ratio)).toFixed(1);
            return (
              <g key={ratio} className="opacity-40">
                <line 
                  x1={paddingLeft} 
                  y1={y} 
                  x2={width - paddingRight} 
                  y2={y} 
                  stroke="#e2e8f0" 
                  strokeWidth="1" 
                  strokeDasharray="4 4" 
                />
                <text 
                  x={paddingLeft - 10} 
                  y={y + 4} 
                  textAnchor="end" 
                  className="text-[10px] font-bold fill-slate-400"
                >
                  {value}h
                </text>
              </g>
            );
          })}

          {/* Area under the line */}
          {areaPath && (
            <path d={areaPath} fill="url(#chartGrad)" />
          )}

          {/* Line */}
          {linePath && (
            <path 
              d={linePath} 
              fill="none" 
              stroke="#005ac2" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
          )}

          {/* Points & Tooltips on hover */}
          {points.map((p, i) => (
            <g key={i} className="group cursor-pointer">
              <circle 
                cx={p.x} 
                cy={p.y} 
                r="3" 
                fill="#ffffff" 
                stroke="#005ac2" 
                strokeWidth="2" 
                className="transition-transform group-hover:scale-150"
              />
              <circle 
                cx={p.x} 
                cy={p.y} 
                r="10" 
                fill="transparent" 
              />
              {/* Simple inline tooltip on hover */}
              <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <rect 
                  x={Math.max(10, p.x - 50)} 
                  y={p.y - 36} 
                  width="100" 
                  height="26" 
                  rx="6" 
                  fill="#1e293b" 
                  className="shadow-md"
                />
                <text 
                  x={Math.max(10, p.x - 50) + 50} 
                  y={p.y - 19} 
                  textAnchor="middle" 
                  fill="#ffffff" 
                  className="text-[9px] font-black"
                >
                  {new Date(p.date).toLocaleDateString('vi-VN', {day: 'numeric', month: 'numeric'})}: {p.value}h
                </text>
              </g>
            </g>
          ))}

          {/* X Axis Date labels */}
          {daily.map((d, i) => {
            if (i % labelInterval !== 0 && i !== daily.length - 1) return null;
            const x = paddingLeft + (i / Math.max(daily.length - 1, 1)) * chartWidth;
            const dateObj = new Date(d.date);
            return (
              <text 
                key={i} 
                x={x} 
                y={height - paddingBottom + 18} 
                textAnchor="middle" 
                className="text-[9px] font-bold fill-slate-400"
              >
                {dateObj.getDate()}/{dateObj.getMonth() + 1}
              </text>
            );
          })}
        </svg>
      );
    } else {
      // Violations Stacked/Grouped Bar Chart
      const maxViolations = Math.max(...daily.map(d => d.late_count + d.early_checkout_count + d.absent_count), 2);
      
      const barWidth = Math.max(2, Math.min(15, chartWidth / daily.length - 4));
      const spacing = chartWidth / daily.length;
      
      // Filter X labels limit
      const labelInterval = Math.max(1, Math.floor(daily.length / 8));

      return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = paddingTop + ratio * chartHeight;
            const value = Math.round(maxViolations * (1 - ratio));
            return (
              <g key={ratio} className="opacity-40">
                <line 
                  x1={paddingLeft} 
                  y1={y} 
                  x2={width - paddingRight} 
                  y2={y} 
                  stroke="#e2e8f0" 
                  strokeWidth="1" 
                  strokeDasharray="4 4" 
                />
                <text 
                  x={paddingLeft - 10} 
                  y={y + 4} 
                  textAnchor="end" 
                  className="text-[10px] font-bold fill-slate-400"
                >
                  {value}
                </text>
              </g>
            );
          })}

          {/* Bar elements */}
          {daily.map((d, i) => {
            const x = paddingLeft + (i * spacing) + (spacing - barWidth) / 2;
            
            // Heights
            const hLate = (d.late_count / maxViolations) * chartHeight;
            const hEarly = (d.early_checkout_count / maxViolations) * chartHeight;
            const hAbsent = (d.absent_count / maxViolations) * chartHeight;

            // Stack calculations
            const yAbsent = paddingTop + chartHeight - hAbsent;
            const yEarly = yAbsent - hEarly;
            const yLate = yEarly - hLate;

            return (
              <g key={i} className="group cursor-pointer">
                {/* Absent Bar (Dark Red) */}
                {d.absent_count > 0 && (
                  <rect 
                    x={x} 
                    y={yAbsent} 
                    width={barWidth} 
                    height={hAbsent} 
                    fill="#9f403d" 
                    rx={d.early_checkout_count === 0 && d.late_count === 0 ? 3 : 0}
                  />
                )}
                {/* Early Checkout Bar (Orange) */}
                {d.early_checkout_count > 0 && (
                  <rect 
                    x={x} 
                    y={yEarly} 
                    width={barWidth} 
                    height={hEarly} 
                    fill="#e07a5f" 
                    rx={d.late_count === 0 && d.absent_count === 0 ? 3 : 0}
                  />
                )}
                {/* Late Bar (Amber) */}
                {d.late_count > 0 && (
                  <rect 
                    x={x} 
                    y={yLate} 
                    width={barWidth} 
                    height={hLate} 
                    fill="#d97706" 
                    rx={3}
                  />
                )}

                {/* Cover for tooltip hover */}
                <rect 
                  x={x - 2} 
                  y={paddingTop} 
                  width={barWidth + 4} 
                  height={chartHeight} 
                  fill="transparent" 
                />

                {/* Tooltip */}
                <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <rect 
                    x={Math.max(10, x - 65)} 
                    y={Math.min(yLate - 45, chartHeight - 10)} 
                    width="130" 
                    height="42" 
                    rx="6" 
                    fill="#1e293b" 
                    className="shadow-md"
                  />
                  <text 
                    x={Math.max(10, x - 65) + 65} 
                    y={Math.min(yLate - 45, chartHeight - 10) + 14} 
                    textAnchor="middle" 
                    fill="#ffffff" 
                    className="text-[9px] font-black"
                  >
                    {new Date(d.date).toLocaleDateString('vi-VN', {day: 'numeric', month: 'numeric'})}
                  </text>
                  <text 
                    x={Math.max(10, x - 65) + 65} 
                    y={Math.min(yLate - 45, chartHeight - 10) + 26} 
                    textAnchor="middle" 
                    fill="#94a3b8" 
                    className="text-[8px] font-semibold"
                  >
                    Muộn: {d.late_count} | Sớm: {d.early_checkout_count} | Vắng: {d.absent_count}
                  </text>
                </g>
              </g>
            );
          })}

          {/* X Axis labels */}
          {daily.map((d, i) => {
            if (i % labelInterval !== 0 && i !== daily.length - 1) return null;
            const x = paddingLeft + (i * spacing) + spacing / 2;
            const dateObj = new Date(d.date);
            return (
              <text 
                key={i} 
                x={x} 
                y={height - paddingBottom + 18} 
                textAnchor="middle" 
                className="text-[9px] font-bold fill-slate-400"
              >
                {dateObj.getDate()}/{dateObj.getMonth() + 1}
              </text>
            );
          })}
        </svg>
      );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 pb-12"
    >
      {/* Premium Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#005ac2] via-[#5f5c78] to-[#1e1b4b] p-6 sm:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-semibold uppercase tracking-wider text-blue-100">
            <BarChart3 className="h-3.5 w-3.5 text-blue-200" /> Phân Tích & Báo Cáo Công Việc
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Thống Kê Báo Cáo</h1>
          <p className="text-blue-100 text-sm max-w-xl font-medium">
            Phân tích số liệu chấm công, thời gian làm việc thực tế, tình trạng chuyên cần và vi phạm đi muộn/về sớm của nhân sự.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            disabled={!data || data.employee_stats.length === 0}
            className="flex items-center gap-2 px-5 py-3 bg-white text-[#005ac2] hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-all"
          >
            <FileSpreadsheet className="h-4.5 w-4.5" />
            Xuất Excel/CSV
          </button>
        </div>
      </div>

      {/* Filter Options */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-sm font-black text-slate-800 uppercase tracking-wider">
            <Calendar className="h-4 w-4 text-[#005ac2]" /> Bộ lọc thời gian & chi nhánh
          </div>
          {/* Presets */}
          <div className="flex flex-wrap gap-1">
            {[
              { id: 'today', label: 'Hôm nay' },
              { id: 'yesterday', label: 'Hôm qua' },
              { id: '7-days', label: '7 ngày qua' },
              { id: '30-days', label: '30 ngày qua' },
              { id: 'this-month', label: 'Tháng này' },
              { id: 'last-month', label: 'Tháng trước' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => handlePresetChange(p.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                  preset === p.id 
                    ? 'bg-[#005ac2] text-white shadow-sm' 
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Start Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Từ ngày</label>
            <input
              type="date"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setPreset(''); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#005ac2]/20 focus:outline-none"
            />
          </div>

          {/* End Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Đến ngày</label>
            <input
              type="date"
              value={endDate}
              onChange={e => { setEndDate(e.target.value); setPreset(''); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#005ac2]/20 focus:outline-none"
            />
          </div>

          {/* Store Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Cửa hàng/Chi nhánh</label>
            <div className="relative">
              <select
                value={selectedStoreId}
                onChange={e => setSelectedStoreId(e.target.value ? Number(e.target.value) : '')}
                className="w-full appearance-none px-3 py-2 pr-9 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#005ac2]/20 focus:outline-none cursor-pointer"
              >
                <option value="">Tất cả cửa hàng</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Employee Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Nhân viên cụ thể</label>
            <div className="relative">
              <select
                value={selectedEmployeeId}
                onChange={e => setSelectedEmployeeId(e.target.value ? Number(e.target.value) : '')}
                className="w-full appearance-none px-3 py-2 pr-9 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#005ac2]/20 focus:outline-none cursor-pointer"
              >
                <option value="">Tất cả nhân viên</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Main stats layout */}
      {loading ? (
        <div className="flex items-center justify-center py-32 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 border-4 border-[#005ac2] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-500 font-bold">Đang tổng hợp dữ liệu thống kê...</p>
          </div>
        </div>
      ) : !data ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-16 text-center text-slate-400 font-bold">
          Không có dữ liệu thống kê. Vui lòng chọn khoảng thời gian khác.
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            
            {/* Card 1: Work Hours */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-3">
                <div className="p-2 rounded-xl bg-blue-50 text-[#005ac2]">
                  <Clock className="h-5 w-5" />
                </div>
                <span className="text-xs font-black text-slate-400 tracking-wider uppercase">Giờ làm</span>
              </div>
              <div>
                <p className="text-slate-500 text-xs font-bold">Tổng giờ làm</p>
                <p className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">{data.summary.total_worked_hours}h</p>
                <span className="text-xs text-slate-400 font-medium">Trực ca: {data.summary.total_shifts} lần</span>
              </div>
            </div>

            {/* Card 2: Late count / rate */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-3">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <span className="text-xs font-black text-amber-500 tracking-wider uppercase">{data.summary.late_rate}%</span>
              </div>
              <div>
                <p className="text-slate-500 text-xs font-bold">Lượt đi muộn</p>
                <p className="text-2xl font-black text-amber-600 tracking-tight mt-0.5">{data.summary.late_count} lần</p>
                <span className="text-xs text-slate-400 font-medium">Trừ 5p du di</span>
              </div>
            </div>

            {/* Card 3: Early checkout count / rate */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-3">
                <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <span className="text-xs font-black text-orange-500 tracking-wider uppercase">{data.summary.early_checkout_rate}%</span>
              </div>
              <div>
                <p className="text-slate-500 text-xs font-bold">Lượt về sớm</p>
                <p className="text-2xl font-black text-orange-600 tracking-tight mt-0.5">{data.summary.early_checkout_count} lần</p>
                <span className="text-xs text-slate-400 font-medium">Checkout trước giờ</span>
              </div>
            </div>

            {/* Card 4: Absent count / rate */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-3">
                <div className="p-2 rounded-xl bg-red-50 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <span className="text-xs font-black text-red-500 tracking-wider uppercase">{data.summary.absent_rate}%</span>
              </div>
              <div>
                <p className="text-slate-500 text-xs font-bold">Lượt vắng mặt</p>
                <p className="text-2xl font-black text-red-600 tracking-tight mt-0.5">{data.summary.absent_count} lần</p>
                <span className="text-xs text-slate-400 font-medium">Có lịch nhưng không đi</span>
              </div>
            </div>

            {/* Card 5: Performance Grade */}
            <div className="bg-gradient-to-br from-[#005ac2]/10 to-indigo-50 border border-[#005ac2]/20 p-5 rounded-2xl shadow-inner flex flex-col justify-between col-span-2 md:col-span-1">
              <div className="flex justify-between items-start mb-3">
                <div className="p-2 rounded-xl bg-[#005ac2] text-white">
                  <UserCheck className="h-5 w-5" />
                </div>
                <span className="text-xs font-black text-[#005ac2] tracking-wider uppercase">Chuyên Cần</span>
              </div>
              <div>
                <p className="text-slate-600 text-xs font-bold">Chỉ số chuyên cần</p>
                <p className="text-2xl font-black text-[#005ac2] tracking-tight mt-0.5">
                  {Math.max(0, 100 - data.summary.late_rate - data.summary.absent_rate * 2).toFixed(0)}%
                </p>
                <span className="text-xs text-slate-500 font-medium">Tổng quan vi phạm</span>
              </div>
            </div>

          </div>

          {/* Analytics Chart Container */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="font-black text-slate-800 text-lg">Biểu đồ xu hướng</h3>
                <p className="text-slate-400 text-xs font-semibold">Theo dõi hoạt động theo dòng thời gian</p>
              </div>

              {/* Chart Selector Toggles */}
              <div className="flex bg-slate-100 p-1.5 rounded-xl self-start sm:self-auto">
                <button
                  onClick={() => setChartType('hours')}
                  className={cn(
                    'px-4 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5',
                    chartType === 'hours' ? 'bg-white text-[#005ac2] shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  )}
                >
                  <Clock className="h-3.5 w-3.5" /> Giờ làm việc
                </button>
                <button
                  onClick={() => setChartType('violations')}
                  className={cn(
                    'px-4 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5',
                    chartType === 'violations' ? 'bg-white text-red-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  )}
                >
                  <AlertCircle className="h-3.5 w-3.5" /> Lỗi vi phạm
                </button>
              </div>
            </div>

            {/* SVG Chart Wrapper */}
            <div className="relative h-64 md:h-80 w-full bg-slate-50/50 rounded-2xl border border-slate-100 p-4">
              {data.daily_stats.length > 0 ? (
                renderSVGChart()
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm font-semibold">
                  Không có dữ liệu hiển thị trên biểu đồ
                </div>
              )}
            </div>

            {/* Chart Legend */}
            {chartType === 'violations' && (
              <div className="flex items-center justify-center gap-6 mt-4 text-xs font-black">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-[#d97706]" />
                  <span className="text-slate-600">Đi muộn</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-[#e07a5f]" />
                  <span className="text-slate-600">Về sớm</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-[#9f403d]" />
                  <span className="text-slate-600">Vắng mặt</span>
                </div>
              </div>
            )}
          </div>

          {/* Detailed Employee Stats Table */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-slate-800 text-lg">Báo cáo chi tiết theo nhân sự</h3>
                <p className="text-slate-400 text-xs font-semibold">Thống kê giờ công và vi phạm từng nhân viên</p>
              </div>
              
              {/* Search in table */}
              <div className="relative max-w-xs w-full self-start sm:self-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm nhân viên..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#005ac2]/20 focus:border-[#005ac2]/40"
                />
              </div>
            </div>

            {/* Table wrapper */}
            {sortedEmployees.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-bold">
                Không tìm thấy nhân viên nào phù hợp
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-left">
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Nhân viên</th>
                      <th 
                        className="px-4 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right cursor-pointer hover:text-slate-800 select-none"
                        onClick={() => handleSort('total_shifts')}
                      >
                        Số ca làm {sortField === 'total_shifts' && (sortAsc ? '▲' : '▼')}
                      </th>
                      <th 
                        className="px-4 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right cursor-pointer hover:text-slate-800 select-none"
                        onClick={() => handleSort('total_worked_hours')}
                      >
                        Tổng giờ công {sortField === 'total_worked_hours' && (sortAsc ? '▲' : '▼')}
                      </th>
                      <th 
                        className="px-4 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right cursor-pointer hover:text-slate-800 select-none"
                        onClick={() => handleSort('late_count')}
                      >
                        Đi muộn (&gt;5p) {sortField === 'late_count' && (sortAsc ? '▲' : '▼')}
                      </th>
                      <th 
                        className="px-4 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right cursor-pointer hover:text-slate-800 select-none"
                        onClick={() => handleSort('early_checkout_count')}
                      >
                        Về sớm (&gt;5p) {sortField === 'early_checkout_count' && (sortAsc ? '▲' : '▼')}
                      </th>
                      <th 
                        className="px-4 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right cursor-pointer hover:text-slate-800 select-none"
                        onClick={() => handleSort('absent_count')}
                      >
                        Vắng mặt {sortField === 'absent_count' && (sortAsc ? '▲' : '▼')}
                      </th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Chuyên Cần</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {sortedEmployees.map((emp, idx) => {
                      const totalViolations = emp.late_count + emp.absent_count;
                      const attendanceScore = Math.max(0, 100 - (emp.total_shifts > 0 ? (totalViolations / emp.total_shifts) * 100 : 0));
                      
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                          {/* User info */}
                          <td className="px-6 py-4 flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-[#005ac2]/10 text-[#005ac2] font-black text-sm flex items-center justify-center shrink-0">
                              {emp.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800">{emp.full_name}</p>
                              <p className="text-xs text-slate-400">{emp.phone}</p>
                            </div>
                          </td>
                          {/* Shifts */}
                          <td className="px-4 py-4 text-right font-semibold text-slate-700">{emp.total_shifts}</td>
                          {/* Work hours */}
                          <td className="px-4 py-4 text-right font-bold text-slate-900">{emp.total_worked_hours}h</td>
                          {/* Late */}
                          <td className="px-4 py-4 text-right">
                            <span className={cn(
                              'font-bold',
                              emp.late_count > 0 ? 'text-amber-600' : 'text-slate-400'
                            )}>
                              {emp.late_count}
                            </span>
                          </td>
                          {/* Early checkout */}
                          <td className="px-4 py-4 text-right">
                            <span className={cn(
                              'font-bold',
                              emp.early_checkout_count > 0 ? 'text-orange-500' : 'text-slate-400'
                            )}>
                              {emp.early_checkout_count}
                            </span>
                          </td>
                          {/* Absent */}
                          <td className="px-4 py-4 text-right">
                            <span className={cn(
                              'font-bold',
                              emp.absent_count > 0 ? 'text-red-600 font-extrabold' : 'text-slate-400'
                            )}>
                              {emp.absent_count}
                            </span>
                          </td>
                          {/* Score Badge */}
                          <td className="px-6 py-4 text-center">
                            <span className={cn(
                              'px-2.5 py-1 rounded-full text-xs font-black border',
                              attendanceScore >= 90 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              attendanceScore >= 75 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-red-50 text-red-700 border-red-200'
                            )}>
                              {attendanceScore.toFixed(0)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="p-4 bg-slate-50 border-t border-slate-100 text-xs font-bold text-slate-400 flex items-center gap-1.5 justify-center">
              <Info className="h-3.5 w-3.5 text-[#005ac2]" />
              <span>Chỉ số Chuyên Cần = 100% - tỷ lệ phần trăm số ca vi phạm đi muộn & vắng mặt</span>
            </div>

          </div>

        </div>
      )}
    </motion.div>
  );
}
