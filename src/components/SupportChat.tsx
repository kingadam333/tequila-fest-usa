"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Bot, Headset } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function SupportChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hey! 🥃 I'm your Tequila Loving Support Friend. I can help you find your tickets, reset your password, or answer questions about the event. What can I help you with?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.reply || "Something went wrong." }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "I'm having trouble connecting. Please try again or email help@mail.tequilafestusa.com." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Side tab */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="tab"
            initial={{ x: 12, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 12, opacity: 0 }}
            whileHover={{ x: -3 }}
            onClick={() => setOpen(true)}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-50 bg-yellow-500 hover:bg-yellow-400 text-black rounded-l-xl shadow-lg flex flex-col items-center gap-2 py-4 px-2.5 transition-colors cursor-pointer"
            aria-label="Open Instant Customer Service"
          >
            <Headset size={18} />
            <span
              className="font-bold text-xs tracking-wide"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              Instant Customer Service
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-50 bg-black/50"
          />
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed top-0 right-0 z-50 h-full w-full max-w-md"
          >
            <div className="bg-[#0f0700] border-l border-white/15 shadow-2xl h-full flex flex-col">

              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-black/40 border-b border-white/10 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
                    <Bot size={15} className="text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">Instant Customer Service</p>
                    <p className="text-green-400 text-[10px] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                      Online now
                    </p>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} className="text-white/30 hover:text-white/70 transition-colors cursor-pointer p-1">
                  <X size={18} />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-yellow-500 text-black font-medium rounded-br-sm"
                        : "bg-white/[0.06] border border-white/10 text-white/85 rounded-bl-sm"
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white/[0.06] border border-white/10 rounded-2xl rounded-bl-sm px-4 py-3">
                      <div className="flex gap-1">
                        {[0, 1, 2].map(i => (
                          <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="flex-shrink-0 border-t border-white/10 px-3 py-3 flex gap-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                  placeholder="Type a message..."
                  disabled={loading}
                  className="flex-1 bg-white/[0.06] border border-white/15 focus:border-yellow-500/50 rounded-xl px-3.5 py-2.5 text-white placeholder-white/25 outline-none text-sm"
                />
                <button onClick={send} disabled={loading || !input.trim()}
                  className="w-10 h-10 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-black rounded-xl flex items-center justify-center transition-all cursor-pointer flex-shrink-0">
                  <Send size={15} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
