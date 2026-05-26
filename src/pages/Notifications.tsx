import {
  AlertCircle,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  MailOpen,
  MoreVertical,
  Search,
  Trash2,
  UserPlus,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import api from "../lib/axios";
import { cn } from "../lib/utils";

const PAGE_SIZE = 5;

export default function Notifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await api.get("/notifications/");
        setNotifications(response.data);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const markAllAsRead = async () => {
    try {
      await api.post("/notifications/read-all/");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      window.dispatchEvent(new Event("unread-count-changed"));
    } catch (error) {
      console.error("Failed to mark as read", error);
    }
  };

  const markAsRead = async (id: string | number) => {
    try {
      await api.post(`/notifications/${id}/read/`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
      window.dispatchEvent(new Event("unread-count-changed"));
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "emergency":
      case "alert":
        return <AlertCircle className="h-6 w-6" />;
      case "system":
        return <CheckCircle2 className="h-6 w-6" />;
      case "calendar":
        return <Calendar className="h-6 w-6" />;
      case "swap_request":
      case "request":
        return <UserPlus className="h-6 w-6" />;
      default:
        return <Bell className="h-6 w-6" />;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case "emergency":
      case "alert":
        return "bg-red-100 text-red-600";
      case "system":
        return "bg-green-100 text-green-600";
      case "calendar":
        return "bg-purple-100 text-purple-600";
      case "swap_request":
      case "request":
        return "bg-blue-100 text-blue-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const totalPages = Math.ceil(notifications.length / PAGE_SIZE);
  const paginated = notifications.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 max-w-4xl mx-auto"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Bell className="h-6 w-6 text-[#005ac2]" />
            Thông báo
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            {unreadCount > 0
              ? `Bạn có ${unreadCount} thông báo mới chưa đọc`
              : "Bạn không có thông báo mới nào"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={markAllAsRead}
            className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
            title="Đánh dấu tất cả đã đọc"
          >
            <MailOpen className="h-5 w-5" />
          </button>
          <button className="p-2 text-slate-400 hover:text-red-500 transition-colors">
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm thông báo..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#005ac2]/20 focus:border-[#005ac2] transition-all"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
          <Filter className="h-4 w-4" />
          Lọc
        </button>
      </div>

      {/* Notification List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">
            Đang tải thông báo...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            Chưa có thông báo nào.
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {paginated.map((notif) => (
              <div
                key={notif.id}
                onClick={() => !notif.is_read && markAsRead(notif.id)}
                className={cn(
                  "p-5 flex gap-4 hover:bg-slate-50 transition-colors cursor-pointer group relative",
                  !notif.is_read && "bg-[#005ac2]/[0.02]",
                )}
              >
                {!notif.is_read && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#005ac2]"></div>
                )}

                <div
                  className={cn(
                    "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                    getColor(notif.notification_type),
                  )}
                >
                  {getIcon(notif.notification_type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3
                      className={cn(
                        "text-sm tracking-tight",
                        !notif.is_read
                          ? "font-black text-slate-900"
                          : "font-bold text-slate-700",
                      )}
                    >
                      {notif.title}
                    </h3>
                    <span className="text-xs font-bold text-slate-400 uppercase">
                      {new Date(notif.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">
                    {notif.message}
                  </p>

                  {notif.notification_type === "swap_request" && (
                    <div className="mt-3 flex gap-2">
                      <button className="px-3 py-1 bg-[#005ac2] text-white text-xs font-black rounded-lg hover:bg-[#004fab] transition-colors">
                        XEM CHI TIẾT
                      </button>
                    </div>
                  )}
                </div>

                <button className="p-2 text-slate-300 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-all">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Trang {currentPage} / {totalPages} &nbsp;·&nbsp;{" "}
            {notifications.length} thông báo
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={cn(
                  "w-9 h-9 rounded-lg text-sm font-bold transition-colors",
                  page === currentPage
                    ? "bg-[#005ac2] text-white"
                    : "border border-slate-200 text-slate-600 hover:bg-slate-50",
                )}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
