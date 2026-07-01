import { useState, useEffect } from "react";
import { ArrowLeft, MessageCircle, RefreshCw, Star, MapPin, Cake, ExternalLink, Loader2 } from "lucide-react";
import type { Friend, Gift, Profile } from "../types";
import * as api from "../api";

const GIFT_COLORS = ["#58CC02", "#1CB0F6", "#A855F7", "#F43F5E", "#FF9600"];
const GIFT_EMOJIS = ["☕", "📖", "🎨", "🌿", "🎵", "🎁", "✨", "🍫"];

function calcAge(birthDate?: string): number | null {
  if (!birthDate) return null;
  return Math.floor((Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

function calcProgress(profile?: Profile): number {
  if (!profile) return 0;
  const total = (profile.likes?.length ?? 0) + (profile.dislikes?.length ?? 0) + (profile.personality?.length ?? 0);
  return Math.min(100, Math.round((total / 12) * 100));
}

const MOCK_GIFTS: Gift[] = [
  {
    giftID: "g1", friendID: "", title: "Kit Café Especial",
    description: "Seleção curada de cafés especiais de diferentes regiões do Brasil, com guia de preparo artesanal.",
    priceRange: "R$ 80 – R$ 150", tags: ["☕ Café", "🌿 Sustentável", "✨ Premium"],
  },
  {
    giftID: "g2", friendID: "", title: "Box de Livros Curada",
    description: "Assinatura mensal com lançamentos de ficção literária contemporânea, com marcador exclusivo.",
    priceRange: "R$ 60 – R$ 120", tags: ["📚 Leitura", "🎁 Assinatura"],
  },
  {
    giftID: "g3", friendID: "", title: "Workshop de Arte",
    description: "Experiência presencial de 4h em estúdio, incluindo materiais premium e certificado.",
    priceRange: "R$ 120 – R$ 200", tags: ["🎨 Arte", "✨ Experiência"],
  },
];

interface Props {
  friend: Friend;
  onBack: () => void;
  onChat: () => void;
}

export function FriendProfile({ friend, onBack, onChat }: Props) {
  const [profile, setProfile] = useState<Profile | null>(friend.profile ?? null);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(!friend.profile);
  const [loadingGifts, setLoadingGifts] = useState(true);
  const [generatingSuggestions, setGeneratingSuggestions] = useState(false);
  const [refiningId, setRefiningId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "like" | "dislike" | "trait">("all");

  useEffect(() => {
    if (!friend.profile) {
      api.getProfile(friend.friendID)
        .then((p) => setProfile(p))
        .catch(() => setProfile(null))
        .finally(() => setLoadingProfile(false));
    } else {
      setLoadingProfile(false);
    }

    api.getGifts(friend.friendID)
      .then((g) => setGifts(g))
      .catch(() => setGifts(MOCK_GIFTS.map((g) => ({ ...g, friendID: friend.friendID }))))
      .finally(() => setLoadingGifts(false));
  }, [friend.friendID]);

  const handleGenerateSuggestions = async () => {
    setGeneratingSuggestions(true);
    try {
      await api.createSuggestions(friend.friendID);
      const g = await api.getGifts(friend.friendID);
      setGifts(g);
    } catch {
      setGifts(MOCK_GIFTS.map((g) => ({ ...g, friendID: friend.friendID })));
    } finally {
      setGeneratingSuggestions(false);
    }
  };

  const handleRefine = async (giftId: string) => {
    setRefiningId(giftId);
    setTimeout(() => setRefiningId(null), 1800);
  };

  const age = calcAge(friend.birthDate);
  const progress = calcProgress(profile ?? undefined);

  const likes = profile?.likes ?? [];
  const dislikes = profile?.dislikes ?? [];
  const traits = profile?.personality ?? [];

  const filteredTags = (() => {
    if (activeFilter === "like") return likes.map((t) => ({ text: t, type: "like" as const }));
    if (activeFilter === "dislike") return dislikes.map((t) => ({ text: t, type: "dislike" as const }));
    if (activeFilter === "trait") return traits.map((t) => ({ text: t, type: "trait" as const }));
    return [
      ...likes.map((t) => ({ text: t, type: "like" as const })),
      ...dislikes.map((t) => ({ text: t, type: "dislike" as const })),
      ...traits.map((t) => ({ text: t, type: "trait" as const })),
    ];
  })();

  const tagStyle = {
    like: { bg: "#58CC0222", color: "#3D9200", border: "#58CC0255" },
    dislike: { bg: "#F43F5E22", color: "#C01B3B", border: "#F43F5E55" },
    trait: { bg: "#A855F722", color: "#7C3AED", border: "#A855F755" },
  };

  const noProfile = !loadingProfile && likes.length === 0 && dislikes.length === 0 && traits.length === 0;

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: "#F8F9FA", fontFamily: "'Nunito', sans-serif" }}>
      {/* Hero */}
      <div className="flex-shrink-0 relative pb-8" style={{ background: "linear-gradient(160deg, #1CB0F6 0%, #0F8FC4 100%)" }}>
        <div className="flex items-center justify-between px-4 pt-4 pb-6">
          <button
            onClick={onBack}
            className="flex items-center justify-center"
            style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,0.2)", border: "2px solid rgba(255,255,255,0.3)" }}
          >
            <ArrowLeft size={20} color="white" />
          </button>
          <p style={{ color: "white", fontSize: "16px", fontWeight: 800 }}>Raio-X ✨</p>
          <button
            onClick={onChat}
            className="flex items-center justify-center"
            style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,0.2)", border: "2px solid rgba(255,255,255,0.3)" }}
          >
            <MessageCircle size={20} color="white" />
          </button>
        </div>

        <div className="flex flex-col items-center px-4">
          <div
            className="flex items-center justify-center mb-3"
            style={{ width: 96, height: 96, borderRadius: "50%", background: "rgba(255,255,255,0.25)", border: "4px solid white", fontSize: "48px" }}
          >
            {friend.emoji ?? "👤"}
          </div>
          <h1 style={{ color: "white", fontSize: "24px", fontWeight: 900 }}>{friend.name}</h1>
          <div className="flex items-center gap-4 mt-2 flex-wrap justify-center">
            {friend.city && (
              <div className="flex items-center gap-1">
                <MapPin size={13} color="rgba(255,255,255,0.8)" />
                <span style={{ color: "rgba(255,255,255,0.9)", fontSize: "13px", fontWeight: 600 }}>{friend.city}</span>
              </div>
            )}
            {age !== null && (
              <div className="flex items-center gap-1">
                <Cake size={13} color="rgba(255,255,255,0.8)" />
                <span style={{ color: "rgba(255,255,255,0.9)", fontSize: "13px", fontWeight: 600 }}>{age} anos</span>
              </div>
            )}
            {friend.userRelation && (
              <span style={{ color: "rgba(255,255,255,0.9)", fontSize: "13px", fontWeight: 600 }}>· {friend.userRelation}</span>
            )}
          </div>
          <div
            className="flex items-center gap-2 px-4 py-2 mt-3"
            style={{ background: "rgba(255,255,255,0.2)", borderRadius: 12, border: "1.5px solid rgba(255,255,255,0.4)" }}
          >
            <Star size={14} color="white" fill="white" />
            <span style={{ color: "white", fontSize: "13px", fontWeight: 700 }}>Perfil {progress}% completo</span>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0" style={{ height: 28, background: "#F8F9FA", borderRadius: "28px 28px 0 0" }} />
      </div>

      <div className="flex-1 px-4 pt-2 pb-6 space-y-5">
        {/* Personality */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 style={{ color: "#2D3436", fontSize: "18px", fontWeight: 800 }}>Personalidade 🧠</h2>
            <button onClick={onChat} style={{ color: "#1CB0F6", fontSize: "13px", fontWeight: 700 }}>+ Adicionar</button>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            {(["all", "like", "dislike", "trait"] as const).map((f) => {
              const labels = { all: "Tudo", like: "✅ Gostos", dislike: "❌ Não gosta", trait: "💡 Traços" };
              const active = f === activeFilter;
              return (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className="flex-shrink-0 px-3 py-1.5"
                  style={{
                    borderRadius: 10, fontSize: "12px", fontWeight: 700, transition: "all 0.2s",
                    background: active ? "#2D3436" : "#FFFFFF",
                    color: active ? "white" : "#717182",
                    border: `2px solid ${active ? "#2D3436" : "#ECECEC"}`,
                  }}
                >
                  {labels[f]}
                </button>
              );
            })}
          </div>

          {loadingProfile ? (
            <div className="flex justify-center py-6">
              <Loader2 size={28} color="#1CB0F6" style={{ animation: "spin 1s linear infinite" }} />
            </div>
          ) : noProfile ? (
            <div
              className="flex flex-col items-center gap-3 py-6"
              style={{ background: "#FFFFFF", borderRadius: 16, border: "2px dashed #CCCCCC" }}
            >
              <span style={{ fontSize: "36px" }}>🧠</span>
              <p style={{ color: "#717182", fontSize: "14px", fontWeight: 600, textAlign: "center" }}>
                Nenhum dado de personalidade ainda.
              </p>
              <button
                onClick={onChat}
                className="px-4 py-2"
                style={{ background: "#1CB0F6", borderRadius: 12, boxShadow: "0 3px 0 #0F8FC4", color: "white", fontSize: "13px", fontWeight: 800 }}
              >
                Iniciar conversa com IA
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {filteredTags.map((tag, i) => {
                const s = tagStyle[tag.type];
                return (
                  <div
                    key={`${tag.type}-${i}`}
                    className="px-3 py-1.5"
                    style={{ background: s.bg, color: s.color, borderRadius: 12, border: `1.5px solid ${s.border}`, fontSize: "13px", fontWeight: 700 }}
                  >
                    {tag.text}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={handleGenerateSuggestions}
          disabled={generatingSuggestions}
          className="w-full flex items-center justify-center gap-3 py-4"
          style={{
            background: "#1CB0F6", borderRadius: 20, boxShadow: "0 6px 0 #0F8FC4",
            color: "white", fontSize: "17px", fontWeight: 900, opacity: generatingSuggestions ? 0.8 : 1,
          }}
        >
          {generatingSuggestions ? (
            <><Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} /> Gerando sugestões...</>
          ) : (
            "🎁 SUGERIR PRESENTES"
          )}
        </button>

        {/* Gifts */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 style={{ color: "#2D3436", fontSize: "18px", fontWeight: 800 }}>Sugestões 🛍️</h2>
            {!loadingGifts && (
              <span style={{ color: "#717182", fontSize: "13px", fontWeight: 600 }}>{gifts.length} ideias</span>
            )}
          </div>

          {loadingGifts ? (
            <div className="flex justify-center py-8">
              <Loader2 size={28} color="#1CB0F6" style={{ animation: "spin 1s linear infinite" }} />
            </div>
          ) : gifts.length === 0 ? (
            <div
              className="flex flex-col items-center gap-3 py-6"
              style={{ background: "#FFFFFF", borderRadius: 16, border: "2px dashed #CCCCCC" }}
            >
              <span style={{ fontSize: "36px" }}>🎁</span>
              <p style={{ color: "#717182", fontSize: "14px", fontWeight: 600, textAlign: "center" }}>
                Toque em "Sugerir Presentes" para gerar ideias personalizadas
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {gifts.map((gift, idx) => {
                const color = GIFT_COLORS[idx % GIFT_COLORS.length];
                const emoji = GIFT_EMOJIS[idx % GIFT_EMOJIS.length];
                return (
                  <div
                    key={gift.giftID}
                    className="p-4"
                    style={{ background: "#FFFFFF", borderRadius: 20, border: "2px solid #ECECEC", boxShadow: "0 4px 0 #E0E0E0" }}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className="flex-shrink-0 flex items-center justify-center"
                        style={{ width: 52, height: 52, borderRadius: 16, background: `${color}22`, fontSize: "26px" }}
                      >
                        {emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p style={{ color: "#2D3436", fontSize: "15px", fontWeight: 800 }}>{gift.title}</p>
                        {gift.priceRange && (
                          <p style={{ color: "#2D3436", fontSize: "17px", fontWeight: 800, marginTop: 2 }}>
                            {gift.priceRange}
                          </p>
                        )}
                      </div>
                    </div>

                    {gift.description && (
                      <p style={{ color: "#717182", fontSize: "13px", fontWeight: 600, lineHeight: 1.5, marginBottom: 12 }}>
                        {gift.description}
                      </p>
                    )}

                    {gift.tags?.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap mb-3">
                        {gift.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1"
                            style={{ background: "#F8F9FA", borderRadius: 8, color: "#717182", fontSize: "11px", fontWeight: 700, border: "1.5px solid #ECECEC" }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRefine(gift.giftID)}
                        className="flex items-center gap-2 px-3 py-2 flex-1 justify-center"
                        style={{
                          background: refiningId === gift.giftID ? "#58CC0222" : "#F8F9FA",
                          borderRadius: 12, fontSize: "13px", fontWeight: 700, transition: "all 0.2s",
                          border: `2px solid ${refiningId === gift.giftID ? "#58CC02" : "#ECECEC"}`,
                          color: refiningId === gift.giftID ? "#3D9200" : "#717182",
                        }}
                      >
                        <RefreshCw size={14} style={{ animation: refiningId === gift.giftID ? "spin 1s linear infinite" : "none" }} />
                        {refiningId === gift.giftID ? "Refinando..." : "Refinar"}
                      </button>
                      <button
                        className="flex items-center gap-2 px-3 py-2"
                        style={{ background: "#1CB0F6", borderRadius: 12, boxShadow: "0 3px 0 #0F8FC4", color: "white", fontSize: "13px", fontWeight: 700 }}
                      >
                        <ExternalLink size={14} /> Ver
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
