import { Settings, Plus, ChevronRight, Bell } from "lucide-react";
import type { Friend } from "../types";

function calcAge(birthDate?: string): string | null {
  if (!birthDate) return null;
  const diff = Date.now() - new Date(birthDate).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)) + " anos";
}

function calcProfileProgress(friend: Friend): number {
  const p = friend.profile;
  if (!p) return 0;
  const total = (p.likes?.length ?? 0) + (p.dislikes?.length ?? 0) + (p.personality?.length ?? 0);
  return Math.min(100, Math.round((total / 12) * 100));
}

function daysUntilBirthday(birthDate?: string): number | null {
  if (!birthDate) return null;
  const now = new Date();
  const bd = new Date(birthDate);
  const next = new Date(now.getFullYear(), bd.getMonth(), bd.getDate());
  if (next < now) next.setFullYear(now.getFullYear() + 1);
  return Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

const ACCENT_COLORS = [
  "#1CB0F6", "#58CC02", "#A855F7", "#F43F5E",
  "#FF9600", "#EC4899", "#10B981", "#3B82F6",
];

interface Props {
  friends: Friend[];
  userName: string;
  onFriendClick: (id: string) => void;
  onChatClick: (id: string) => void;
  onAddFriend: () => void;
}

export function HomeDashboard({ friends, userName, onFriendClick, onChatClick, onAddFriend }: Props) {
  const birthdayAlert = friends.find((f) => {
    const d = daysUntilBirthday(f.birthDate);
    return d !== null && d <= 7;
  });

  const completedProfiles = friends.filter((f) => calcProfileProgress(f) >= 70).length;

  return (
    <div className="relative min-h-full flex flex-col" style={{ background: "#F8F9FA", fontFamily: "'Nunito', sans-serif" }}>
      {/* Header */}
      <div className="sticky top-0 z-10" style={{ background: "#FFFFFF", borderBottom: "2px solid #ECECEC" }}>
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <p style={{ color: "#717182", fontSize: "13px", fontWeight: 600 }}>Bem-vindo de volta 👋</p>
            <h1 style={{ color: "#2D3436", fontSize: "22px", fontWeight: 800, lineHeight: 1.2 }}>Olá, {userName}!</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="relative flex items-center justify-center"
              style={{ width: 44, height: 44, borderRadius: 14, background: "#F8F9FA", border: "2px solid #ECECEC" }}
            >
              <Bell size={20} color="#2D3436" />
              {birthdayAlert && (
                <span
                  className="absolute top-1 right-1"
                  style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF9600", border: "2px solid white", display: "block" }}
                />
              )}
            </button>
            <button
              className="flex items-center justify-center"
              style={{ width: 44, height: 44, borderRadius: 14, background: "#F8F9FA", border: "2px solid #ECECEC" }}
            >
              <Settings size={20} color="#2D3436" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-3 px-5 pb-4">
          {[
            { label: "Amigos", value: String(friends.length), emoji: "👥" },
            { label: "Perfis prontos", value: String(completedProfiles), emoji: "✅" },
            { label: "Listas ativas", value: "3", emoji: "🎁" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex-1 flex flex-col items-center py-2 px-1"
              style={{ background: "#F8F9FA", borderRadius: 12, border: "2px solid #ECECEC" }}
            >
              <span style={{ fontSize: "18px" }}>{stat.emoji}</span>
              <span style={{ color: "#2D3436", fontSize: "16px", fontWeight: 800 }}>{stat.value}</span>
              <span style={{ color: "#717182", fontSize: "10px", fontWeight: 600, textAlign: "center" }}>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-32 pt-5">
        {/* Birthday Alert */}
        {birthdayAlert && (
          <div
            className="flex items-center gap-3 p-4 mb-5"
            style={{ background: "#FF9600", borderRadius: 20, boxShadow: "0 4px 0 #C97200" }}
          >
            <span style={{ fontSize: "28px" }}>🎂</span>
            <div className="flex-1 min-w-0">
              <p style={{ color: "white", fontSize: "13px", fontWeight: 700, opacity: 0.9 }}>Lembrete de aniversário</p>
              <p style={{ color: "white", fontSize: "15px", fontWeight: 800 }}>
                Aniversário d{birthdayAlert.name.endsWith("a") ? "a" : "o"} {birthdayAlert.name.split(" ")[0]} em{" "}
                {daysUntilBirthday(birthdayAlert.birthDate)} dias!
              </p>
            </div>
            <button
              onClick={() => onFriendClick(birthdayAlert.friendID)}
              className="flex-shrink-0 px-3 py-2"
              style={{
                background: "white", borderRadius: 12, color: "#C97200",
                fontSize: "12px", fontWeight: 800,
                boxShadow: "0 3px 0 #E8C28A", whiteSpace: "nowrap",
              }}
            >
              Ver Presentes
            </button>
          </div>
        )}

        {/* Section heading */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 style={{ color: "#2D3436", fontSize: "20px", fontWeight: 800 }}>Sua Caixinha 📦</h2>
            <p style={{ color: "#717182", fontSize: "12px", fontWeight: 600 }}>Seus amigos especiais</p>
          </div>
          {friends.length > 0 && (
            <button style={{ color: "#1CB0F6", fontSize: "13px", fontWeight: 700 }}>Ver todos</button>
          )}
        </div>

        {/* Empty state */}
        {friends.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <span style={{ fontSize: "56px" }}>📦</span>
            <div className="text-center">
              <p style={{ color: "#2D3436", fontSize: "17px", fontWeight: 800 }}>Sua caixinha está vazia!</p>
              <p style={{ color: "#717182", fontSize: "14px", fontWeight: 600, marginTop: 4 }}>
                Adicione seus primeiros amigos para começar
              </p>
            </div>
            <button
              onClick={onAddFriend}
              className="flex items-center gap-2 px-6 py-3 mt-2"
              style={{
                background: "#1CB0F6", borderRadius: 18,
                boxShadow: "0 5px 0 #0F8FC4", color: "white",
                fontSize: "15px", fontWeight: 800,
              }}
            >
              <Plus size={18} strokeWidth={3} /> Adicionar amigo
            </button>
          </div>
        )}

        {/* Friends list */}
        <div className="flex flex-col gap-3">
          {friends.map((friend, idx) => {
            const color = ACCENT_COLORS[idx % ACCENT_COLORS.length];
            const progress = calcProfileProgress(friend);
            const days = daysUntilBirthday(friend.birthDate);
            const hasBirthdaySoon = days !== null && days <= 7;
            const age = calcAge(friend.birthDate);

            return (
              <div
                key={friend.friendID}
                className="flex items-center gap-4 p-4 cursor-pointer"
                style={{
                  background: "#FFFFFF", borderRadius: 20,
                  border: "2px solid #ECECEC", boxShadow: "0 4px 0 #E0E0E0",
                }}
                onClick={() => onFriendClick(friend.friendID)}
              >
                {/* Avatar */}
                <div
                  className="flex-shrink-0 flex items-center justify-center"
                  style={{
                    width: 54, height: 54, borderRadius: "50%",
                    background: `${color}22`, border: `3px solid ${color}`, fontSize: "24px",
                  }}
                >
                  {friend.emoji ?? "👤"}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p style={{ color: "#2D3436", fontSize: "16px", fontWeight: 800 }}>{friend.name}</p>
                    {hasBirthdaySoon && (
                      <span
                        className="px-2 py-0.5"
                        style={{ background: "#FF960022", color: "#C97200", borderRadius: 8, fontSize: "10px", fontWeight: 700 }}
                      >
                        🎂 {days}d
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <p style={{ color: "#717182", fontSize: "13px", fontWeight: 600 }}>
                      {friend.userRelation ?? "Amigo/a"}
                      {age ? ` · ${age}` : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "#ECECEC" }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${progress}%`, background: color, transition: "width 0.6s ease" }}
                      />
                    </div>
                    <span style={{ color: "#717182", fontSize: "11px", fontWeight: 700, minWidth: 30 }}>
                      {progress}%
                    </span>
                  </div>
                </div>

                {/* Arrow */}
                <button
                  onClick={(e) => { e.stopPropagation(); onChatClick(friend.friendID); }}
                  className="flex-shrink-0 flex items-center justify-center"
                  style={{ width: 36, height: 36, borderRadius: 12, background: "#1CB0F622" }}
                >
                  <ChevronRight size={18} color="#1CB0F6" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Add slot */}
        {friends.length > 0 && (
          <button
            onClick={onAddFriend}
            className="w-full flex items-center justify-center gap-3 mt-3 p-4"
            style={{ background: "transparent", borderRadius: 20, border: "2.5px dashed #CCCCCC" }}
          >
            <span style={{ color: "#AAAAAA", fontSize: "14px", fontWeight: 700 }}>+ Adicionar novo amigo</span>
          </button>
        )}
      </div>

      {/* FAB */}
      <div className="fixed bottom-24 right-5 z-20">
        <button
          onClick={onAddFriend}
          className="flex items-center justify-center"
          style={{
            width: 64, height: 64, borderRadius: 22,
            background: "#1CB0F6", boxShadow: "0 6px 0 #0F8FC4",
          }}
        >
          <Plus size={32} color="white" strokeWidth={3} />
        </button>
      </div>
    </div>
  );
}
