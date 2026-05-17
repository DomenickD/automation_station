import { useState, useRef, useEffect } from "react";
import client from "../api/client";

export default function ChatWidget({ embedToken, botName = "Assistant" }) {
  const [open, setOpen] = useState(false);
  const [sessionToken, setSessionToken] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [visitorEmail, setVisitorEmail] = useState("");
  const [emailPrompt, setEmailPrompt] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function startSession() {
    try {
      const res = await client.post("/chat/session", { embed_token: embedToken });
      setSessionToken(res.data.session_token);
      setMessages([
        {
          role: "assistant",
          content: `Hi! I'm ${res.data.bot_name}. How can I help you today?`,
        },
      ]);
    } catch {
      setMessages([{ role: "assistant", content: "Sorry, I'm unavailable right now." }]);
    }
  }

  function handleOpen() {
    setOpen(true);
    if (!sessionToken) startSession();
  }

  async function sendMessage() {
    if (!input.trim() || !sessionToken) return;
    const text = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const res = await client.post("/chat/message", {
        session_token: sessionToken,
        message: text,
        visitor_email: visitorEmail || undefined,
      });
      setMessages((prev) => [...prev, { role: "assistant", content: res.data.reply }]);

      // After 3 messages, prompt for email if not captured
      if (messages.length >= 4 && !visitorEmail && !emailPrompt) {
        setEmailPrompt(true);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function submitEmail() {
    if (!visitorEmail) return;
    setEmailPrompt(false);
    await client.post("/chat/message", {
      session_token: sessionToken,
      message: `My email is ${visitorEmail}`,
      visitor_email: visitorEmail,
    });
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open ? (
        <div className="w-80 h-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col">
          <div
            className="px-4 py-3 rounded-t-2xl flex items-center justify-between"
            style={{ backgroundColor: "var(--brand-color, #2563eb)" }}
          >
            <span className="text-white font-semibold text-sm">{botName}</span>
            <button onClick={() => setOpen(false)} className="text-white hover:opacity-70 text-lg leading-none">
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "text-white rounded-br-sm"
                      : "bg-gray-100 text-gray-800 rounded-bl-sm"
                  }`}
                  style={m.role === "user" ? { backgroundColor: "var(--brand-color, #2563eb)" } : {}}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl px-3 py-2 text-sm text-gray-500">
                  Typing...
                </div>
              </div>
            )}
            {emailPrompt && (
              <div className="bg-blue-50 rounded-xl p-2">
                <p className="text-xs text-gray-700 mb-1">Want us to follow up? Leave your email:</p>
                <div className="flex gap-1">
                  <input
                    value={visitorEmail}
                    onChange={(e) => setVisitorEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1 text-xs border border-gray-300 rounded px-2 py-1"
                  />
                  <button
                    onClick={submitEmail}
                    className="text-xs text-white px-2 py-1 rounded"
                    style={{ backgroundColor: "var(--brand-color, #2563eb)" }}
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="p-2 border-t border-gray-100 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="px-3 py-2 rounded-xl text-white text-sm disabled:opacity-50"
              style={{ backgroundColor: "var(--brand-color, #2563eb)" }}
            >
              →
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={handleOpen}
          className="w-14 h-14 rounded-full text-white text-2xl shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
          style={{ backgroundColor: "var(--brand-color, #2563eb)" }}
        >
          💬
        </button>
      )}
    </div>
  );
}
