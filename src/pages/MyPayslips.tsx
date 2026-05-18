import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CreditCard,
  Calendar,
  Building2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  FileText,
  CheckCircle2,
  Wallet,
  Landmark,
  Loader2,
  ChevronRight,
  AlertCircle,
  Receipt,
  Download,
} from 'lucide-react';
import api from '../lib/axios';
import { toast } from '../lib/toast';

interface PayslipDetail {
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
  late_count: number;
  early_leave_count: number;
  missing_checkout_count: number;
}


const fmt = (val: string | number) =>
  Number(val).toLocaleString('vi-VN') + ' đ';

export default function MyPayslips() {
  const [payslips, setPayslips] = useState<PayslipDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipDetail | null>(null);

  useEffect(() => {
    fetchPayslips();
  }, []);

  const fetchPayslips = async () => {
    setLoading(true);
    try {
      const res = await api.get('/payroll/my-payslips/');
      setPayslips(res.data);
      if (res.data.length > 0) {
        setSelectedPayslip(res.data[0]);
      }
    } catch {
      toast.error('Không tải được danh sách phiếu lương.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#005ac2] via-[#00479b] to-[#00306a] p-6 sm:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-semibold uppercase tracking-wider text-blue-100">
            <Receipt className="h-3.5 w-3.5" /> Thu nhập & Tiền lương
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Phiếu lương của tôi</h1>
          <p className="text-blue-100 text-sm max-w-xl font-medium">
            Theo dõi chi tiết các kỳ lương đã chốt và đã thanh toán. Toàn bộ số liệu công và thưởng phạt được minh bạch hóa.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 self-start md:self-auto">
          <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center text-white font-black text-xl">
            ₫
          </div>
          <div>
            <p className="text-xs text-blue-200 font-bold uppercase tracking-wider">Tổng thu nhập năm nay</p>
            <p className="text-2xl font-black text-white">
              {fmt(payslips.reduce((acc, p) => acc + Number(p.net_amount), 0))}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: List of payslips */}
        <div className="lg:col-span-5 space-y-4">
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#005ac2]" />
            Lịch sử kỳ lương ({payslips.length})
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
              <Loader2 className="h-8 w-8 text-[#005ac2] animate-spin" />
            </div>
          ) : payslips.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-12 text-center space-y-3">
              <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <Receipt className="h-8 w-8" />
              </div>
              <p className="font-bold text-slate-700 text-base">Chưa có phiếu lương nào</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Hệ thống sẽ hiển thị phiếu lương ngay khi quản lý chốt bảng lương hàng tháng của cửa hàng.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {payslips.map((p) => {
                const isSelected = selectedPayslip?.id === p.id;
                const isPaid = p.status_display === 'Đã thanh toán';

                return (
                  <motion.div
                    key={p.id}
                    onClick={() => setSelectedPayslip(p)}
                    className={`group p-5 rounded-2xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-white border-[#005ac2] shadow-md ring-2 ring-[#005ac2]/10'
                        : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black ${
                          isSelected ? 'bg-[#005ac2] text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-[#005ac2]'
                        } transition-colors`}>
                          T{p.month}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-base">Tháng {p.month}/{p.year}</h3>
                          <p className="text-xs font-medium text-slate-500 flex items-center gap-1 mt-0.5">
                            <Building2 className="h-3 w-3" /> {p.store_name}
                          </p>
                        </div>
                      </div>

                      <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                        isPaid
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          : 'bg-blue-50 text-blue-700 border border-blue-200/60'
                      }`}>
                        {isPaid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                        {p.status_display}
                      </span>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-sm">
                      <span className="text-slate-500 text-xs font-medium">Thực lĩnh:</span>
                      <span className={`font-black text-base ${isSelected ? 'text-[#005ac2]' : 'text-slate-800'}`}>
                        {fmt(p.net_amount)}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column: Selected payslip details */}
        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {selectedPayslip ? (
              <motion.div
                key={selectedPayslip.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-3xl border border-slate-100 shadow-xl p-6 sm:p-8 space-y-8 relative overflow-hidden"
              >
                {/* Ribbon status */}
                <div className={`absolute top-0 right-0 px-6 py-2 rounded-bl-2xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm ${
                  selectedPayslip.status_display === 'Đã thanh toán'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-blue-500 text-white'
                }`}>
                  {selectedPayslip.status_display === 'Đã thanh toán' ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Clock className="h-4 w-4" />
                  )}
                  {selectedPayslip.status_display}
                </div>

                <div className="space-y-1 pr-32">
                  <span className="text-xs font-black text-[#005ac2] uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-full">
                    Phiếu thanh toán lương
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 pt-2">
                    Kỳ lương Tháng {selectedPayslip.month}/{selectedPayslip.year}
                  </h2>
                  <p className="text-slate-500 text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-400" /> Nơi làm việc: <strong className="text-slate-700">{selectedPayslip.store_name}</strong>
                  </p>
                </div>

                {/* Net Summary Box */}
                <div className="bg-gradient-to-br from-blue-500/5 via-blue-500/10 to-[#005ac2]/10 border border-[#005ac2]/20 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-[#005ac2]">Tổng thu nhập thực lĩnh</p>
                    <p className="text-3xl sm:text-4xl font-black text-[#005ac2] mt-1">{fmt(selectedPayslip.net_amount)}</p>
                  </div>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl font-bold text-sm shadow-sm hover:shadow active:scale-95 transition-all"
                  >
                    <Download className="h-4 w-4 text-[#005ac2]" />
                    In phiếu lương
                  </button>
                </div>

                {/* Work Summary Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase">Số ca làm việc</p>
                    <p className="text-xl font-black text-slate-800 mt-1">{selectedPayslip.total_shifts} ca</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase">Tổng số giờ</p>
                    <p className="text-xl font-black text-slate-800 mt-1">{Number(selectedPayslip.total_hours).toFixed(2)} giờ</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 col-span-2 sm:col-span-1">
                    <p className="text-xs font-bold text-slate-400 uppercase">Lương cơ bản/giờ</p>
                    <p className="text-xl font-black text-[#005ac2] mt-1">{fmt(selectedPayslip.hourly_rate)}</p>
                  </div>
                </div>

                {/* Attendance Violations Note */}
                <div className="bg-slate-50/80 rounded-2xl border border-slate-100 p-5 space-y-3">
                  <h4 className="font-black text-slate-800 text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-600" />
                    Thống kê chuyên cần & điểm danh trong kỳ
                  </h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/80">
                      <span className="text-amber-800 text-xs font-bold block">Đi làm muộn</span>
                      <strong className="text-amber-900 text-lg font-black block mt-1">
                        {selectedPayslip.late_count || 0} lần
                      </strong>
                    </div>
                    <div className="bg-orange-50/60 p-3 rounded-xl border border-orange-200/80">
                      <span className="text-orange-800 text-xs font-bold block">Về sớm</span>
                      <strong className="text-orange-900 text-lg font-black block mt-1">
                        {selectedPayslip.early_leave_count || 0} lần
                      </strong>
                    </div>
                    <div className="bg-red-50/60 p-3 rounded-xl border border-red-200/80">
                      <span className="text-red-800 text-xs font-bold block">Quên check-out</span>
                      <strong className="text-red-900 text-lg font-black block mt-1">
                        {selectedPayslip.missing_checkout_count || 0} lần
                      </strong>
                    </div>
                  </div>
                  {(selectedPayslip.late_count > 0 || selectedPayslip.early_leave_count > 0 || selectedPayslip.missing_checkout_count > 0) ? (
                    <p className="text-xs text-red-600 font-medium flex items-center gap-1.5 pt-2 border-t border-slate-200/60">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" /> Vi phạm chuyên cần có thể ảnh hưởng đến các khoản thưởng/khấu trừ trong phiếu lương của bạn.
                    </p>
                  ) : (
                    <p className="text-xs text-emerald-600 font-medium flex items-center gap-1.5 pt-2 border-t border-slate-200/60">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Tuyệt vời! Bạn không có vi phạm chuyên cần nào trong kỳ lương này.
                    </p>
                  )}
                </div>


                {/* Detailed Breakdown */}
                <div className="space-y-4">
                  <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-[#005ac2]" />
                    Chi tiết thu nhập & khấu trừ
                  </h3>

                  <div className="border border-slate-100 rounded-2xl divide-y divide-slate-100 overflow-hidden">
                    <div className="p-4 flex items-center justify-between bg-slate-50/50">
                      <span className="text-slate-600 font-medium text-sm">Tổng lương chính (theo giờ):</span>
                      <span className="font-bold text-slate-800 text-base">{fmt(selectedPayslip.gross_amount)}</span>
                    </div>
                    
                    <div className="p-4 flex items-center justify-between bg-emerald-50/30">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                          <ArrowUpRight className="h-4 w-4" />
                        </div>
                        <span className="text-emerald-800 font-medium text-sm">Thưởng / Phụ cấp:</span>
                      </div>
                      <span className="font-bold text-emerald-600 text-base">+{fmt(selectedPayslip.bonus)}</span>
                    </div>

                    <div className="p-4 flex items-center justify-between bg-red-50/30">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                          <ArrowDownRight className="h-4 w-4" />
                        </div>
                        <span className="text-red-800 font-medium text-sm">Khấu trừ / Phạt:</span>
                      </div>
                      <span className="font-bold text-red-600 text-base">-{fmt(selectedPayslip.deduction)}</span>
                    </div>

                    <div className="p-4 flex items-center justify-between bg-blue-50/50 pt-5">
                      <span className="font-black text-slate-800 text-base">Tổng nhận (Thực lĩnh):</span>
                      <span className="font-black text-[#005ac2] text-xl">{fmt(selectedPayslip.net_amount)}</span>
                    </div>
                  </div>
                </div>

                {/* Note section */}
                {selectedPayslip.note && (
                  <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3">
                    <FileText className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Ghi chú từ quản lý:</p>
                      <p className="text-sm text-amber-900 mt-1 whitespace-pre-wrap">{selectedPayslip.note}</p>
                    </div>
                  </div>
                )}

                {/* Payment info */}
                <div className="bg-slate-50/80 rounded-2xl border border-slate-100 p-5 space-y-3">
                  <h4 className="font-black text-slate-800 text-sm flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-[#005ac2]" />
                    Thông tin thanh toán ngân hàng
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-400 text-xs block">Ngân hàng thụ hưởng:</span>
                      <strong className="text-slate-800 font-bold block mt-0.5">
                        {selectedPayslip.bank_name || 'Chưa cập nhật'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs block">Số tài khoản:</span>
                      <strong className="text-slate-800 font-bold block mt-0.5 font-mono">
                        {selectedPayslip.bank_account || 'Chưa cập nhật'}
                      </strong>
                    </div>
                  </div>
                  {(!selectedPayslip.bank_name || !selectedPayslip.bank_account) && (
                    <p className="text-xs text-amber-600 flex items-center gap-1.5 pt-2 border-t border-slate-200/60 font-medium">
                      <AlertCircle className="h-3.5 w-3.5" /> Vui lòng cập nhật thông tin tài khoản ngân hàng trong phần Hồ sơ để nhận lương thuận tiện.
                    </p>
                  )}
                </div>

              </motion.div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-16 text-center text-slate-400 space-y-3">
                <Wallet className="h-12 w-12 mx-auto text-slate-200" />
                <p className="font-bold text-slate-700">Chọn một phiếu lương ở danh sách bên trái để xem chi tiết</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
