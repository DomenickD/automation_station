import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Icon } from "@iconify/react";
import client from "../../api/client";

export default function ContractView() {
  const { id } = useParams();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [signingParty, setSigningParty] = useState(null);
  const [sigType, setSigType] = useState("draw"); // "draw" | "type"
  const [typedSig, setTypedSig] = useState("");
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSignedSubmitted, setIsSignedSubmitted] = useState(false);

  useEffect(() => {
    fetchContract();
  }, [id]);

  async function fetchContract() {
    setLoading(true);
    try {
      const res = await client.get(`/contracts/${id}`);
      setContract(res.data);
      const firstUnsigned = res.data.parties.find((p) => !p.signed);
      setSigningParty(firstUnsigned || null);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load contract");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (sigType === "draw" && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      ctx.strokeStyle = "#1e3a8a"; // Blue ink
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
    }
  }, [sigType, signingParty]);

  function startDrawing(e) {
    if (sigType !== "draw" || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    
    ctx.beginPath();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    ctx.moveTo(x, y);
    setIsDrawing(true);
  }

  function draw(e) {
    if (!isDrawing || sigType !== "draw" || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function stopDrawing() {
    setIsDrawing(false);
  }

  function clearCanvas() {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  async function handleSignSubmit(e) {
    e.preventDefault();
    if (!signingParty) return;

    let signature_data = "";
    if (sigType === "draw") {
      if (!canvasRef.current) return;
      signature_data = canvasRef.current.toDataURL("image/png");
    } else {
      if (!typedSig.trim()) {
        alert("Please type your signature");
        return;
      }
      signature_data = typedSig.trim();
    }

    try {
      setIsSignedSubmitted(true);
      const res = await client.post(`/contracts/${id}/sign`, {
        role: signingParty.role,
        name: signingParty.name,
        signature_data: signature_data,
      });
      setContract(res.data);
      const nextUnsigned = res.data.parties.find((p) => !p.signed);
      setSigningParty(nextUnsigned || null);
      setTypedSig("");
      clearCanvas();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to submit signature");
    } finally {
      setIsSignedSubmitted(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Icon icon="svg-spinners:ring-resize" className="h-10 w-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-500 font-medium mb-4">{error || "Contract not found"}</div>
        <Link to="/re/contracts" className="text-blue-600 hover:underline">
          Back to Contracts List
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link to="/re/contracts" className="text-xs text-gray-500 dark:text-gray-400 hover:underline">
              Contracts
            </Link>
            <Icon icon="lucide:chevron-right" className="h-3 w-3 text-gray-400" />
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
              {contract.contract_type === "listing_agreement" ? "Listing Agreement" : "Buyer Broker Agreement"}
            </span>
          </div>
          <h1 className="text-xl font-bold text-gray-950 dark:text-gray-50">{contract.title}</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Created on {new Date(contract.created_at).toLocaleDateString()} · ID: {contract.id.slice(0, 8)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              contract.status === "signed"
                ? "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400"
                : "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                contract.status === "signed" ? "bg-green-600" : "bg-blue-600"
              }`}
            />
            {contract.status === "signed" ? "Fully Executed" : "Awaiting Signatures"}
          </span>

          {contract.pdf_url && (
            <a
              href={`${client.defaults.baseURL}${contract.pdf_url}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow transition-colors"
            >
              <Icon icon="lucide:download" className="h-4 w-4" />
              Download Branded PDF
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-6 md:p-8 space-y-8 select-text max-h-[75vh] overflow-y-auto font-sans">
            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold text-gray-950 dark:text-gray-50 uppercase tracking-wide">
                {contract.contract_type === "listing_agreement" ? "Exclusive Right of Sale Listing Agreement" : "Buyer Broker Agreement"}
              </h2>
              <div className="h-0.5 w-20 bg-blue-600 mx-auto my-2" />
            </div>

            <div className="space-y-6 text-gray-800 dark:text-gray-200 leading-relaxed text-sm">
              {Object.entries(contract.generated_text).map(([sectionTitle, sectionBody]) => (
                <div key={sectionTitle} className="space-y-2">
                  <h3 className="font-bold text-gray-950 dark:text-gray-50 text-sm font-sans border-b border-gray-100 dark:border-gray-800 pb-1 uppercase tracking-wider">
                    {sectionTitle}
                  </h3>
                  <div className="whitespace-pre-line text-justify pl-2">
                    {sectionBody}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-4 shadow-sm">
            <h3 className="text-xs font-bold text-gray-950 dark:text-gray-50 uppercase tracking-wider">
              Signing Parties
            </h3>
            
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {contract.parties.map((p, idx) => (
                <div key={idx} className="py-3 flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-950 dark:text-gray-50">{p.name || "N/A"}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{p.role}</p>
                  </div>
                  <div>
                    {p.signed ? (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-semibold bg-green-50 dark:bg-green-950/20 px-2.5 py-1 rounded-full">
                        <Icon icon="lucide:check-circle" className="h-3.5 w-3.5" />
                        Signed
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-yellow-600 font-semibold bg-yellow-50 dark:bg-yellow-950/20 px-2.5 py-1 rounded-full">
                        <Icon icon="lucide:clock" className="h-3.5 w-3.5" />
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {signingParty ? (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-4 shadow-sm">
              <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Signature Capture
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Signing as <strong className="text-blue-600 dark:text-blue-400">{signingParty.name}</strong> ({signingParty.role})
                </p>
              </div>

              <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => setSigType("draw")}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    sigType === "draw"
                      ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
                  }`}
                >
                  Draw Signature
                </button>
                <button
                  type="button"
                  onClick={() => setSigType("type")}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    sigType === "type"
                      ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
                  }`}
                >
                  Type Signature
                </button>
              </div>

              <form onSubmit={handleSignSubmit} className="space-y-4">
                {sigType === "draw" ? (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase">
                      Draw with pointer / touch
                    </label>
                    <div className="border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-950">
                      <canvas
                        ref={canvasRef}
                        width={300}
                        height={120}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="w-full h-[120px] cursor-crosshair touch-none bg-white dark:bg-gray-900"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="text-xs text-gray-500 dark:text-gray-400 font-semibold hover:underline"
                    >
                      Clear Drawing Pad
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase">
                      Type Your Legal Name
                    </label>
                    <input
                      type="text"
                      value={typedSig}
                      onChange={(e) => setTypedSig(e.target.value)}
                      placeholder={signingParty.name}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {typedSig && (
                      <div className="p-3 border border-gray-200 dark:border-gray-800 rounded-lg text-center bg-gray-50 dark:bg-gray-950">
                        <p className="text-xs text-gray-400 mb-1">Preview Signature</p>
                        <p className="font-serif italic text-2xl text-blue-900 dark:text-blue-300 tracking-wider">
                          {typedSig}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSignedSubmitted}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm rounded-lg shadow transition-colors flex items-center justify-center gap-2"
                >
                  {isSignedSubmitted ? (
                    <>
                      <Icon icon="svg-spinners:ring-resize" className="h-4 w-4 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <Icon icon="lucide:edit-3" className="h-4 w-4" />
                      Apply Signature
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-xl p-5 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center text-green-600 dark:text-green-400 mx-auto">
                <Icon icon="lucide:check-circle" className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-50">Contract Fully Executed</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  All required parties have electronically signed this agreement.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
