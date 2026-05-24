import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";

const STORAGE_KEY = "automation_station_re_appointments";
const APPT_TYPES = [
  { name: "Showing", color: "bg-blue-500", border: "border-blue-500", soft: "bg-blue-50 text-blue-700 border-blue-200" },
  { name: "Buyer Consult", color: "bg-violet-500", border: "border-violet-500", soft: "bg-violet-50 text-violet-700 border-violet-200" },
  { name: "Listing Consult", color: "bg-fuchsia-500", border: "border-fuchsia-500", soft: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200" },
  { name: "Inspection", color: "bg-amber-500", border: "border-amber-500", soft: "bg-amber-50 text-amber-700 border-amber-200" },
  { name: "Appraisal", color: "bg-cyan-500", border: "border-cyan-500", soft: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  { name: "Final Walkthrough", color: "bg-emerald-500", border: "border-emerald-500", soft: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { name: "Closing", color: "bg-green-600", border: "border-green-600", soft: "bg-green-50 text-green-700 border-green-200" },
  { name: "Open House", color: "bg-orange-500", border: "border-orange-500", soft: "bg-orange-50 text-orange-700 border-orange-200" },
  { name: "Photography", color: "bg-pink-500", border: "border-pink-500", soft: "bg-pink-50 text-pink-700 border-pink-200" },
  { name: "Contract Deadline", color: "bg-red-500", border: "border-red-500", soft: "bg-red-50 text-red-700 border-red-200" },
  { name: "Client Call", color: "bg-indigo-500", border: "border-indigo-500", soft: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { name: "Follow-up", color: "bg-slate-500", border: "border-slate-500", soft: "bg-slate-50 text-slate-700 border-slate-200" },
];

function typeMeta(type) {
  return APPT_TYPES.find((item) => item.name === type) || APPT_TYPES[0];
}

function loadAppointments() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayValue() {
  return formatDate(new Date());
}

function monthDays(cursor) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function blankAppointment(date = todayValue()) {
  return {
    title: "",
    type: "Showing",
    date,
    time: "",
    address: "",
    contact_name: "",
    contact_phone: "",
    notes: "",
  };
}

export default function CalendarAppointments() {
  const [appointments, setAppointments] = useState(loadAppointments);
  const [cursor, setCursor] = useState(() => new Date());
  const [view, setView] = useState("day");
  const [activeTypes, setActiveTypes] = useState(() => new Set(APPT_TYPES.map((item) => item.name)));
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(blankAppointment());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));
  }, [appointments]);

  const days = useMemo(() => monthDays(cursor), [cursor]);
  const filteredAppointments = useMemo(
    () => appointments.filter((item) => activeTypes.has(item.type)),
    [appointments, activeTypes]
  );
  const appointmentsByDate = useMemo(() => {
    return filteredAppointments.reduce((acc, item) => {
      acc[item.date] = acc[item.date] || [];
      acc[item.date].push(item);
      acc[item.date].sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));
      return acc;
    }, {});
  }, [filteredAppointments]);
  const selectedDateKey = formatDate(cursor);
  const selectedDayAppointments = appointmentsByDate[selectedDateKey] || [];

  function shiftMonth(delta) {
    setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  function toggleType(type) {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function openNewAppointment(date = todayValue()) {
    setForm(blankAppointment(date));
    setModalOpen(true);
  }

  function addAppointment(e) {
    e.preventDefault();
    if (!form.title.trim() && !form.address.trim()) return;
    
    if (form.id) {
      // Edit existing appointment
      setAppointments((prev) =>
        prev.map((item) => (item.id === form.id ? { ...form, title: form.title.trim() || form.type } : item))
      );
    } else {
      // Add new appointment
      setAppointments((prev) => [
        ...prev,
        { ...form, id: crypto.randomUUID(), title: form.title.trim() || form.type },
      ]);
    }
    setModalOpen(false);
  }

  function deleteAppointment(id) {
    setAppointments((prev) => prev.filter((item) => item.id !== id));
  }

  const inputCls = "w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400";
  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const dayLabel = cursor.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <div>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Appointment Calendar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Color-coded real estate calendar with filters for showings, deadlines, calls, closings, and more.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openNewAppointment()}
          className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 shadow-sm"
          style={{ backgroundColor: "var(--brand-color, #2563eb)" }}
        >
          <Icon icon="mdi:calendar-plus" className="w-4 h-4" />
          Add Appointment
        </button>
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-2xs bg-white dark:bg-gray-900">
              <button
                type="button"
                onClick={() => (view === "day" ? setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 1)) : shiftMonth(-1))}
                className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700 transition-colors"
              >
                <Icon icon="mdi:chevron-left" className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setCursor(new Date())}
                className="px-3.5 py-2 text-xs font-bold text-gray-750 dark:text-gray-250 hover:bg-gray-50 dark:hover:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-colors"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => (view === "day" ? setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1)) : shiftMonth(1))}
                className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
              >
                <Icon icon="mdi:chevron-right" className="w-5 h-5" />
              </button>
            </div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 truncate ml-2">
              {view === "day" ? dayLabel : monthLabel}
            </h2>
          </div>

          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1 border border-gray-250/30 dark:border-gray-700/50 self-start sm:self-center">
            {["day", "month", "agenda"].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setView(item)}
                className={`rounded-md px-4 py-1.5 text-xs font-bold capitalize transition-all ${
                  view === item
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/40 dark:hover:bg-gray-750/30"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={() => setActiveTypes(new Set(APPT_TYPES.map((item) => item.name)))}
            className="px-2.5 py-1 rounded-md text-xs font-bold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors bg-white dark:bg-gray-900"
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setActiveTypes(new Set())}
            className="px-2.5 py-1 rounded-md text-xs font-bold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors bg-white dark:bg-gray-900"
          >
            Clear
          </button>
          {APPT_TYPES.map((type) => {
            const isActive = activeTypes.has(type.name);
            return (
              <button
                key={type.name}
                type="button"
                onClick={() => toggleType(type.name)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-bold transition-all ${
                  isActive
                    ? `${type.soft} shadow-3xs`
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${type.color}`} />
                {type.name}
              </button>
            );
          })}
        </div>
      </div>

      {view === "day" && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800 mb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Day View</p>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">{dayLabel}</h2>
            </div>
            <button
              type="button"
              onClick={() => openNewAppointment(selectedDateKey)}
              className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 shadow-sm"
              style={{ backgroundColor: "var(--brand-color, #2563eb)" }}
            >
              <Icon icon="mdi:plus" className="w-4 h-4" />
              Add Event
            </button>
          </div>

          <div className="space-y-4">
            {selectedDayAppointments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-800 py-16 text-center text-gray-400 dark:text-gray-500 bg-gray-50/25 dark:bg-gray-950/10">
                <Icon icon="mdi:calendar-blank-outline" className="w-10 h-10 mx-auto mb-3 text-gray-350 dark:text-gray-700" />
                <p className="text-sm font-semibold text-gray-650 dark:text-gray-400">No appointments for this day</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Click Add Event to schedule something.</p>
              </div>
            ) : (
              selectedDayAppointments.map((item) => {
                const meta = typeMeta(item.type);
                return (
                  <div key={item.id} className={`rounded-xl border p-4 hover:shadow-2xs transition-shadow relative group ${meta.soft} ${meta.border} border-l-4`}>
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <p
                            className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate cursor-pointer hover:underline"
                            onClick={() => {
                              setForm(item);
                              setModalOpen(true);
                            }}
                          >
                            {item.title}
                          </p>
                          <span className="text-[10px] font-bold uppercase tracking-wider rounded-md border border-current px-2 py-0.5 leading-none shrink-0 opacity-80">{item.type}</span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 font-semibold flex items-center gap-1.5">
                          <Icon icon="mdi:clock-outline" className="w-3.5 h-3.5 opacity-70" />
                          <span>{item.time || "Any time"}</span>
                          {item.address && (
                            <>
                              <span className="opacity-40">·</span>
                              <Icon icon="mdi:map-marker-outline" className="w-3.5 h-3.5 opacity-70" />
                              <span className="truncate">{item.address}</span>
                            </>
                          )}
                        </p>
                        {(item.contact_name || item.contact_phone) && (
                          <p className="text-xs text-gray-650 dark:text-gray-400 mt-1.5 flex items-center gap-1.5">
                            <Icon icon="mdi:account-outline" className="w-3.5 h-3.5 opacity-70" />
                            <span>{item.contact_name} {item.contact_phone ? `· ${item.contact_phone}` : ""}</span>
                          </p>
                        )}
                        {item.notes && (
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-3 bg-white/70 dark:bg-gray-900/60 border border-gray-200/40 dark:border-gray-800/40 p-2.5 rounded-lg whitespace-pre-wrap leading-relaxed shadow-3xs">
                            {item.notes}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteAppointment(item.id)}
                        className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/80 dark:hover:bg-gray-800 rounded-lg"
                        title="Delete"
                      >
                        <Icon icon="mdi:trash-can-outline" className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {view === "month" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col w-full">
            <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 border-b border-r border-gray-150 dark:border-gray-800">
              {days.map((day) => {
                const dateKey = formatDate(day);
                const isSelected = dateKey === selectedDateKey;
                const isToday = dateKey === todayValue();
                const inMonth = day.getMonth() === cursor.getMonth();
                const dayAppointments = appointmentsByDate[dateKey] || [];

                const dayNumberCls = (() => {
                  if (isToday && isSelected) return "bg-blue-600 text-white font-bold";
                  if (isToday) return "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold";
                  if (isSelected) return "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-bold";
                  if (inMonth) return "text-gray-700 dark:text-gray-300 font-semibold";
                  return "text-gray-350 dark:text-gray-655";
                })();

                return (
                  <div
                    key={dateKey}
                    onClick={() => setCursor(day)}
                    onDoubleClick={() => {
                      setCursor(day);
                      setView("day");
                    }}
                    title="Double-click to open Day View schedule"
                    className={`p-1.5 sm:p-2 transition-colors cursor-pointer flex flex-col justify-between border-l border-t border-gray-150 dark:border-gray-800/80 ${
                      isSelected
                        ? "bg-blue-50/10 dark:bg-blue-900/5 ring-2 ring-blue-500 ring-inset z-10"
                        : inMonth
                        ? "bg-white dark:bg-gray-900 hover:bg-gray-50/30 dark:hover:bg-gray-850/40"
                        : "bg-gray-50/40 dark:bg-gray-950/20 text-gray-400 dark:text-gray-600"
                    } min-h-[60px] md:min-h-[120px]`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`inline-flex h-5.5 w-5.5 items-center justify-center rounded-full text-xs transition-colors ${dayNumberCls}`}>
                        {day.getDate()}
                      </span>
                      {dayAppointments.length > 0 && (
                        <span className="hidden md:inline-block text-[9px] font-bold text-gray-400 dark:text-gray-500 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                          {dayAppointments.length}
                        </span>
                      )}
                    </div>

                    <div className="hidden md:block flex-1 space-y-1 overflow-y-auto max-h-[82px] scrollbar-thin">
                      {dayAppointments.slice(0, 3).map((item) => {
                        const meta = typeMeta(item.type);
                        return (
                          <div
                            key={item.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCursor(day);
                              setForm(item);
                              setModalOpen(true);
                            }}
                            className={`group flex items-center justify-between rounded-md px-1.5 py-0.5 text-[10px] font-semibold border-l-2 shadow-3xs transition-all hover:opacity-85 ${meta.soft} ${meta.border}`}
                          >
                            <span className="truncate flex-1">
                              {item.time && <span className="opacity-75 font-bold mr-1">{item.time}</span>}
                              {item.title}
                            </span>
                          </div>
                        );
                      })}
                      {dayAppointments.length > 3 && (
                        <div className="text-[9px] font-bold text-blue-600 dark:text-blue-400 pl-1">
                          +{dayAppointments.length - 3} more
                        </div>
                      )}
                    </div>

                    <div className="flex md:hidden items-center justify-center gap-0.5 h-2 overflow-hidden mt-1">
                      {dayAppointments.slice(0, 4).map((item) => (
                        <span key={item.id} className={`w-1.5 h-1.5 rounded-full shrink-0 ${typeMeta(item.type).color}`} />
                      ))}
                      {dayAppointments.length > 4 && (
                        <span className="w-1 h-1 bg-gray-400 dark:bg-gray-500 rounded-full" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-gray-650 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/40 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Icon icon="mdi:calendar-clock" className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>
                Selected Date: <strong className="text-gray-900 dark:text-gray-100">{cursor.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</strong>
                {selectedDayAppointments.length > 0 ? (
                  <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200">
                    {selectedDayAppointments.length} {selectedDayAppointments.length === 1 ? "event" : "events"}
                  </span>
                ) : (
                  <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-650 dark:text-gray-400">
                    No events
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => openNewAppointment(selectedDateKey)}
                className="text-xs font-bold text-gray-700 dark:text-gray-300 hover:text-blue-650 dark:hover:text-blue-400 transition-colors"
              >
                + Add Event
              </button>
              <span className="text-gray-300 dark:text-gray-700 hidden sm:inline">|</span>
              <button
                type="button"
                onClick={() => setView("day")}
                className="text-xs font-bold text-blue-650 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
              >
                Go to Day View
                <Icon icon="mdi:arrow-right" className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {view === "agenda" && (
        <div className="space-y-3">
          {filteredAppointments.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
              <Icon icon="mdi:calendar-blank-outline" className="w-10 h-10 mx-auto mb-3 text-gray-350 dark:text-gray-700" />
              <p className="text-sm font-semibold text-gray-650 dark:text-gray-400">No upcoming appointments</p>
              <p className="text-xs text-gray-450 dark:text-gray-500 mt-1">Adjust your filters or add new appointments.</p>
            </div>
          ) : (
            filteredAppointments
              .slice()
              .sort((a, b) => `${a.date}T${a.time || "99:99"}`.localeCompare(`${b.date}T${b.time || "99:99"}`))
              .map((item) => {
                const meta = typeMeta(item.type);
                return (
                  <div key={item.id} className={`bg-white dark:bg-gray-900 rounded-xl border p-4 hover:shadow-2xs transition-shadow relative group ${meta.soft} ${meta.border} border-l-4`}>
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <p
                            className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate cursor-pointer hover:underline"
                            onClick={() => {
                              setForm(item);
                              setModalOpen(true);
                            }}
                          >
                            {item.title}
                          </p>
                          <span className="text-[10px] font-bold uppercase tracking-wider rounded-md border border-current px-2 py-0.5 leading-none shrink-0 opacity-80">{item.type}</span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 font-semibold flex items-center gap-1.5">
                          <Icon icon="mdi:calendar-range" className="w-3.5 h-3.5 opacity-70" />
                          <span>{item.date}</span>
                          <span className="opacity-40">·</span>
                          <Icon icon="mdi:clock-outline" className="w-3.5 h-3.5 opacity-70" />
                          <span>{item.time || "Any time"}</span>
                          {item.address && (
                            <>
                              <span className="opacity-40">·</span>
                              <Icon icon="mdi:map-marker-outline" className="w-3.5 h-3.5 opacity-70" />
                              <span className="truncate">{item.address}</span>
                            </>
                          )}
                        </p>
                        {(item.contact_name || item.contact_phone) && (
                          <p className="text-xs text-gray-650 dark:text-gray-400 mt-1.5 flex items-center gap-1.5">
                            <Icon icon="mdi:account-outline" className="w-3.5 h-3.5 opacity-70" />
                            <span>{item.contact_name} {item.contact_phone ? `· ${item.contact_phone}` : ""}</span>
                          </p>
                        )}
                        {item.notes && (
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-3 bg-white/70 dark:bg-gray-900/60 border border-gray-200/40 dark:border-gray-800/40 p-2.5 rounded-lg whitespace-pre-wrap leading-relaxed shadow-3xs">
                            {item.notes}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteAppointment(item.id)}
                        className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/80 dark:hover:bg-gray-800 rounded-lg"
                        title="Delete"
                      >
                        <Icon icon="mdi:trash-can-outline" className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <form onSubmit={addAppointment} className="w-full max-w-xl rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-155">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                {form.id ? "Edit Appointment" : "Create New Appointment"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Icon icon="mdi:close" className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-650 dark:text-gray-400 block mb-1">Title</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Smith Showing" className={inputCls} required />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-655 dark:text-gray-400 block mb-1">Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls}>
                  {APPT_TYPES.map((type) => <option key={type.name}>{type.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-650 dark:text-gray-400 block mb-1">Date</label>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls} required />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-650 dark:text-gray-400 block mb-1">Time</label>
                <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-650 dark:text-gray-400 block mb-1">Property Address</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="e.g. 123 Oak Ave, Austin TX" className={inputCls} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-650 dark:text-gray-400 block mb-1">Contact Name</label>
                <input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} placeholder="e.g. Michael Smith" className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-650 dark:text-gray-400 block mb-1">Phone / Email</label>
                <input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} placeholder="e.g. michael@example.com" className={inputCls} />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-650 dark:text-gray-400 block mb-1">Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Gate code, showing notes, documents to bring..." className={inputCls} />
            </div>
            
            <div className="flex gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-lg text-white text-sm font-semibold transition-opacity hover:opacity-90 shadow-sm"
                style={{ backgroundColor: "var(--brand-color, #2563eb)" }}
              >
                {form.id ? "Save Changes" : "Create Event"}
              </button>
              {form.id && (
                <button
                  type="button"
                  onClick={() => {
                    deleteAppointment(form.id);
                    setModalOpen(false);
                  }}
                  className="px-4 py-2.5 rounded-lg border border-red-200 dark:border-red-800 text-red-650 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 text-sm font-semibold transition-colors"
                >
                  Delete
                </button>
              )}
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
