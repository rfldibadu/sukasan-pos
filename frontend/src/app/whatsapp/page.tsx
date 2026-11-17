"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bot,
  CheckCircle2,
  Copy,
  ExternalLink,
  MessageCircle,
  RefreshCw,
  Send,
  Sparkles,
  Terminal,
  Truck,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useWhatsAppAdmin } from "./_internal/hooks/use-whatsapp";

export default function WhatsAppDeliveryPage() {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );
  const [simPhone, setSimPhone] = useState("6281234567890");
  const [simName, setSimName] = useState("Raka (Test WA)");
  const [simInput, setSimInput] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const {
    status,
    sessions,
    messages,
    isLoadingSessions,
    isSending,
    refreshStatus,
    refreshSessions,
    sendSimulatedMessage,
  } = useWhatsAppAdmin(selectedSessionId);

  useEffect(() => {
    if (!selectedSessionId && sessions.length > 0) {
      setSelectedSessionId(sessions[0].id);
    }
  }, [sessions, selectedSessionId]);

  const activeSession =
    sessions.find((s) => s.id === selectedSessionId) || null;

  const showToast = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3200);
  };

  const openwaCommand =
    "npx @open-wa/wa-automate --port 8080 --webhook http://localhost:8000/api/whatsapp/webhook";

  const handleCopyCommand = () => {
    navigator.clipboard?.writeText(openwaCommand);
    showToast("OpenWA command copied to clipboard!");
  };

  const handleSendSim = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = simInput.trim();
    if (!trimmed || isSending) return;
    setSimInput("");
    try {
      const res = await sendSimulatedMessage(
        simPhone.trim() || "6281234567890",
        simName.trim() || "Pelanggan WA",
        trimmed
      );
      setSelectedSessionId(res.session.id);
      if (res.order_id) {
        showToast(
          `Order #${res.daily_order_number || ""} created in POS queue!`
        );
      }
    } catch {
      showToast("Failed to process simulated WhatsApp message.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-5 pb-24 md:pb-10 space-y-5">
      {notice && (
        <div className="fixed bottom-20 md:bottom-6 right-4 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg">
          {notice}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900">
              WhatsApp AI &amp; Delivery Hub
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              OpenWA + Gemini Free Tier
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Receive WhatsApp orders parsed by Gemini AI and dispatch via GoSend
            / GrabExpress.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              refreshStatus();
              refreshSessions();
              showToast("Refreshed OpenWA & sessions!");
            }}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <Link
            href="/orders"
            className="px-3 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <span>Open Orders Queue</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Integration Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 inline-flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              OpenWA Bridge
            </span>
            {status?.openwa_connected ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Wifi className="w-3 h-3" /> Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                <WifiOff className="w-3 h-3" /> Simulator Ready
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            {status?.detail || "Checking OpenWA Easy API..."}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 inline-flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-600" />
              Gemini AI Parser
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {status?.gemini_configured
                ? status.gemini_model
                : "Fallback Mode"}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            {status?.gemini_configured
              ? "Connected to Google AI Studio free tier."
              : "Set GEMINI_API_KEY in backend/.env for full NLP; rule-based fallback active."}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 inline-flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-sky-600" />
              GrabExpress &amp; GoSend
            </span>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
              {status?.delivery_mode || "sandbox"}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Quotes &amp; instant courier booking integrated with Orders queue.
          </p>
        </div>
      </div>

      {/* OpenWA Quick Launch Banner */}
      <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-bold flex items-center gap-1.5 text-emerald-400">
            <Terminal className="w-4 h-4" /> Connect Real WhatsApp via OpenWA
            (Free, QR Scan)
          </p>
          <code className="text-[11px] text-slate-300 font-mono block break-all">
            {openwaCommand}
          </code>
        </div>
        <button
          type="button"
          onClick={handleCopyCommand}
          className="shrink-0 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 border border-slate-700 cursor-pointer"
        >
          <Copy className="w-3.5 h-3.5" /> Copy Command
        </button>
      </div>

      {/* Main Workspace: Sessions List + Chat Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Customer Sessions */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Active WhatsApp Sessions ({sessions.length})
          </h2>

          {isLoadingSessions ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              Loading sessions...
            </p>
          ) : sessions.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              No WhatsApp sessions yet. Send a test message on the right to
              start!
            </p>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {sessions.map((s) => {
                const isSelected = s.id === selectedSessionId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSelectedSessionId(s.id);
                      setSimPhone(s.phone_number);
                      if (s.customer_name) setSimName(s.customer_name);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "border-amber-600 bg-amber-50/60"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {s.customer_name || s.phone_number}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {s.state}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                      {s.phone_number}
                    </p>
                    {s.draft_cart.length > 0 && (
                      <p className="text-[11px] text-amber-800 mt-1 font-medium">
                        Cart: {s.draft_cart.map((i) => `${i.quantity}x ${i.product_name}`).join(", ")}
                      </p>
                    )}
                    {s.last_order_id && (
                      <p className="text-[10px] text-emerald-700 mt-1 inline-flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3 h-3" /> Order placed in POS
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Chat Simulator & Message Log */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 flex flex-col h-[520px] overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 bg-slate-50">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-900">
                WhatsApp AI Chat Simulator
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={simPhone}
                onChange={(e) => setSimPhone(e.target.value)}
                placeholder="Phone"
                className="px-2.5 py-1 text-[11px] font-mono border border-slate-200 rounded-lg bg-white w-32"
              />
              <input
                type="text"
                value={simName}
                onChange={(e) => setSimName(e.target.value)}
                placeholder="Customer Name"
                className="px-2.5 py-1 text-[11px] border border-slate-200 rounded-lg bg-white w-32"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
            {!activeSession || messages.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <p className="text-xs font-semibold text-slate-600">
                  Try sending a simulated customer message below!
                </p>
                <p className="text-[11px] text-slate-400">
                  Example: &ldquo;Halo mau pesan 2 Kopi Susu less ice, kirim ke Jl.
                  Teuku Umar No. 12&rdquo;
                </p>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${
                    m.direction === "inbound" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs whitespace-pre-wrap shadow-2xs ${
                      m.direction === "inbound"
                        ? "bg-emerald-600 text-white rounded-br-xs"
                        : "bg-white text-slate-800 border border-slate-200 rounded-bl-xs"
                    }`}
                  >
                    {m.message_text}
                  </div>
                </div>
              ))
            )}
          </div>

          <form
            onSubmit={handleSendSim}
            className="p-3 border-t border-slate-200 bg-white flex items-center gap-2"
          >
            <input
              type="text"
              value={simInput}
              onChange={(e) => setSimInput(e.target.value)}
              placeholder="Type a WhatsApp message as customer..."
              className="flex-1 px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-amber-600"
            />
            <button
              type="submit"
              disabled={isSending || !simInput.trim()}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSending ? "Thinking..." : "Send"}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
