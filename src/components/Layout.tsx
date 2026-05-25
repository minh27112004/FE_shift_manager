import {
  Bell,
  Bot,
  Calendar,
  ClipboardList,
  CreditCard,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  QrCode,
  Search,
  Settings,
  Settings as SettingsIcon,
  TableProperties,
  User,
  UserPlus,
  Users,
  X,
  BarChart3,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/axios";
import { cn } from "../lib/utils";
import ToastContainer from "./ToastContainer";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const role = user?.role || "employee";
  const [unreadCount, setUnreadCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await api.get("/notifications/unread-count/");
        setUnreadCount(response.data.unread_count);
      } catch {
        // silently fail
      }
    };
    if (user) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const adminNavItems = [
    { icon: LayoutDashboard, label: "Bảng điều khiển", path: "/" },
    { icon: Calendar, label: "Lịch làm việc", path: "/calendar" },
    {
      icon: TableProperties,
      label: "Quản lý ca làm",
      path: "/shift-management",
    },
    {
      icon: Bell,
      label: "Thông báo",
      path: "/notifications",
      badge: unreadCount,
    },
    { icon: UserPlus, label: "Phân ca & Đăng ký", path: "/registration" },
    { icon: CreditCard, label: "Bảng lương", path: "/payroll" },
    { icon: BarChart3, label: "Thống kê báo cáo", path: "/reports" },
    { icon: Users, label: "Quản lý nhân viên", path: "/employees" },
    { icon: Settings, label: "Cài đặt", path: "/settings" },
  ];

  const employeeNavItems = [
    { icon: LayoutDashboard, label: "Trang cá nhân", path: "/" },
    { icon: Calendar, label: "Lịch ca của tôi", path: "/calendar" },
    { icon: ClipboardList, label: "Đăng ký ca", path: "/registration" },
    {
      icon: Bell,
      label: "Thông báo",
      path: "/notifications",
      badge: unreadCount,
    },
    { icon: QrCode, label: "Chấm công QR", path: "/qr-scanner" },
    { icon: CreditCard, label: "Phiếu lương", path: "/my-payslips" },
    { icon: Bot, label: "Trợ lý AI", path: "/ai-assistant" },
    { icon: User, label: "Hồ sơ", path: "/profile/me" },
    { icon: Settings, label: "Cài đặt", path: "/settings" },
  ];

  const navItems =
    role === "admin" || role === "manager" ? adminNavItems : employeeNavItems;

  // Bottom nav items (mobile — max 5 items)
  const bottomNavItems = navItems.slice(0, 5);

  if (location.pathname === "/login" || location.pathname === "/qr-scanner") {
    return <>{children}</>;
  }

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="mb-6 px-2 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#005ac2]">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tighter text-slate-900">
              ShiftMate
            </h1>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Quản lý ca làm
            </p>
          </div>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-1 rounded-lg text-slate-400 hover:bg-slate-200"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 grow overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center justify-between px-3 py-2.5 rounded-lg transition-all text-sm font-medium",
                isActive
                  ? "bg-white text-[#005ac2] shadow-sm"
                  : "text-slate-600 hover:bg-slate-200/50",
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon
                  className={cn("h-5 w-5", isActive && "text-[#005ac2]")}
                />
                <span>{item.label}</span>
              </div>
              {!!item.badge && item.badge > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#9f403d] text-[10px] font-bold text-white">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto flex flex-col gap-1 border-t border-slate-200/50 pt-4">
        <div className="px-3 mb-2 flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-[#005ac2]/10 flex items-center justify-center text-[#005ac2] shrink-0">
            <User className="h-4 w-4" />
          </div>
          <div className="text-sm font-medium text-slate-700 truncate">
            {user ? user.full_name || user.email || user.phone : "Đang tải..."}
          </div>
        </div>
        <Link
          to="/help"
          className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-200/50 rounded-lg text-sm font-medium"
        >
          <HelpCircle className="h-5 w-5" />
          <span>Trợ giúp</span>
        </Link>
        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="flex items-center w-full gap-3 px-3 py-2 text-slate-600 hover:bg-slate-200/50 rounded-lg text-sm font-medium"
        >
          <LogOut className="h-5 w-5" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-[#fcf8f9]">
      <ToastContainer />

      {/* ── Desktop Sidebar ───────────────────────────────── */}
      <aside className="hidden lg:flex fixed left-0 top-0 z-40 h-screen w-64 border-r border-slate-200/50 bg-slate-50 p-4 flex-col gap-2">
        <SidebarContent />
      </aside>

      {/* ── Mobile Sidebar Drawer ─────────────────────────── */}
      {/* Backdrop */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {/* Drawer */}
      <aside
        className={cn(
          "lg:hidden fixed left-0 top-0 z-50 h-screen w-72 bg-slate-50 p-4 flex flex-col gap-2 shadow-2xl transition-transform duration-300",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarContent />
      </aside>

      {/* ── Main ─────────────────────────────────────────── */}
      <main className="flex-1 lg:ml-64 min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-white/90 px-4 lg:px-8 backdrop-blur-xl shadow-sm">
          {/* Hamburger — mobile */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors mr-2"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Search — hidden on small mobile, visible md+ */}
          <div className="hidden sm:flex relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              className="w-full rounded-full border-none bg-slate-100/50 py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#005ac2]/20 focus:outline-none"
            />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1 ml-auto">
            <Link
              to="/notifications"
              className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#9f403d]" />
              )}
            </Link>
            <button className="hidden sm:flex rounded-full p-2 text-slate-500 hover:bg-slate-100 transition-colors">
              <MessageSquare className="h-5 w-5" />
            </button>
            <Link
              to="/settings"
              className="hidden sm:flex rounded-full p-2 text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <SettingsIcon className="h-5 w-5" />
            </Link>
            <Link
              to="/profile/me"
              className="ml-1 h-8 w-8 overflow-hidden rounded-full bg-[#005ac2] text-white flex items-center justify-center font-bold text-xs ring-2 ring-white"
            >
              {user?.full_name?.charAt(0)?.toUpperCase() ||
                user?.email?.charAt(0)?.toUpperCase() ||
                "U"}
            </Link>
          </div>
        </header>

        {/* Page content — extra bottom padding on mobile for bottom nav */}
        <div className="pb-20 lg:pb-0">{children}</div>
      </main>

      {/* ── Mobile Bottom Navigation ──────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 flex items-center justify-around px-2 h-16 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        {bottomNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-colors relative",
                isActive ? "text-[#005ac2]" : "text-slate-400",
              )}
            >
              <div className="relative">
                <item.icon className="h-5 w-5" />
                {!!item.badge && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-[#9f403d] text-[9px] font-bold text-white flex items-center justify-center">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold truncate max-w-[64px] text-center leading-tight">
                {item.label}
              </span>
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 bg-[#005ac2] rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
