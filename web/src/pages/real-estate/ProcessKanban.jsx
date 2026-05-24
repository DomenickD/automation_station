import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";

const STORAGE_KEY = "automation_station_re_process_kanban";
const BUYER_COLUMNS = ["Lead / Inquiry", "Consultation", "Pre-Approval", "Showing Homes", "Offer", "Under Contract", "Inspection / Appraisal", "Clear to Close", "Closed"];
const SELLER_COLUMNS = ["Lead / Inquiry", "Listing Prep", "Pricing / CMA", "Active Listing", "Showing Feedback", "Offer Review", "Under Contract", "Inspection / Appraisal", "Closed"];

function loadTickets() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function blankTicket(processType) {
  return {
    title: "",
    address: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    notes: "",
    process_type: processType,
  };
}

export default function ProcessKanban() {
  const [mode, setMode] = useState("buyer");
  const [tickets, setTickets] = useState(loadTickets);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(blankTicket("buyer"));
  const columns = mode === "buyer" ? BUYER_COLUMNS : SELLER_COLUMNS;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
  }, [tickets]);

  const visibleTickets = useMemo(() => tickets.filter((ticket) => ticket.process_type === mode), [tickets, mode]);

  function openNewTicket() {
    setEditingId(null);
    setForm(blankTicket(mode));
    setModalOpen(true);
  }

  function openEditTicket(ticket) {
    setEditingId(ticket.id);
    setForm({
      title: ticket.title || "",
      address: ticket.address || "",
      contact_name: ticket.contact_name || "",
      contact_email: ticket.contact_email || "",
      contact_phone: ticket.contact_phone || "",
      notes: ticket.notes || "",
      process_type: ticket.process_type || mode,
    });
    setModalOpen(true);
  }

  function saveTicket(e) {
    e.preventDefault();
    const title = form.title.trim() || form.address.trim();
    if (!title) return;
    const status = form.process_type === "buyer" ? BUYER_COLUMNS[0] : SELLER_COLUMNS[0];

    if (editingId) {
      setTickets((prev) => prev.map((ticket) => (ticket.id === editingId ? { ...ticket, ...form, title } : ticket)));
    } else {
      setTickets((prev) => [...prev, { ...form, id: crypto.randomUUID(), title, status, created_at: new Date().toISOString() }]);
    }

    setModalOpen(false);
    setEditingId(null);
  }

  function moveTicket(ticketId, status) {
    setTickets((prev) => prev.map((ticket) => (ticket.id === ticketId ? { ...ticket, status } : ticket)));
  }

  function deleteTicket(ticketId) {
    setTickets((prev) => prev.filter((ticket) => ticket.id !== ticketId));
  }

  const inputCls = "w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="min-h-[calc(100vh-3rem)]">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Buying & Selling Process Kanban</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Move each home or client through the current buyer or seller workflow.
          </p>
        </div>
        <button
          type="button"
          onClick={openNewTicket}
          className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: "var(--brand-color, #2563eb)" }}
        >
          <Icon icon="mdi:plus" className="w-4 h-4" />
          Add New Home
        </button>
      </div>

      <fieldset className="mb-5 flex gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3">
        <legend className="sr-only">Pipeline view</legend>
        {["buyer", "seller"].map((item) => (
          <label key={item} className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium capitalize cursor-pointer ${mode === item ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" : "border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300"}`}>
            <input
              type="radio"
              name="kanban-mode"
              value={item}
              checked={mode === item}
              onChange={(e) => setMode(e.target.value)}
              className="accent-blue-600"
            />
            {item} View
          </label>
        ))}
      </fieldset>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-3 min-w-max">
          {columns.map((column) => {
            const items = visibleTickets.filter((ticket) => ticket.status === column);
            return (
              <section key={column} className="w-72 shrink-0 bg-gray-100 dark:bg-gray-900/70 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <h2 className="text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide">{column}</h2>
                  <span className="text-xs text-gray-500">{items.length}</span>
                </div>
                <div className="p-2 space-y-2 min-h-[26rem]">
                  {items.length === 0 && <p className="text-xs text-gray-400 px-2 py-4">No homes in this step.</p>}
                  {items.map((ticket) => (
                    <article key={ticket.id} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{ticket.title}</p>
                          {ticket.address && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{ticket.address}</p>}
                        </div>
                        <button type="button" onClick={() => deleteTicket(ticket.id)} className="text-gray-400 hover:text-red-500">
                          <Icon icon="mdi:close" className="w-4 h-4" />
                        </button>
                      </div>
                      {(ticket.contact_name || ticket.contact_email || ticket.contact_phone) && (
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <p>{ticket.contact_name || "Contact"}</p>
                          <p className="truncate">{[ticket.contact_email, ticket.contact_phone].filter(Boolean).join(" · ")}</p>
                        </div>
                      )}
                      {ticket.notes && <p className="mt-2 text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap line-clamp-4">{ticket.notes}</p>}
                      <div className="mt-3 flex gap-2">
                        <select value={ticket.status} onChange={(e) => moveTicket(ticket.id, e.target.value)} className="flex-1 rounded-md border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 px-2 py-1 text-xs">
                          {columns.map((option) => <option key={option}>{option}</option>)}
                        </select>
                        <button type="button" onClick={() => openEditTicket(ticket)} className="px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                          Edit
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={saveTicket} className="w-full max-w-xl rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{editingId ? "Edit Home Ticket" : "Add New Home"}</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                <Icon icon="mdi:close" className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Ticket Name</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Smith buyer search" className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Process</label>
                <select value={form.process_type} onChange={(e) => setForm({ ...form, process_type: e.target.value })} className={inputCls}>
                  <option value="buyer">Buyer</option>
                  <option value="seller">Seller</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Listing / Search Address</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Main St or target neighborhood" className={inputCls} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Contact Name</label>
                <input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Email</label>
                <input value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Phone</label>
                <input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Budget, motivation, showing feedback, blockers, next task..." className={inputCls} />
            </div>
            <button type="submit" className="w-full py-2.5 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: "var(--brand-color, #2563eb)" }}>
              {editingId ? "Save Ticket" : "Add Home"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
