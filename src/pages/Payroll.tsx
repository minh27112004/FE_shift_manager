import { motion } from 'motion/react';
import { Wallet, Construction } from 'lucide-react';

export default function Payroll() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 sm:p-6 lg:p-8 pb-4"
    >
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Quản lý lương</h1>
          <p className="text-slate-500 font-medium mt-1 text-sm">Theo dõi thu nhập và lịch sử thanh toán</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center py-24 gap-5">
          <div className="h-16 w-16 bg-amber-100 text-amber-500 rounded-2xl flex items-center justify-center">
            <Construction className="h-8 w-8" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-black text-slate-800">Tính năng đang phát triển</h2>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">
              Mô-đun quản lý lương sẽ sớm ra mắt. Dữ liệu lương sẽ được tính tự động từ lịch sử chấm công.
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
            <Wallet className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-widest">Coming soon</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
