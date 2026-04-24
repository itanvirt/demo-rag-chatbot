"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Database, Zap, RotateCcw } from "lucide-react";

type Message = { id: string; role: "user" | "assistant"; content: string };

const suggestedQuestions = [
  "What's your returns policy?",
  "How long does shipping take?",
  "What payment methods do you accept?",
  "Do products come with a warranty?",
];

export default function ChatUI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    if (!text.trim() || streaming) return;
    setInput("");

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    const assistantId = (Date.now() + 1).toString();
    const assistantMsg: Message = { id: assistantId, role: "assistant", content: "" };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setStreaming(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
        }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) throw new Error("Request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, content: accumulated } : m)
        );
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, content: "Sorry, something went wrong. Please try again." } : m)
        );
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  function renderContent(text: string) {
    return text.split("\n").map((line, i) => {
      const bold = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      const bullet = bold.startsWith("•") ? `<span style="margin-right:6px">•</span>${bold.slice(1).trim()}` : bold;
      return <p key={i} className={i > 0 ? "mt-1" : ""} dangerouslySetInnerHTML={{ __html: bullet }} />;
    });
  }

  return (
    <div className="h-screen flex flex-col" style={{ background: "var(--background)" }}>
      {/* Header */}
      <header className="shrink-0 border-b px-4 py-3 flex items-center justify-between" style={{ background: "rgba(7,7,15,0.95)", borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}>
            <Bot size={16} className="text-white" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm leading-none">HomeOffice Co. Support</p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-xs" style={{ color: "#10b981" }}>Online · RAG Demo</span>
            </div>
          </div>
        </div>
      </header>

      {/* Pipeline */}
      <div className="shrink-0 flex flex-wrap items-center justify-center gap-1 px-4 py-2 text-xs overflow-x-auto" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <Database size={10} style={{ color: "#475569" }} />
        {["Query", "Retrieve context", "Inject into prompt", "GPT-4o-mini", "Stream response"].map((s, i, a) => (
          <span key={s} className="flex items-center gap-1 whitespace-nowrap">
            <span className="px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.04)", color: "#475569" }}>{s}</span>
            {i < a.length - 1 && <span style={{ color: "#1e293b" }}>→</span>}
          </span>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(6,182,212,0.2))", border: "1px solid rgba(139,92,246,0.2)" }}>
              <Bot size={24} style={{ color: "#a78bfa" }} />
            </div>
            <h2 className="font-semibold text-white mb-2">HomeOffice Co. Support</h2>
            <p className="text-sm mb-6 max-w-xs mx-auto" style={{ color: "#475569" }}>
              RAG demo — answers grounded in a product knowledge base, not hallucinated. Try one:
            </p>
            <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto">
              {suggestedQuestions.map(q => (
                <button key={q} onClick={() => send(q)}
                  className="px-3 py-2 rounded-xl text-xs transition-all"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "#94a3b8" }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
              style={msg.role === "user"
                ? { background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.3)" }
                : { background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}>
              {msg.role === "user"
                ? <User size={13} style={{ color: "#a78bfa" }} />
                : <Bot size={13} className="text-white" />}
            </div>
            <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === "user" ? "rounded-tr-sm" : "rounded-tl-sm"}`}
              style={msg.role === "user"
                ? { background: "rgba(124,58,237,0.2)", border: "1px solid rgba(139,92,246,0.25)", color: "#e2e8f0" }
                : { background: "var(--surface)", border: "1px solid var(--border)", color: "#cbd5e1" }}>
              {msg.content
                ? renderContent(msg.content)
                : <span className="animate-pulse" style={{ color: "#475569" }}>▍</span>}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t px-4 py-3" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about returns, shipping, payments…"
            disabled={streaming}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none disabled:opacity-50"
            style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
          />
          {messages.length > 0 && !streaming && (
            <button type="button" onClick={() => setMessages([])}
              className="p-2.5 rounded-xl"
              style={{ border: "1px solid var(--border)", color: "#475569" }}>
              <RotateCcw size={15} />
            </button>
          )}
          <button type="submit" disabled={!input.trim() || streaming}
            className="p-2.5 rounded-xl disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}>
            <Send size={15} className="text-white" />
          </button>
        </form>
        <p className="text-center mt-2 text-xs" style={{ color: "#1e293b" }}>
          <Zap size={9} className="inline mr-1" />
          Demo mode active · <a href="https://tanviratuhin.com" style={{ color: "#334155" }}>tanviratuhin.com</a>
        </p>
      </div>
    </div>
  );
}
