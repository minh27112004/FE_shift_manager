import {
  AlarmClock,
  AlertCircle,
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  Info,
  Loader2,
  Plus,
  PlusCircle,
  QrCode,
  Save,
  Trash2,
  X
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { QRModal } from "../components/QRModal";
import { ShiftDetailModal } from "../components/ShiftDetailModal";
import {
  SHIFT_FORM_DEFAULT,
  ShiftFormModal,
  type ShiftFormValues,
} from "../components/ShiftFormModal";
import { useAuth } from "../context/AuthContext";
import { useShifts } from "../context/ShiftContext";
import api from "../lib/axios";
import { toast } from "../lib/toast";
import { cn } from "../lib/utils";

function buildCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();

  const startOffset = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const cells: {
    day: number;
    date: string;
    prevMonth?: boolean;
    nextMonth?: boolean;
    today?: boolean;
  }[] = [];

  for (let i = startOffset - 1; i >= 0; i--) {
    const d = daysInPrev - i;
    const m = month - 1 < 0 ? 11 : month - 1;
    const y = month - 1 < 0 ? year - 1 : year;
    cells.push({
      day: d,
      date: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      prevMonth: true,
    });
  }

  const todayStr = new Date().toISOString().split("T")[0];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, date: dateStr, today: dateStr === todayStr });
  }

  let next = 1;
  while (cells.length % 7 !== 0) {
    const m = month + 1 > 11 ? 0 : month + 1;
    const y = month + 1 > 11 ? year + 1 : year;
    cells.push({
      day: next,
      date: `${y}-${String(m + 1).padStart(2, "0")}-${String(next).padStart(2, "0")}`,
      nextMonth: true,
    });
    next++;
  }

  return cells;
}

const MONTH_NAMES = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];

const EMPTY_FORM = SHIFT_FORM_DEFAULT;

function transformShift(s: any) {
  const timeStr = `${s.start_time?.substring(0, 5)} - ${s.end_time?.substring(0, 5)}`;
  let isPast = false;
  if (s.date && s.end_time && s.start_time) {
    const endDt = new Date(`${s.date}T${s.end_time}`);
    const startDt = new Date(`${s.date}T${s.start_time}`);
    if (endDt < startDt) {
      endDt.setDate(endDt.getDate() + 1);
    }
    isPast = new Date() > endDt;
  }
  return {
    id: s.id,
    name: s.created_by_name || "Hệ thống",
    time: timeStr,
    date: s.date,
    type: (s.is_emergency ? "error" : s.is_open ? "primary" : "tertiary") as
      | "primary"
      | "tertiary"
      | "error",
    label: s.note || `Ca làm (${s.assignments?.length || 0}/${s.max_workers})`,
    isPast,
    backendData: s,
  };
}

export default function CalendarPage() {
  const { shifts, isLoading, addShift } = useShifts();
  const { user } = useAuth();
  const role = user?.role || "employee";

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<ShiftFormValues>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [qrShift, setQrShift] = useState<{
    id: number;
    label: string;
    time: string;
    date: string;
  } | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showBulkCreate, setShowBulkCreate] = useState(false);
  const [detailShift, setDetailShift] = useState<ReturnType<
    typeof transformShift
  > | null>(null);

  // Employee-specific: fetch personal shifts from dedicated endpoint
  const [myShifts, setMyShifts] = useState<ReturnType<typeof transformShift>[]>(
    [],
  );
  const [myShiftsLoading, setMyShiftsLoading] = useState(false);

  useEffect(() => {
    if (role !== "employee") return;
    const fetch = async () => {
      setMyShiftsLoading(true);
      try {
        const res = await api.get("/shifts/my-shifts/");
        setMyShifts((res.data as any[]).map(transformShift));
      } catch {
        // fallback: filter from global shifts
        setMyShifts(
          shifts
            .filter((s) =>
              s.backendData?.assignments?.some(
                (a: any) => String(a.user ?? a.user_id) === String(user?.id),
              ),
            )
            .map((s) => ({ ...s, backendData: s.backendData ?? {} })),
        );
      } finally {
        setMyShiftsLoading(false);
      }
    };
    fetch();
  }, [role, shifts]);

  const days = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN"];
  const calendarData = buildCalendarDays(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  };
  const goToday = () => {
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
  };

  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreateError("");
    if (createForm.start_time >= createForm.end_time) {
      setCreateError("Giờ kết thúc phải sau giờ bắt đầu.");
      return;
    }
    setCreating(true);
    try {
      await addShift({
        date: createForm.date,
        start_time: createForm.start_time,
        end_time: createForm.end_time,
        note: createForm.note,
        is_open: createForm.is_open,
        is_emergency: createForm.is_emergency,
        max_workers: Number(createForm.max_workers),
        salary_multiplier: createForm.salary_multiplier,
        store: createForm.store || undefined,
      });
      setShowCreate(false);
      setCreateForm(EMPTY_FORM);
    } catch (err: any) {
      const data = err.response?.data;
      if (data && typeof data === "object") {
        const msgs = Object.entries(data)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          .join(" | ");
        setCreateError(msgs);
      } else {
        setCreateError("Tạo ca thất bại. Vui lòng thử lại.");
      }
    } finally {
      setCreating(false);
    }
  };

  const displayShifts = role === "employee" ? myShifts : shifts;
  const calendarLoading = isLoading || (role === "employee" && myShiftsLoading);

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
            {role === "employee" ? "Lịch ca của tôi" : "Lịch trình ca làm"}
          </h1>
          <p className="text-slate-500 font-medium">
            {MONTH_NAMES[viewMonth]}, {viewYear}
            {role === "employee" && " · Các ca bạn đã được phân công"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white rounded-xl shadow-sm px-2 border border-slate-100">
            <button
              onClick={prevMonth}
              className="p-2 text-slate-500 hover:text-[#005ac2] transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={goToday}
              className="px-4 font-bold text-sm hover:text-[#005ac2] transition-colors"
            >
              Hôm nay
            </button>
            <button
              onClick={nextMonth}
              className="p-2 text-slate-500 hover:text-[#005ac2] transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          {(role === "admin" || role === "manager") && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowTemplates(true)}
                className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold shadow-sm hover:bg-slate-50 active:scale-95 transition-all flex items-center gap-2"
              >
                <AlarmClock className="h-4 w-4" />
                Template
              </button>
              <button
                onClick={() => setShowBulkCreate(true)}
                className="bg-white border border-[#005ac2] text-[#005ac2] px-4 py-2.5 rounded-xl font-bold shadow-sm hover:bg-blue-50 active:scale-95 transition-all flex items-center gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                Tạo hàng loạt
              </button>
              <button
                onClick={() => {
                  setCreateForm(EMPTY_FORM);
                  setCreateError("");
                  setShowCreate(true);
                }}
                className="bg-[#005ac2] text-white px-6 py-2.5 rounded-xl font-bold shadow-md hover:bg-[#004fab] active:scale-95 transition-all flex items-center gap-2"
              >
                <PlusCircle className="h-5 w-5" />
                Tạo ca làm
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Loading overlay */}
      {calendarLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-[#005ac2] animate-spin" />
        </div>
      )}

      {/* Calendar Grid */}
      {!calendarLoading && (
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200/50 overflow-x-auto">
          <div className="min-w-[560px]">
            {/* Day Headers */}
            <div className="grid grid-cols-7 border-b border-slate-100">
              {days.map((day) => (
                <div
                  key={day}
                  className="py-3 text-center text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-400"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Cells */}
            <div className="grid grid-cols-7 auto-rows-[minmax(100px,_auto)] sm:auto-rows-[minmax(130px,_auto)]">
              {calendarData.map((cell, i) => {
                const dayShifts = displayShifts.filter(
                  (s) => s.date === cell.date,
                );
                return (
                  <div
                    key={i}
                    className={cn(
                      "p-2 border-r border-b border-slate-100 transition-colors",
                      (cell.prevMonth || cell.nextMonth) &&
                        "bg-slate-50/30 opacity-40",
                      cell.today && "bg-[#005ac2]/5",
                    )}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span
                        className={cn(
                          "text-sm font-bold ml-1",
                          cell.today
                            ? "h-6 w-6 bg-[#005ac2] text-white rounded-full flex items-center justify-center text-xs font-black"
                            : "text-slate-900",
                        )}
                      >
                        {cell.day}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      {dayShifts.map((shift, si) => (
                        <div
                          key={si}
                          onClick={() => {
                            if (role === "admin" || role === "manager")
                              setDetailShift(
                                shift as ReturnType<typeof transformShift>,
                              );
                          }}
                          className={cn(
                            "px-2 py-1 rounded-md text-xs font-bold border-l-4",
                            shift.type === "primary" &&
                              "bg-[#d8e2ff]/40 text-[#004eaa] border-[#005ac2]",
                            shift.type === "tertiary" &&
                              "bg-[#d3ceef]/50 text-[#47445f] border-[#5f5c78]",
                            shift.type === "error" &&
                              "bg-[#fe8983]/30 text-[#752121] border-[#9f403d]",
                            role === "employee" &&
                              "ring-2 ring-[#005ac2] ring-offset-1",
                            (role === "admin" || role === "manager") &&
                              "cursor-pointer hover:brightness-95 transition-all",
                          )}
                        >
                          <div className="truncate">{shift.label}</div>
                          <div className="text-xs opacity-70">{shift.time}</div>
                          {role === "employee" && (
                            <span className="flex items-center gap-0.5 text-xs font-black text-[#005ac2] mt-0.5">
                              <CalendarCheck className="h-2.5 w-2.5" /> Của tôi
                            </span>
                          )}
                          {(role === "admin" || role === "manager") &&
                            !shift.isPast && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setQrShift({
                                    id: shift.id,
                                    label: shift.label,
                                    time: shift.time,
                                    date: shift.date,
                                  });
                                }}
                                className="mt-1 flex items-center gap-0.5 text-[9px] font-black text-[#005ac2] hover:text-[#004fab] transition-colors"
                              >
                                <QrCode className="h-2.5 w-2.5" /> Tạo QR
                              </button>
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

      {/* Create Shift Modal */}
      <AnimatePresence>
        {showCreate && (
          <ShiftFormModal
            form={createForm}
            setForm={setCreateForm}
            onSubmit={handleCreateSubmit}
            onClose={() => setShowCreate(false)}
            submitting={creating}
            error={createError}
          />
        )}
      </AnimatePresence>

      {/* Template Manager Modal */}
      <AnimatePresence>
        {showTemplates && (
          <TemplateManagerModal onClose={() => setShowTemplates(false)} />
        )}
        {showBulkCreate && (
          <BulkShiftModal
            onClose={() => setShowBulkCreate(false)}
            onCreated={() => {
              setShowBulkCreate(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* QR Modal */}
      <AnimatePresence>
        {qrShift && (
          <QRModal shift={qrShift} onClose={() => setQrShift(null)} />
        )}
      </AnimatePresence>

      {/* Shift Detail Modal */}
      <AnimatePresence>
        {detailShift && (
          <ShiftDetailModal
            shift={detailShift}
            onClose={() => setDetailShift(null)}
            onOpenQR={() => {
              setQrShift({
                id: detailShift.id,
                label: detailShift.label,
                time: detailShift.time,
                date: detailShift.date,
              });
              setDetailShift(null);
            }}
            userRole={role}
          />
        )}
      </AnimatePresence>

      {/* Legend & Insights */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
            <Info className="h-4 w-4 text-[#005ac2]" />
            Chú giải màu sắc
          </h3>
          <div className="space-y-3">
            {role === "employee" ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full border-2 border-[#005ac2] bg-white"></div>
                  <span className="text-sm text-slate-500 font-medium">
                    Ca thường
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-[#9f403d]"></div>
                  <span className="text-sm text-slate-500 font-medium">
                    Ca khẩn cấp
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-[#005ac2]"></div>
                  <span className="text-sm text-slate-500 font-medium">
                    Ca mở · Đang cần nhân viên
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-[#5f5c78]"></div>
                  <span className="text-sm text-slate-500 font-medium">
                    Ca đã đủ nhân sự
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-[#9f403d]"></div>
                  <span className="text-sm text-slate-500 font-medium">
                    Ca khẩn cấp
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface ShiftTemplate {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  min_workers: number;
  max_workers: number;
  is_active: boolean;
  store: number;
}

const EMPTY_TPL = {
  name: "",
  start_time: "",
  end_time: "",
  min_workers: 1,
  max_workers: 3,
  is_active: true,
};

function TemplateManagerModal({ onClose }: { onClose: () => void }) {
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<typeof EMPTY_TPL>(EMPTY_TPL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchTemplates = () => {
    setLoading(true);
    api
      .get("/shifts/templates/")
      .then((r) => setTemplates(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const startEdit = (tpl: ShiftTemplate) => {
    setEditingId(tpl.id);
    setForm({
      name: tpl.name,
      start_time: tpl.start_time.slice(0, 5),
      end_time: tpl.end_time.slice(0, 5),
      min_workers: tpl.min_workers,
      max_workers: tpl.max_workers,
      is_active: tpl.is_active,
    });
    setError("");
  };

  const startNew = () => {
    setEditingId("new");
    setForm(EMPTY_TPL);
    setError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setError("");
  };

  const handleSave = async () => {
    if (!form.name || !form.start_time || !form.end_time) {
      setError("Vui lòng điền đầy đủ thông tin.");
      return;
    }
    if (form.start_time >= form.end_time) {
      setError("Giờ kết thúc phải sau giờ bắt đầu.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editingId === "new") {
        await api.post("/shifts/templates/", { ...form, store: 1 });
      } else {
        await api.patch(`/shifts/templates/${editingId}/`, form);
      }
      setEditingId(null);
      fetchTemplates();
    } catch (err: any) {
      const data = err.response?.data;
      setError(data ? Object.values(data).flat().join(", ") : "Lưu thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!(await toast.confirm("Xóa template này?", "Xóa"))) return;
    try {
      await api.delete(`/shifts/templates/${id}/`);
      fetchTemplates();
    } catch {}
  };

  const inputCls =
    "w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-[#005ac2]/20 focus:border-[#005ac2]/40 focus:outline-none placeholder:text-slate-400";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="font-black text-slate-900">
              Quản lý template ca làm
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Chọn template để điền nhanh khi tạo ca mới
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={startNew}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#005ac2] text-white text-base font-black rounded-xl hover:bg-[#004fab] transition-colors"
            >
              <Plus className="h-4 w-4" /> Thêm mới
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
          {/* New / Edit form */}
          <AnimatePresence>
            {editingId !== null && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3 overflow-hidden"
              >
                <p className="text-xs font-black text-slate-500 uppercase tracking-wider">
                  {editingId === "new"
                    ? "Tạo template mới"
                    : "Chỉnh sửa template"}
                </p>
                {error && (
                  <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {error}
                  </p>
                )}
                <input
                  className={inputCls}
                  placeholder="Tên template (vd: Ca sáng)"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      Giờ bắt đầu
                    </label>
                    <input
                      type="time"
                      className={inputCls + " mt-1"}
                      value={form.start_time}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, start_time: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      Giờ kết thúc
                    </label>
                    <input
                      type="time"
                      className={inputCls + " mt-1"}
                      value={form.end_time}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, end_time: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      Tối thiểu NV
                    </label>
                    <input
                      type="number"
                      min={1}
                      className={inputCls + " mt-1"}
                      value={form.min_workers}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, min_workers: +e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      Tối đa NV
                    </label>
                    <input
                      type="number"
                      min={1}
                      className={inputCls + " mt-1"}
                      value={form.max_workers}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, max_workers: +e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={cancelEdit}
                    className="flex-1 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 py-2 rounded-xl bg-[#005ac2] text-white text-sm font-black hover:bg-[#004fab] transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Lưu
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Template list */}
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 text-[#005ac2] animate-spin" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <AlarmClock className="h-10 w-10 mx-auto mb-3 text-slate-200" />
              <p className="text-sm font-bold">Chưa có template nào</p>
            </div>
          ) : (
            templates.map((tpl) => (
              <div
                key={tpl.id}
                className={cn(
                  "flex items-center justify-between p-4 rounded-2xl border transition-colors",
                  tpl.is_active
                    ? "bg-white border-slate-100 hover:border-[#005ac2]/30"
                    : "bg-slate-50 border-slate-100 opacity-50",
                )}
              >
                <div className="flex-1 text-left">
                  <p className="font-black text-slate-900 text-base">
                    {tpl.name}
                  </p>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {tpl.start_time.slice(0, 5)} – {tpl.end_time.slice(0, 5)} ·{" "}
                    {tpl.min_workers}–{tpl.max_workers} nhân viên
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-3 shrink-0">
                  <button
                    onClick={() => startEdit(tpl)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-[#005ac2] hover:bg-blue-50 transition-colors"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(tpl.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── BulkShiftModal ────────────────────────────────────────────────────────────
const DAY_NAMES = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function BulkShiftModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [loadingTpl, setLoadingTpl] = useState(true);
  const [selectedTpl, setSelectedTpl] = useState<ShiftTemplate | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState("");
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [isOpen, setIsOpen] = useState(true);
  const [salaryMultiplier, setSalaryMultiplier] = useState("1.00");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    created: string[];
    skipped: string[];
    message: string;
  } | null>(null);

  useEffect(() => {
    api
      .get("/shifts/templates/")
      .then((r) => setTemplates(r.data))
      .catch(() => {})
      .finally(() => setLoadingTpl(false));
  }, []);

  const previewDates = (() => {
    if (!fromDate || !toDate || !selectedTpl) return [];
    const dates: string[] = [];
    const cur = new Date(fromDate);
    const end = new Date(toDate);
    while (cur <= end) {
      const dow = (cur.getDay() + 6) % 7;
      if (selectedDays.includes(dow))
        dates.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  })();

  const toggleDay = (d: number) =>
    setSelectedDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );

  const handleSubmit = async () => {
    if (!selectedTpl || previewDates.length === 0) return;
    setSubmitting(true);
    try {
      const res = await api.post("/shifts/bulk-from-template/", {
        template_id: selectedTpl.id,
        dates: previewDates,
        is_open: isOpen,
        salary_multiplier: salaryMultiplier,
        note,
      });
      setResult(res.data);
      onCreated();
    } catch {
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    "w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#005ac2]/20 focus:border-[#005ac2]";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#d8e2ff] flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-[#005ac2]" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                Tạo ca hàng loạt
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Từ template theo khoảng ngày
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-400"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {result ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center gap-4">
            <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-green-600" />
            </div>
            <p className="text-base font-black text-slate-900">
              {result.message}
            </p>
            {result.skipped.length > 0 && (
              <p className="text-sm text-slate-400">
                Bỏ qua (đã tồn tại): {result.skipped.join(", ")}
              </p>
            )}
            <button
              onClick={onClose}
              className="mt-2 px-8 py-2.5 bg-[#005ac2] text-white font-bold rounded-xl hover:bg-[#004fab] transition-colors"
            >
              Đóng
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* 1. Template */}
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                1. Chọn template
              </p>
              {loadingTpl ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-[#005ac2]" />
                </div>
              ) : (
                <div className="space-y-2">
                  {templates
                    .filter((t) => t.is_active)
                    .map((tpl) => (
                      <button
                        key={tpl.id}
                        onClick={() => {
                          setSelectedTpl(tpl);
                          setNote(tpl.name);
                        }}
                        className={cn(
                          "w-full text-left px-4 py-3 rounded-xl border-2 transition-all",
                          selectedTpl?.id === tpl.id
                            ? "border-[#005ac2] bg-[#d8e2ff]/30"
                            : "border-slate-100 hover:border-slate-200",
                        )}
                      >
                        <p className="text-sm font-black text-slate-900">
                          {tpl.name}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          <Clock className="inline h-3 w-3 mr-1" />
                          {tpl.start_time.slice(0, 5)} –{" "}
                          {tpl.end_time.slice(0, 5)} · Tối đa {tpl.max_workers}{" "}
                          NV
                        </p>
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* 2. Khoảng ngày */}
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                2. Khoảng ngày
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">
                    Từ ngày
                  </label>
                  <input
                    type="date"
                    value={fromDate}
                    min={today}
                    onChange={(e) => setFromDate(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">
                    Đến ngày
                  </label>
                  <input
                    type="date"
                    value={toDate}
                    min={fromDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            {/* 3. Ngày trong tuần */}
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                3. Ngày trong tuần
              </p>
              <div className="flex gap-2">
                {DAY_NAMES.map((d, i) => (
                  <button
                    key={i}
                    onClick={() => toggleDay(i)}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-xs font-black transition-all",
                      selectedDays.includes(i)
                        ? "bg-[#005ac2] text-white"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200",
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Tuỳ chọn */}
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                4. Tuỳ chọn
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">
                    Hệ số lương
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.1"
                    value={salaryMultiplier}
                    onChange={(e) => setSalaryMultiplier(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isOpen}
                      onChange={(e) => setIsOpen(e.target.checked)}
                      className="w-4 h-4 accent-[#005ac2]"
                    />
                    <span className="text-sm font-bold text-slate-700">
                      Mở đăng ký
                    </span>
                  </label>
                </div>
              </div>
              <div className="mt-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  Ghi chú
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Tên ca..."
                  className={inputCls}
                />
              </div>
            </div>

            {/* Preview */}
            {previewDates.length > 0 && (
              <div className="bg-slate-50 rounded-2xl p-4">
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                  Xem trước · {previewDates.length} ca sẽ được tạo
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {previewDates.map((d) => (
                    <span
                      key={d}
                      className="px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!result && (
          <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !selectedTpl || previewDates.length === 0}
              className="flex-1 py-2.5 rounded-xl bg-[#005ac2] text-white font-bold text-sm hover:bg-[#004fab] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PlusCircle className="h-4 w-4" />
              )}
              Tạo {previewDates.length > 0 ? `${previewDates.length} ca` : "ca"}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
