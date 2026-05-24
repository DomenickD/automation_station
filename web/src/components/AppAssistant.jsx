import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { useLocation } from "react-router-dom";
import client from "../api/client";
import { REAL_ESTATE_MODULES, CONTRACT_MODULES } from "../pages/real-estate/moduleConfigs";

const PAGE_CONTEXT = {
  "/dashboard": "Main dashboard with shortcuts to core tools, recent documents, and usage.",
  "/re/saved-listings": "Saved listing records used to autofill real estate tools.",
  "/re/listing": "Listing description generator for MLS copy, marketing copy, social captions, and email teasers.",
  "/re/email": "Real estate email drafter for buyer, seller, and prospect communication.",
  "/re/cma": "CMA narrative generator with comparable sales support.",
  "/re/bots": "Property chatbot manager for creating listing chatbots and copying embed snippets.",
  "/re/leads": "Chatbot leads and transcript review page.",
  "/re/calendar": "Mobile appointment tracking page for showings, inspections, consultations, closings, and follow-ups.",
  "/re/pipeline": "Kanban board for tracking buyer and seller process steps, listing tickets, notes, and contact details.",
  "/re/contracts": "Contracts list for listing and buyer broker agreements.",
  "/re/contracts/new": "New contract builder for real estate agreements.",
};

function moduleContext(path) {
  const module = [...REAL_ESTATE_MODULES, ...CONTRACT_MODULES].find((item) => item.path === path);
  if (!module) return null;
  return `${module.label}: ${module.description}`;
}

function pageTitle(path) {
  if (PAGE_CONTEXT[path]) {
    const segment = path.split("/").filter(Boolean).pop() || "dashboard";
    return segment.replaceAll("-", " ");
  }
  const module = [...REAL_ESTATE_MODULES, ...CONTRACT_MODULES].find((item) => item.path === path);
  return module?.label || path;
}

export default function AppAssistant() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Ask me about this page or where to go next." },
  ]);
  const bottomRef = useRef(null);

  const context = useMemo(() => {
    const pathname = location.pathname;
    return {
      path: pathname,
      title: pageTitle(pathname),
      description: PAGE_CONTEXT[pathname] || moduleContext(pathname) || "General app page.",
    };
  }, [location.pathname]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await client.post("/chat/app-assistant", {
        message: text,
        path: context.path,
        page_title: context.title,
        page_context: context.description,
        history: messages.slice(-8),
      });
      setMessages((prev) => [...prev, { role: "assistant", content: res.data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I could not reach the assistant right now. Try again in a moment." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open ? (
        <div className="w-[min(22rem,calc(100vw-2rem))] h-[30rem] max-h-[calc(100vh-2rem)] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
          <div
            className="px-4 py-3 flex items-center justify-between"
            style={{ backgroundColor: "var(--brand-color, #2563eb)" }}
          >
            <div className="min-w-0 flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-white/18 border border-white/30 flex items-center justify-center shrink-0">
                <Icon icon="mdi:compass-rose" className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm">Guidepost</p>
                <p className="text-white/80 text-xs truncate">{context.title}</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white hover:opacity-80">
              <Icon icon="mdi:close" className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                    message.role === "user"
                      ? "text-white rounded-br-sm"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-sm"
                  }`}
                  style={message.role === "user" ? { backgroundColor: "var(--brand-color, #2563eb)" } : {}}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-3 py-2 text-sm text-gray-500 dark:text-gray-300">
                  Thinking...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="p-2 border-t border-gray-100 dark:border-gray-700 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask about this page..."
              className="flex-1 text-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="px-3 py-2 rounded-xl text-white text-sm disabled:opacity-50"
              style={{ backgroundColor: "var(--brand-color, #2563eb)" }}
            >
              <Icon icon="mdi:send" className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="hidden sm:block rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-1.5 shadow-lg">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">Ask Guidepost</span>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="w-14 h-14 rounded-full text-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
            style={{ backgroundColor: "var(--brand-color, #2563eb)" }}
            aria-label="Open Guidepost assistant"
          >
            <Icon icon="mdi:compass-rose" className="w-7 h-7" />
          </button>
        </div>
      )}
    </div>
  );
}
