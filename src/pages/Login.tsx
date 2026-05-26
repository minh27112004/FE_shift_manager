import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Phone,
  ShieldCheck,
  X,
  KeyRound,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import api from "../lib/axios";

type ForgotStep = "phone" | "otp" | "reset" | "done";

function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<ForgotStep>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [firebaseIdToken, setFirebaseIdToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);

  useEffect(() => {
    recaptchaRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
    });
    return () => {
      recaptchaRef.current?.clear();
    };
  }, []);

  const resetRecaptcha = () => {
    recaptchaRef.current?.clear();
    recaptchaRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
    });
  };

  const handleSendOTP = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const e164 = phone.startsWith("0") ? "+84" + phone.slice(1) : phone;
      confirmationRef.current = await signInWithPhoneNumber(auth, e164, recaptchaRef.current!);
      setStep("otp");
    } catch (err: any) {
      resetRecaptcha();
      console.error("[Firebase OTP error]", err?.code, err?.message, err);
      const code: string = err?.code ?? "";
      if (code.includes("invalid-phone-number")) {
        setError("Số điện thoại không hợp lệ.");
      } else if (code.includes("too-many-requests")) {
        setError("Quá nhiều yêu cầu. Vui lòng thử lại sau.");
      } else if (code.includes("quota-exceeded")) {
        setError("Đã vượt hạn mức SMS. Vui lòng liên hệ quản trị.");
      } else if (code.includes("captcha-check-failed") || code.includes("recaptcha")) {
        setError("Xác minh reCAPTCHA thất bại. Vui lòng thử lại.");
      } else {
        setError(`Lỗi Firebase: ${err?.code ?? "unknown"} – ${err?.message ?? ""}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOTP = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const credential = await confirmationRef.current!.confirm(otp);
      const idToken = await credential.user.getIdToken();
      setFirebaseIdToken(idToken);
      setStep("reset");
    } catch {
      setError("OTP không hợp lệ hoặc đã hết hạn.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post("auth/reset-password/", { id_token: firebaseIdToken, new_password: newPassword });
      setStep("done");
    } catch (err: any) {
      setError(err.response?.data?.error || "Đặt lại mật khẩu thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepTitle = {
    phone: "Nhập số điện thoại",
    otp: "Nhập mã OTP",
    reset: "Đặt mật khẩu mới",
    done: "Thành công",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      {/* RecaptchaVerifier của Firebase cần div này để mount (invisible) */}
      <div id="recaptcha-container" />
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {(["phone", "otp", "reset"] as ForgotStep[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-black transition-colors ${
                step === "done" || ["phone", "otp", "reset"].indexOf(step) > i
                  ? "bg-[#005ac2] text-white"
                  : step === s
                  ? "bg-[#005ac2] text-white"
                  : "bg-slate-100 text-slate-400"
              }`}>
                {(step === "done" || ["phone", "otp", "reset"].indexOf(step) > i) && s !== step
                  ? "✓"
                  : i + 1}
              </div>
              {i < 2 && <div className={`h-px w-8 ${["phone", "otp", "reset"].indexOf(step) > i || step === "done" ? "bg-[#005ac2]" : "bg-slate-200"}`} />}
            </div>
          ))}
        </div>

        <div className="mb-6">
          <h3 className="text-xl font-black text-slate-900 tracking-tight">{stepTitle[step]}</h3>
          {step === "phone" && <p className="text-sm text-slate-500 mt-1">Chúng tôi sẽ gửi mã OTP đến số điện thoại của bạn.</p>}
          {step === "otp" && <p className="text-sm text-slate-500 mt-1">Nhập mã 6 chữ số đã gửi đến <span className="font-bold text-slate-700">{phone}</span>.</p>}
          {step === "reset" && <p className="text-sm text-slate-500 mt-1">Đặt mật khẩu mới cho tài khoản của bạn.</p>}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {step === "phone" && (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09xx xxx xxx"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-[#005ac2]/10 focus:border-[#005ac2] transition-all"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-[#005ac2] text-white rounded-2xl font-black text-sm shadow-lg shadow-[#005ac2]/20 hover:bg-[#004fab] transition-all flex items-center justify-center gap-2 uppercase tracking-widest disabled:opacity-70"
            >
              {isSubmitting ? "Đang gửi..." : "Gửi mã OTP"}
              {!isSubmitting && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium tracking-[0.3em] focus:outline-none focus:ring-4 focus:ring-[#005ac2]/10 focus:border-[#005ac2] transition-all"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting || otp.length < 6}
              className="w-full py-4 bg-[#005ac2] text-white rounded-2xl font-black text-sm shadow-lg shadow-[#005ac2]/20 hover:bg-[#004fab] transition-all flex items-center justify-center gap-2 uppercase tracking-widest disabled:opacity-70"
            >
              {isSubmitting ? "Đang xác thực..." : "Xác nhận OTP"}
              {!isSubmitting && <ArrowRight className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => { setStep("phone"); setOtp(""); setError(""); resetRecaptcha(); }}
              className="w-full text-sm text-slate-500 hover:text-slate-700 font-medium"
            >
              Đổi số điện thoại
            </button>
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mật khẩu mới"
                className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-[#005ac2]/10 focus:border-[#005ac2] transition-all"
                required
              />
              <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showNew ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Xác nhận mật khẩu"
                className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-[#005ac2]/10 focus:border-[#005ac2] transition-all"
                required
              />
              <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-[#005ac2] text-white rounded-2xl font-black text-sm shadow-lg shadow-[#005ac2]/20 hover:bg-[#004fab] transition-all flex items-center justify-center gap-2 uppercase tracking-widest disabled:opacity-70"
            >
              {isSubmitting ? "Đang lưu..." : "Đặt lại mật khẩu"}
              {!isSubmitting && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        )}

        {step === "done" && (
          <div className="text-center py-4">
            <div className="h-16 w-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-slate-600 text-sm font-medium mb-6">Mật khẩu đã được đặt lại thành công. Vui lòng đăng nhập lại.</p>
            <button
              onClick={onClose}
              className="w-full py-4 bg-[#005ac2] text-white rounded-2xl font-black text-sm shadow-lg shadow-[#005ac2]/20 hover:bg-[#004fab] transition-all uppercase tracking-widest"
            >
              Đóng
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Login() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await api.post("auth/login/", {
        phone,
        password,
      });

      const { access, refresh, user: userData } = response.data;
      login(access, refresh, userData);

      const from = location.state?.from?.pathname || "/";
      navigate(from, { replace: true });
    } catch (err: any) {
      if (err.response && err.response.status === 401) {
        setError("Vui lòng kiểm tra lại tên đăng nhập và mật khẩu.");
      } else {
        setError("Đã xảy ra lỗi hệ thống, vui lòng thử lại sau.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}

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
                  "Quản lý & phân công ca làm việc",
                  "Đổi ca, nhượng ca linh hoạt",
                  "Chấm công & báo cáo tự động",
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
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
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
                      onClick={() => setShowForgot(true)}
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
    </>
  );
}
