"use client";

import { useChat, type UIMessage } from "@ai-sdk/react";
import { Send, Bot, User, ExternalLink, Database, Zap, RotateCcw } from "lucide-react";
import { useRef, useEffect, useState } from "react";

const suggestedQuestions = [
  "What's your returns policy?",
  "How long does shipping take?",
  "What payment methods do you accept?",
  "Do products come with a warranty?",
];

function getTextFromMessage(msg: UIMessage): string {
  return msg.parts
    .filter((p) => p.type === "text")
    .map((p) => (p as { type: "text"; text: string }).text)
    .join("");
}

export default function ChatUI() {
  const { messages, sendMessage, status, setMessages } = useChat();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ role: "user", parts: [{ type: "text", text: input }] });
    setInput("");
  }

  function handleSuggest(q: string) {
    sendMessage({ role: "user", parts: [{ type: "text", text: q }] });
  }

  return (
    <div className="h-full flex flex-col" style={{ background: "var(--background)" }}>
      {/* Header */}
      <header className="shrink-0 border-b px-4 py-3 flex items-center justify-between" style={{ background: "rgba(7,7,15,0.9)", backdropFilter: "blur(12px)", borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}>
            <Bot size={16} className="text-white" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm leading-none">HomeOffice Co. Support</p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-xs" style={{ color: "#10b981" }}>Online</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: "rgba(139,92,246,0.12)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.2)" }}>
            RAG Demo
          </span>
          <a href="https://github.com/itanvirt/demo-rag-chatbot" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg" style={{ color: "#64748b", border: "1px solid var(--border)" }}>
            <ExternalLink size={11} /> Source
          </a>
        </div>
      </header>

      {/* Pipeline banner */}
      <div className="shrink-0 flex flex-wrap items-center justify-center gap-1.5 px-4 py-2 text-xs overflow-x-auto" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <Database size={11} style={{ color: "#64748b" }} />
        {["User query", "Embed", "Vector search", "Top-k retrieval", "GPT-4o-mini + context", "Streamed response"].map((step, i, arr) => (
          <span key={step} className="flex items-center gap-1 whitespace-nowrap">
            <span className="px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(255,255,255,0.04)", color: "#64748b" }}>{step}</span>
            {i < arr.length - 1 && <span style={{ color: "#1e293b" }}>→</span>}
          </span>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(6,182,212,0.2))", border: "1px solid rgba(139,92,246,0.2)" }}>
              <Bot size={24} style={{ color: "#a78bfa" }} />
            </div>
            <h2 className="font-semibold text-white mb-2">HomeOffice Co. Support</h2>
            <p className="text-sm mb-6 max-w-xs mx-auto" style={{ color: "#475569" }}>
              Powered by RAG — answers grounded in a product knowledge base, not hallucinated.
            </p>
            <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto">
              {suggestedQuestions.map((q) => (
                <button key={q} onClick={() => handleSuggest(q)} className="px-3 py-2 rounded-xl text-xs transition-all hover:border-violet-500/40" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "#94a3b8" }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
              style={msg.role === "user"
                ? { background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.3)" }
                : { background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }
              }>
              {msg.role === "user" ? <User size={13} style={{ color: "#a78bfa" }} /> : <Bot size={13} className="text-white" />}
            </div>
            <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === "user" ? "rounded-tr-sm" : "rounded-tl-sm"}`}
              style={msg.role === "user"
                ? { background: "rgba(124,58,237,0.2)", border: "1px solid rgba(139,92,246,0.25)", color: "#e2e8f0" }
                : { background: "var(--surface)", border: "1px solid var(--border)", color: "#cbd5e1" }
              }>
              {getTextFromMessage(msg).split("\n").map((line, i) => (
                <p key={i} className={i > 0 ? "mt-1" : ""}>{line}</p>
              ))}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}>
              <Bot size={13} className="text-white" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="flex gap-1.5 items-center h-4">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#475569", animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t px-4 py-3" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about returns, shipping, payments..."
            className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
          />
          {messages.length > 0 && (
            <button type="button" onClick={() => setMessages([])} className="p-2.5 rounded-xl" style={{ border: "1px solid var(--border)", color: "#475569" }} title="Clear chat">
              <RotateCcw size={15} />
            </button>
          )}
          <button type="submit" disabled={!input.trim() || isLoading} className="p-2.5 rounded-xl transition-all disabled:opacity-40" style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}>
            <Send size={15} className="text-white" />
          </button>
        </form>
        <p className="text-center mt-2 text-xs" style={{ color: "#1e293b" }}>
          <Zap size={9} className="inline mr-1" />
          RAG demo — answers grounded in product knowledge base ·{" "}
          <a href="https://tanviratuhin.com" style={{ color: "#334155" }}>tanviratuhin.com</a>
        </p>
      </div>
    </div>
  );
}
