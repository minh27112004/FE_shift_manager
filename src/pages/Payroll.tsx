import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Loader2, Calculator, Clock } from 'lucide-react';
import api from '../lib/axios';
import { toast } from '../lib/toast';

interface Store { id: number; name: string; }

interface Row {
  user_id: number;
  user_name: string;
  user_phone: string;
  total_shifts: number;
  total_hours: string;
  hourly_rate: string;
  gross_amount: string;
}

const fmt = (val: string | number) =>
  Number(val).toLocaleString('vi-VN') + ' đ';

export default function Payroll() {
  const now = new Date();
  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState<number | ''>('');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    api.get('/stores/').then(r => {
      setStores(r.data);
      if (r.data.length > 0) setStoreId(r.data[0].id);
    });
  }, []);

  const load = async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const res = await api.get('/payroll/preview/', {
        params: { store: storeId, month, year },
      });
      setRows(res.data.employees);
    } catch {
      toast.error('Không tải được dữ liệu lương.');
    } finally {
      setLoading(false);
    }
  };

  const totalGross = rows.reduce((s, r) => s + Number(r.gross_amount), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 sm:p-6 lg:p-8 pb-8"
    >
      <div className="max-w-5xl mx-auto space-y-5">

        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Bảng lương</h1>
          <p className="text-slate-500 text-sm mt-1">Tổng hợp công và lương nhân viên theo tháng</p>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3 items-end">
          <div className="flex items-center gap-2 flex-1 min-w-[160px]">
            <label className="text-xs font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">Cửa hàng</label>
            <select
              value={storeId}
              onChange={e => setStoreId(Number(e.target.value))}
              className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#005ac2]/20"
            >
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">Tháng</label>
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#005ac2]/20"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>Tháng {m}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">Năm</label>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#005ac2]/20"
            >
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <button
            onClick={load}
            disabled={!storeId || loading}
            className="flex items-center gap-2 px-5 py-2 bg-[#005ac2] text-white rounded-xl font-bold text-sm hover:bg-[#004fab] active:scale-95 transition-all disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
            Xem
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 text-[#005ac2] animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <Calculator className="h-10 w-10 text-slate-200" />
              <p className="text-sm font-bold">Chọn cửa hàng và tháng, nhấn Xem</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      {['Nhân viên', 'Số ca', 'Tổng giờ làm', 'Lương/giờ', 'Thành tiền'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {rows.map(r => (
                      <tr key={r.user_id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-800">{r.user_name}</p>
                          <p className="text-xs text-slate-400">{r.user_phone}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{r.total_shifts}</td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1 text-slate-700">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            {Number(r.total_hours).toFixed(1)}h
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{fmt(r.hourly_rate)}</td>
                        <td className="px-4 py-3 font-bold text-[#005ac2]">{fmt(r.gross_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200 bg-slate-50/60">
                      <td colSpan={4} className="px-4 py-3 text-xs font-black text-slate-400 uppercase tracking-wider text-right">
                        Tổng cộng
                      </td>
                      <td className="px-4 py-3 font-black text-[#005ac2] text-base">{fmt(totalGross)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>

      </div>
    </motion.div>
  );
}
