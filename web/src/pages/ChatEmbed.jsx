/**
 * Public chat embed page — accessible at /chat/:token
 * Used for iframe embeds on client websites.
 */
import { useParams } from "react-router-dom";
import ChatWidget from "../components/ChatWidget";
import { useEffect, useState } from "react";
import client from "../api/client";

export default function ChatEmbed() {
  const { token } = useParams();
  const [botName, setBotName] = useState("Assistant");
  const [primaryColor, setPrimaryColor] = useState("#2563eb");

  useEffect(() => {
    if (!token) return;
    client
      .get(`/bots/${token}/public`)
      .then((r) => {
        setBotName(r.data.name);
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    document.documentElement.style.setProperty("--brand-color", primaryColor);
  }, [primaryColor]);

  if (!token) return <div className="p-4 text-red-500">No embed token provided.</div>;

  return (
    <div className="min-h-screen bg-transparent">
      <ChatWidget embedToken={token} botName={botName} />
    </div>
  );
}
