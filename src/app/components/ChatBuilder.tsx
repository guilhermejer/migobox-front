import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Send, Sparkles, Check, Loader2 } from "lucide-react";
import * as api from "../api";

interface Message {
  id: number;
  text: string;
  isAI: boolean;
  time: string;
}

interface Tag {
  text: string;
  color: string;
  bg: string;
}

const TAG_COLORS = [
  { color: "#7C3AED", bg: "#7C3AED22" },
  { color: "#58CC02", bg: "#58CC0222" },
  { color: "#92400E", bg: "#FEF3C7" },
  { color: "#1CB0F6", bg: "#1CB0F622" },
  { color: "#EC4899", bg: "#EC489922" },
  { color: "#F43F5E", bg: "#F43F5E22" },
];

const FALLBACK_RESPONSES = [
  "Que incrível! Isso me diz muito sobre ela 💡 E quando vocês saem juntas, que tipo de lugar ela prefere?",
  "Adorei! Posso ver que ela tem um gosto bem definido ✨ Ela costuma gostar de receber presentes práticos ou mais experiências?",
  "Perfeito! Estou montando o perfil dela 🎯 Tem alguma coisa que ela definitivamente NÃO gosta?",
  "Ótima informação! Isso vai me ajudar muito 🎁 Mais alguma coisa sobre ela?",
];

function now(): string {
  const d = new Date();
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

interface Props {
  friendId: string;
  friendName: string;
  friendEmoji?: string;
  onBack: () => void;
  onFinish: (friendId: string) => void;
}

export function ChatBuilder({ friendId, friendName, friendEmoji = "🌸", onBack, onFinish }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      isAI: true,
      text: `Oi! Vou te ajudar a mapear a personalidade d${friendName.endsWith("a") ? "a" : "o"} ${friendName} 💜 Para começar, me conta: como vocês se conheceram?`,
      time: now(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [tags, setTags] = useState<Tag[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [fallbackIndex, setFallbackIndex] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const completionPercent = Math.min(100, 10 + tags.length * 12 + messages.filter((m) => !m.isAI).length * 5);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const extractTagsFromText = (text: string): Tag[] => {
    const keywords = text.toLowerCase().match(/\b\w{4,}\b/g) ?? [];
    return keywords.slice(0, 2).map((word, i) => ({
      text: `✨ ${word.charAt(0).toUpperCase() + word.slice(1)}`,
      ...TAG_COLORS[(tags.length + i) % TAG_COLORS.length],
    }));
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isTyping) return;
    const text = inputText.trim();
    setInputText("");

    const userMsg: Message = { id: Date.now(), text, isAI: false, time: now() };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    let aiText = FALLBACK_RESPONSES[fallbackIndex % FALLBACK_RESPONSES.length];
    let newTags: Tag[] = [];

    try {
      const res = await api.agentChat(friendId, text);
      // Try common response field names from flexible schema
      const responseText =
        (res.message as string) ??
        (res.response as string) ??
        (res.reply as string) ??
        aiText;
      aiText = responseText;
      if (Array.isArray(res.tags)) {
        newTags = (res.tags as string[]).map((t, i) => ({
          text: t,
          ...TAG_COLORS[(tags.length + i) % TAG_COLORS.length],
        }));
      }
    } catch {
      // API unavailable — use fallback + extract tags from user message
      newTags = extractTagsFromText(text);
      setFallbackIndex((i) => i + 1);
    }

    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [...prev, { id: Date.now() + 1, text: aiText, isAI: true, time: now() }]);
      if (newTags.length > 0) {
        setTags((prev) => {
          const existingTexts = new Set(prev.map((t) => t.text));
          return [...prev, ...newTags.filter((t) => !existingTexts.has(t.text))];
        });
      }
    }, 1200);
  };

  const handleFinalize = async () => {
    setFinalizing(true);
    try {
      await api.agentFinalize(friendId);
    } catch {
      // Proceed anyway — finalize is best-effort in demo
    } finally {
      setFinalizing(false);
      onFinish(friendId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "#F8F9FA", fontFamily: "'Nunito', sans-serif" }}>
      {/* Header */}
      <div className="flex-shrink-0" style={{ background: "#FFFFFF", borderBottom: "2px solid #ECECEC" }}>
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center justify-center"
              style={{ width: 40, height: 40, borderRadius: 12, background: "#F8F9FA", border: "2px solid #ECECEC" }}
            >
              <ArrowLeft size={20} color="#2D3436" />
            </button>
            <div
              className="flex items-center justify-center"
              style={{ width: 38, height: 38, borderRadius: "50%", background: "#1CB0F622", border: "2px solid #1CB0F6", fontSize: "18px" }}
            >
              {friendEmoji}
            </div>
            <div>
              <p style={{ color: "#717182", fontSize: "12px", fontWeight: 600 }}>Construindo perfil de</p>
              <h2 style={{ color: "#2D3436", fontSize: "17px", fontWeight: 800 }}>{friendName}</h2>
            </div>
          </div>
          <button
            onClick={handleFinalize}
            disabled={finalizing}
            className="flex items-center gap-2 px-4 py-2"
            style={{
              background: "#58CC02", borderRadius: 14,
              boxShadow: "0 4px 0 #3D9200", color: "white",
              fontSize: "13px", fontWeight: 800, opacity: finalizing ? 0.7 : 1,
            }}
          >
            {finalizing ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={15} strokeWidth={3} />}
            Finalizar
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span style={{ color: "#717182", fontSize: "12px", fontWeight: 600 }}>
              <Sparkles size={12} style={{ display: "inline", marginRight: 4 }} />
              Perfil mapeado
            </span>
            <span style={{ color: "#58CC02", fontSize: "12px", fontWeight: 800 }}>{completionPercent}%</span>
          </div>
          <div className="h-2.5 w-full rounded-full overflow-hidden" style={{ background: "#ECECEC" }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${completionPercent}%`, background: "linear-gradient(90deg, #58CC02, #96E254)", transition: "width 0.7s ease" }}
            />
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.isAI ? "justify-start" : "justify-end"}`}>
            {msg.isAI && (
              <div
                className="flex-shrink-0 flex items-center justify-center mr-2 self-end mb-5"
                style={{ width: 32, height: 32, borderRadius: "50%", background: "#1CB0F622", border: "2px solid #1CB0F6", fontSize: "14px" }}
              >
                🤖
              </div>
            )}
            <div style={{ maxWidth: "78%" }}>
              <div
                className="px-4 py-3"
                style={{
                  background: msg.isAI ? "#FFFFFF" : "#1CB0F6",
                  borderRadius: msg.isAI ? "4px 20px 20px 20px" : "20px 4px 20px 20px",
                  border: msg.isAI ? "2px solid #ECECEC" : "none",
                  boxShadow: msg.isAI ? "0 2px 0 #E0E0E0" : "0 3px 0 #0F8FC4",
                  color: msg.isAI ? "#2D3436" : "#FFFFFF",
                  fontSize: "14px", fontWeight: 600, lineHeight: 1.5,
                }}
              >
                {msg.text}
              </div>
              <p
                style={{
                  color: "#AAAAAA", fontSize: "10px", fontWeight: 600, marginTop: 4,
                  textAlign: msg.isAI ? "left" : "right",
                  paddingLeft: msg.isAI ? 4 : 0, paddingRight: msg.isAI ? 0 : 4,
                }}
              >
                {msg.time}
              </p>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div
              className="flex-shrink-0 flex items-center justify-center mr-2 self-end mb-5"
              style={{ width: 32, height: 32, borderRadius: "50%", background: "#1CB0F622", border: "2px solid #1CB0F6", fontSize: "14px" }}
            >
              🤖
            </div>
            <div
              className="px-4 py-3 flex items-center gap-1"
              style={{ background: "#FFFFFF", borderRadius: "4px 20px 20px 20px", border: "2px solid #ECECEC", boxShadow: "0 2px 0 #E0E0E0" }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-full"
                  style={{ width: 7, height: 7, background: "#1CB0F6", animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Tags strip */}
      {tags.length > 0 && (
        <div className="flex-shrink-0 px-4 py-3" style={{ borderTop: "2px solid #ECECEC", background: "#FFFFFF" }}>
          <p style={{ color: "#717182", fontSize: "12px", fontWeight: 700, marginBottom: 8 }}>
            🏷️ Tags extraídas em tempo real:
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {tags.map((tag) => (
              <div
                key={tag.text}
                className="flex-shrink-0 px-3 py-1.5"
                style={{ background: tag.bg, borderRadius: 10, color: tag.color, fontSize: "12px", fontWeight: 700, border: `1.5px solid ${tag.color}44` }}
              >
                {tag.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div
        className="flex-shrink-0 flex items-center gap-3 px-4 py-3"
        style={{ background: "#FFFFFF", borderTop: "2px solid #ECECEC" }}
      >
        <div
          className="flex-1 flex items-center px-4 py-3"
          style={{ background: "#F8F9FA", borderRadius: 18, border: "2px solid #ECECEC" }}
        >
          <input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Conte uma história sobre ela..."
            style={{
              background: "transparent", border: "none", outline: "none",
              color: "#2D3436", fontSize: "14px",
              fontFamily: "'Nunito', sans-serif", fontWeight: 600, width: "100%",
            }}
          />
        </div>
        <button
          onClick={sendMessage}
          disabled={!inputText.trim() || isTyping}
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 48, height: 48, borderRadius: 16,
            background: inputText.trim() && !isTyping ? "#1CB0F6" : "#ECECEC",
            boxShadow: inputText.trim() && !isTyping ? "0 4px 0 #0F8FC4" : "0 4px 0 #D0D0D0",
            transition: "all 0.2s",
          }}
        >
          <Send size={20} color={inputText.trim() && !isTyping ? "white" : "#AAAAAA"} />
        </button>
      </div>

      <style>{`
        @keyframes bounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
