import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import client from "../../api/client";

export default function Leads() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    setLoadingLeads(true);
    setError(null);
    try {
      const res = await client.get("/chat/leads");
      setLeads(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load leads.");
    } finally {
      setLoadingLeads(false);
    }
  }

  async function handleSelectLead(lead) {
    setSelectedLead(lead);
    setLoadingTranscript(true);
    setTranscript(null);
    try {
      const res = await client.get(`/chat/sessions/${lead.id}`);
      setTranscript(res.data);
    } catch (err) {
      alert("Failed to load transcript.");
    } finally {
      setLoadingTranscript(false);
    }
  }

  function handleDraftFollowUp() {
    if (!selectedLead || !transcript) return;
    
    // Extract key questions or messages from the user to help pre-fill the follow-up
    const userMessages = transcript.messages
      .filter((m) => m.role === "user")
      .map((m) => m.content);
    
    const lastQuestion = userMessages[userMessages.length - 1] || "inquired about listing information";
    
    navigate("/re/email", {
      state: {
        client_name: selectedLead.visitor_name || "Valued Customer",
        email_type: "buyer_intro",
        context: `Client visited the listing chatbot. Name: ${selectedLead.visitor_name}. Contact: ${selectedLead.visitor_email || selectedLead.visitor_phone}. Last question asked: "${lastQuestion}". Provide a helpful follow-up response addressing their inquiry.`,
      },
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Leads & Chat Transcripts</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Review visitor contact information and complete conversation transcripts captured by your listing chatbots.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-xl text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leads Table/List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
            {loadingLeads ? (
              <div className="flex justify-center items-center py-20">
                <Icon icon="svg-spinners:ring-resize" className="h-10 w-10 text-blue-600 animate-spin" />
              </div>
            ) : leads.length === 0 ? (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                <Icon icon="lucide:users" className="h-12 w-12 mx-auto mb-3 opacity-40 text-blue-600" />
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">No leads captured yet</h3>
                <p className="text-sm mt-1">When chatbot visitors share their name and contact details, they will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <th className="px-6 py-4">Visitor</th>
                      <th className="px-6 py-4">Contact Info</th>
                      <th className="px-6 py-4">Messages</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm text-gray-700 dark:text-gray-300">
                    {leads.map((l) => (
                      <tr
                        key={l.id}
                        onClick={() => handleSelectLead(l)}
                        className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-950/60 transition-colors ${
                          selectedLead?.id === l.id ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                        }`}
                      >
                        <td className="px-6 py-4 font-semibold text-gray-950 dark:text-gray-50">
                          {l.visitor_name || "Anonymous Visitor"}
                        </td>
                        <td className="px-6 py-4 space-y-0.5">
                          {l.visitor_email && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <Icon icon="lucide:mail" className="text-gray-400" />
                              {l.visitor_email}
                            </div>
                          )}
                          {l.visitor_phone && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                              <Icon icon="lucide:phone" className="text-gray-400" />
                              {l.visitor_phone}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                          {l.message_count} messages
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-400">
                          {new Date(l.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectLead(l);
                            }}
                            className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1 ml-auto"
                          >
                            <Icon icon="lucide:message-square" className="h-4 w-4" />
                            Transcript
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Transcript Viewer / Side panel */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm min-h-[400px] flex flex-col">
            {selectedLead ? (
              <>
                <div className="border-b border-gray-100 dark:border-gray-800 pb-3 mb-4 flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-bold text-gray-950 dark:text-gray-50">
                      {selectedLead.visitor_name || "Anonymous Visitor"}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Session ID: {selectedLead.id.slice(0, 8)}
                    </p>
                  </div>
                  <button
                    onClick={handleDraftFollowUp}
                    disabled={loadingTranscript || !transcript}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-xs font-semibold shadow transition-colors"
                  >
                    <Icon icon="lucide:send" className="h-3.5 w-3.5" />
                    Draft Follow-Up
                  </button>
                </div>

                {loadingTranscript ? (
                  <div className="flex-1 flex justify-center items-center">
                    <Icon icon="svg-spinners:ring-resize" className="h-8 w-8 text-blue-600 animate-spin" />
                  </div>
                ) : transcript && transcript.messages.length > 0 ? (
                  <div className="flex-1 max-h-[50vh] overflow-y-auto space-y-3 pr-1 text-xs">
                    {transcript.messages.map((m, idx) => (
                      <div
                        key={idx}
                        className={`flex flex-col max-w-[85%] rounded-xl p-3 ${
                          m.role === "user"
                            ? "bg-blue-600 text-white ml-auto"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-950 dark:text-gray-50 mr-auto"
                        }`}
                      >
                        <span className="font-semibold mb-1">
                          {m.role === "user" ? (selectedLead.visitor_name || "Visitor") : "Listing Agent Bot"}
                        </span>
                        <p className="whitespace-pre-line break-words">{m.content}</p>
                        {m.timestamp && (
                          <span
                            className={`text-[9px] mt-1 text-right block ${
                              m.role === "user" ? "text-blue-200" : "text-gray-400"
                            }`}
                          >
                            {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-400 text-xs text-center">
                    No messages in this conversation.
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex flex-col justify-center items-center text-gray-400 text-sm text-center p-6">
                <Icon icon="lucide:message-square" className="h-10 w-10 text-gray-300 dark:text-gray-700 mb-3" />
                <p>Select a lead from the list to view their full chat history and draft a follow-up email.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
