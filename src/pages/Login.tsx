import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/axios";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await api.post("auth/login/", {
        phone: email,
        password: password,
      });

      const { access, refresh, user: userData } = response.data;
      login(access, refresh, userData);

      const from = location.state?.from?.pathname || "/";
      navigate(from, { replace: true });
    } catch (err: any) {
      if (err.response && err.response.status === 401) {
        setError("Sai tên đăng nhập hoặc mật khẩu.");
      } else {
        setError("Đã xảy ra lỗi hệ thống, vui lòng thử lại sau.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#fcf8f9]">
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-100">
        {/* Left Side: Brand & Visual */}
        <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-[#005ac2] to-[#5f5c78] text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-12">
              <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-[#005ac2]">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <span className="text-2xl font-black tracking-tighter">
                ShiftMate
              </span>
            </div>

            <h1 className="text-5xl font-black leading-[1.1] tracking-tight mb-8">
              Quản lý ca làm <br />
              <span className="text-blue-200">thông minh hơn.</span>
            </h1>

            <div className="space-y-6">
              {[
                "Tối ưu hóa lịch trình bằng AI",
                "Quản lý bảng lương thời gian thực",
                "Giao tiếp nhóm tập trung",
              ].map((text) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-blue-200" />
                  </div>
                  <span className="font-bold text-sm opacity-90">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10">
            <p className="text-sm font-medium opacity-60">
              © 2023 ShiftMate Inc. Mọi quyền được bảo lưu.
            </p>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="p-8 lg:p-16 flex flex-col justify-center">
          <div className="max-w-sm mx-auto w-full">
            <div className="mb-10">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
                Chào mừng trở lại
              </h2>
              <p className="text-slate-500 font-medium">
                Đăng nhập để tiếp tục quản lý công việc của bạn
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <form className="space-y-5" onSubmit={handleLogin}>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Số điện thoại
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="09xx xxx xxx"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-[#005ac2]/10 focus:border-[#005ac2] transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Mật khẩu
                  </label>
                  <button
                    type="button"
                    className="text-[10px] font-black text-[#005ac2] uppercase tracking-widest hover:underline"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-[#005ac2]/10 focus:border-[#005ac2] transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-4 py-4 bg-[#005ac2] text-white rounded-2xl font-black text-sm shadow-xl shadow-[#005ac2]/20 hover:bg-[#004fab] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-widest disabled:opacity-70 disabled:hover:scale-100"
              >
                {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
                {!isSubmitting && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
