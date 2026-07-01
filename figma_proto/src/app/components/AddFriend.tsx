import { useState } from "react";
import { ArrowLeft, ArrowRight, User, MapPin, Calendar, Heart, Loader2 } from "lucide-react";
import type { FriendUpsertRequest, Gender } from "../types";

const EMOJI_OPTIONS = [
  "🌸", "🎸", "✨", "🏀", "🎨", "🎮", "🌻", "🎯",
  "🦋", "🌈", "⚡", "🎵", "🍀", "🦊", "🌙", "🎲",
  "🦄", "🐬", "🎭", "🏄", "🌺", "🦁", "🐧", "🦅",
];

const RELATION_OPTIONS = [
  "Melhor amigo/a",
  "Namorado/a",
  "Cônjuge",
  "Irmão/Irmã",
  "Primo/a",
  "Colega de trabalho",
  "Amigo/a da faculdade",
  "Amigo/a da infância",
  "Familiar",
  "Outro",
];

const GENDER_OPTIONS: { value: Gender; label: string; emoji: string }[] = [
  { value: "female", label: "Feminino", emoji: "👩" },
  { value: "male", label: "Masculino", emoji: "👨" },
  { value: "other", label: "Outro", emoji: "🧑" },
];

interface Props {
  onBack: () => void;
  onCreated: (friendId: string, friendName: string, emoji: string) => void;
  createFriendApi: (data: FriendUpsertRequest) => Promise<{ friendID: string; name: string }>;
}

export function AddFriend({ onBack, onCreated, createFriendApi }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedEmoji, setSelectedEmoji] = useState("🌸");
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("");
  const [customRelation, setCustomRelation] = useState("");
  const [city, setCity] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const effectiveRelation = relation === "Outro" ? customRelation : relation;
  const canProceedStep1 = name.trim().length >= 2 && relation !== "";

  const handleNext = () => setStep(2);

  const handleCreate = async () => {
    setError("");
    setLoading(true);
    try {
      const payload: FriendUpsertRequest = {
        name: name.trim(),
        userRelation: effectiveRelation || undefined,
        city: city.trim() || undefined,
        birthDate: birthDate || undefined,
        gender: gender || undefined,
      };
      const friend = await createFriendApi(payload);
      onCreated(friend.friendID, friend.name, selectedEmoji);
    } catch {
      // In demo mode (API unavailable), create a local mock friend
      const mockId = `mock-${Date.now()}`;
      onCreated(mockId, name.trim(), selectedEmoji);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "#F8F9FA", fontFamily: "'Nunito', sans-serif" }}>
      {/* Header */}
      <div style={{ background: "#FFFFFF", borderBottom: "2px solid #ECECEC" }}>
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <button
            onClick={onBack}
            className="flex items-center justify-center"
            style={{ width: 40, height: 40, borderRadius: 12, background: "#F8F9FA", border: "2px solid #ECECEC" }}
          >
            <ArrowLeft size={20} color="#2D3436" />
          </button>
          <div className="flex-1">
            <p style={{ color: "#717182", fontSize: "12px", fontWeight: 600 }}>
              Passo {step} de 2
            </p>
            <h2 style={{ color: "#2D3436", fontSize: "18px", fontWeight: 800 }}>
              {step === 1 ? "Quem é essa pessoa? 👋" : "Mais detalhes (opcional)"}
            </h2>
          </div>
        </div>

        {/* Step progress */}
        <div className="flex gap-2 px-4 pb-3">
          {[1, 2].map((s) => (
            <div
              key={s}
              className="flex-1 h-2 rounded-full overflow-hidden"
              style={{ background: "#ECECEC" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: step >= s ? "100%" : "0%",
                  background: "linear-gradient(90deg, #1CB0F6, #58CC02)",
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        {step === 1 ? (
          <div className="space-y-5">
            {/* Emoji picker */}
            <div>
              <p style={{ color: "#2D3436", fontSize: "14px", fontWeight: 700, marginBottom: 10 }}>
                Escolha um avatar 🎨
              </p>
              <div
                className="grid gap-2"
                style={{ gridTemplateColumns: "repeat(8, 1fr)" }}
              >
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setSelectedEmoji(emoji)}
                    className="flex items-center justify-center"
                    style={{
                      aspectRatio: "1",
                      borderRadius: 14,
                      fontSize: "22px",
                      background: selectedEmoji === emoji ? "#1CB0F622" : "#FFFFFF",
                      border: `2.5px solid ${selectedEmoji === emoji ? "#1CB0F6" : "#ECECEC"}`,
                      boxShadow: selectedEmoji === emoji ? "0 3px 0 #0F8FC444" : "0 2px 0 #E0E0E0",
                      transform: selectedEmoji === emoji ? "scale(1.08)" : "scale(1)",
                      transition: "all 0.15s",
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label
                style={{ color: "#2D3436", fontSize: "14px", fontWeight: 700, display: "block", marginBottom: 8 }}
              >
                <User size={14} style={{ display: "inline", marginRight: 6 }} />
                Nome
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Ana Clara"
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: 16,
                  border: "2px solid #ECECEC",
                  background: "#FFFFFF",
                  color: "#2D3436",
                  fontSize: "16px",
                  fontFamily: "'Nunito', sans-serif",
                  fontWeight: 600,
                  outline: "none",
                  boxSizing: "border-box",
                  boxShadow: "0 3px 0 #E0E0E0",
                }}
                onFocus={(e) => { e.target.style.borderColor = "#1CB0F6"; }}
                onBlur={(e) => { e.target.style.borderColor = "#ECECEC"; }}
              />
            </div>

            {/* Relation */}
            <div>
              <label
                style={{ color: "#2D3436", fontSize: "14px", fontWeight: 700, display: "block", marginBottom: 8 }}
              >
                <Heart size={14} style={{ display: "inline", marginRight: 6 }} />
                Relação
              </label>
              <div className="flex flex-wrap gap-2">
                {RELATION_OPTIONS.map((rel) => (
                  <button
                    key={rel}
                    onClick={() => setRelation(rel)}
                    className="px-3 py-2"
                    style={{
                      borderRadius: 12,
                      background: relation === rel ? "#1CB0F6" : "#FFFFFF",
                      color: relation === rel ? "white" : "#2D3436",
                      fontSize: "13px",
                      fontWeight: 700,
                      border: `2px solid ${relation === rel ? "#1CB0F6" : "#ECECEC"}`,
                      boxShadow: relation === rel ? "0 3px 0 #0F8FC4" : "0 2px 0 #E0E0E0",
                      transition: "all 0.15s",
                    }}
                  >
                    {rel}
                  </button>
                ))}
              </div>
              {relation === "Outro" && (
                <input
                  value={customRelation}
                  onChange={(e) => setCustomRelation(e.target.value)}
                  placeholder="Descreva a relação..."
                  style={{
                    marginTop: 10,
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: 14,
                    border: "2px solid #1CB0F6",
                    background: "#FFFFFF",
                    color: "#2D3436",
                    fontSize: "14px",
                    fontFamily: "'Nunito', sans-serif",
                    fontWeight: 600,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Preview */}
            <div
              className="flex items-center gap-3 p-4"
              style={{ background: "#FFFFFF", borderRadius: 20, border: "2px solid #ECECEC", boxShadow: "0 4px 0 #E0E0E0" }}
            >
              <div
                className="flex items-center justify-center"
                style={{
                  width: 52, height: 52, borderRadius: "50%",
                  background: "#1CB0F622", border: "3px solid #1CB0F6", fontSize: "26px",
                }}
              >
                {selectedEmoji}
              </div>
              <div>
                <p style={{ color: "#2D3436", fontSize: "17px", fontWeight: 800 }}>{name}</p>
                <p style={{ color: "#717182", fontSize: "13px", fontWeight: 600 }}>{effectiveRelation}</p>
              </div>
              <div
                className="ml-auto px-2 py-1"
                style={{ background: "#58CC0222", borderRadius: 8, color: "#3D9200", fontSize: "11px", fontWeight: 700 }}
              >
                ✓ Criado
              </div>
            </div>

            {/* City */}
            <div>
              <label style={{ color: "#2D3436", fontSize: "14px", fontWeight: 700, display: "block", marginBottom: 8 }}>
                <MapPin size={14} style={{ display: "inline", marginRight: 6 }} />
                Cidade
              </label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: São Paulo, SP"
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: 16,
                  border: "2px solid #ECECEC",
                  background: "#FFFFFF",
                  color: "#2D3436",
                  fontSize: "16px",
                  fontFamily: "'Nunito', sans-serif",
                  fontWeight: 600,
                  outline: "none",
                  boxSizing: "border-box",
                  boxShadow: "0 3px 0 #E0E0E0",
                }}
                onFocus={(e) => { e.target.style.borderColor = "#1CB0F6"; }}
                onBlur={(e) => { e.target.style.borderColor = "#ECECEC"; }}
              />
            </div>

            {/* Birth date */}
            <div>
              <label style={{ color: "#2D3436", fontSize: "14px", fontWeight: 700, display: "block", marginBottom: 8 }}>
                <Calendar size={14} style={{ display: "inline", marginRight: 6 }} />
                Data de nascimento
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: 16,
                  border: "2px solid #ECECEC",
                  background: "#FFFFFF",
                  color: "#2D3436",
                  fontSize: "16px",
                  fontFamily: "'Nunito', sans-serif",
                  fontWeight: 600,
                  outline: "none",
                  boxSizing: "border-box",
                  boxShadow: "0 3px 0 #E0E0E0",
                }}
                onFocus={(e) => { e.target.style.borderColor = "#1CB0F6"; }}
                onBlur={(e) => { e.target.style.borderColor = "#ECECEC"; }}
              />
            </div>

            {/* Gender */}
            <div>
              <label style={{ color: "#2D3436", fontSize: "14px", fontWeight: 700, display: "block", marginBottom: 8 }}>
                Gênero
              </label>
              <div className="flex gap-3">
                {GENDER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setGender(opt.value)}
                    className="flex-1 flex flex-col items-center gap-1 py-3"
                    style={{
                      borderRadius: 16,
                      background: gender === opt.value ? "#1CB0F622" : "#FFFFFF",
                      border: `2px solid ${gender === opt.value ? "#1CB0F6" : "#ECECEC"}`,
                      boxShadow: gender === opt.value ? "0 3px 0 #0F8FC444" : "0 2px 0 #E0E0E0",
                      transition: "all 0.15s",
                    }}
                  >
                    <span style={{ fontSize: "22px" }}>{opt.emoji}</span>
                    <span style={{ color: gender === opt.value ? "#0F8FC4" : "#717182", fontSize: "12px", fontWeight: 700 }}>
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p style={{ color: "#F43F5E", fontSize: "13px", fontWeight: 700, textAlign: "center" }}>{error}</p>
            )}

            {/* Tip */}
            <div
              className="flex items-start gap-3 p-3"
              style={{ background: "#1CB0F611", borderRadius: 14, border: "1.5px solid #1CB0F633" }}
            >
              <span style={{ fontSize: "18px" }}>💡</span>
              <p style={{ color: "#0F8FC4", fontSize: "12px", fontWeight: 600, lineHeight: 1.5 }}>
                Quanto mais detalhes você fornecer, melhores serão as sugestões de presente! O próximo passo é um chat com nossa IA para mapear a personalidade.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* CTA */}
      <div
        className="flex-shrink-0 px-4 py-4 flex gap-3"
        style={{ background: "#FFFFFF", borderTop: "2px solid #ECECEC" }}
      >
        {step === 2 && (
          <button
            onClick={() => setStep(1)}
            className="flex items-center justify-center"
            style={{
              width: 52, height: 52, borderRadius: 16,
              background: "#F8F9FA", border: "2px solid #ECECEC",
              boxShadow: "0 3px 0 #E0E0E0",
            }}
          >
            <ArrowLeft size={20} color="#717182" />
          </button>
        )}
        <button
          onClick={step === 1 ? handleNext : handleCreate}
          disabled={step === 1 ? !canProceedStep1 : loading}
          className="flex-1 flex items-center justify-center gap-2 py-3"
          style={{
            borderRadius: 18,
            background: (step === 1 ? canProceedStep1 : !loading) ? "#1CB0F6" : "#CCCCCC",
            boxShadow: (step === 1 ? canProceedStep1 : !loading) ? "0 5px 0 #0F8FC4" : "0 5px 0 #AAAAAA",
            color: "white",
            fontSize: "16px",
            fontWeight: 800,
            transition: "all 0.15s",
          }}
        >
          {loading ? (
            <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
          ) : step === 1 ? (
            <>Próximo <ArrowRight size={18} /></>
          ) : (
            <>Criar e ir pro Chat 🎉</>
          )}
        </button>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
