import { useState } from "react";
import { HomeDashboard } from "./components/HomeDashboard";
import { AddFriend } from "./components/AddFriend";
import { ChatBuilder } from "./components/ChatBuilder";
import { FriendProfile } from "./components/FriendProfile";
import type { Friend, FriendUpsertRequest } from "./types";
import * as api from "./api";

type Screen = "home" | "add-friend" | "chat" | "profile";

// Mock user (no auth screen yet)
const MOCK_USER_ID = "user-demo-001";

// Seed friends for demo when API is unavailable
const SEED_FRIENDS: Friend[] = [
  {
    friendID: "f1",
    userID: MOCK_USER_ID,
    name: "Ana Clara",
    userRelation: "Melhor amiga",
    emoji: "🌸",
    birthDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    city: "São Paulo, SP",
    gender: "female",
    profile: {
      friendID: "f1",
      likes: ["🎨 Arte & Design", "☕ Café especial", "📚 Ficção literária", "🌿 Sustentável"],
      dislikes: ["🏋️ Academia barulhenta", "🎮 Videogames"],
      personality: ["✨ Criativa", "💬 Comunicativa", "🌙 Noturna"],
    },
  },
  {
    friendID: "f2",
    userID: MOCK_USER_ID,
    name: "Pedro Lopes",
    userRelation: "Amigo da faculdade",
    emoji: "🎸",
    city: "Curitiba, PR",
    gender: "male",
  },
  {
    friendID: "f3",
    userID: MOCK_USER_ID,
    name: "Mariana V.",
    userRelation: "Colega de trabalho",
    emoji: "✨",
    profile: {
      friendID: "f3",
      likes: ["🍕 Gastronomia", "✈️ Viagens"],
      dislikes: [],
      personality: ["😄 Extrovertida"],
    },
  },
];

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [friends, setFriends] = useState<Friend[]>(SEED_FRIENDS);
  const [activeFriendId, setActiveFriendId] = useState<string | null>(null);

  const activeFriend = friends.find((f) => f.friendID === activeFriendId) ?? null;

  const goHome = () => setScreen("home");

  const goToProfile = (id: string) => {
    setActiveFriendId(id);
    setScreen("profile");
  };

  const goToChat = (id: string) => {
    setActiveFriendId(id);
    setScreen("chat");
  };

  const goToAddFriend = () => setScreen("add-friend");

  const handleFriendCreated = (friendId: string, friendName: string, emoji: string) => {
    // Add to local state so the friend shows up immediately
    const newFriend: Friend = {
      friendID: friendId,
      userID: MOCK_USER_ID,
      name: friendName,
      emoji,
    };
    setFriends((prev) => {
      if (prev.find((f) => f.friendID === friendId)) return prev;
      return [...prev, newFriend];
    });
    setActiveFriendId(friendId);
    setScreen("chat");
  };

  const handleChatFinished = (friendId: string) => {
    // After finalizing, update the friend locally and go to profile
    setActiveFriendId(friendId);
    setScreen("profile");
  };

  const createFriendApi = async (data: FriendUpsertRequest): Promise<{ friendID: string; name: string }> => {
    const friend = await api.createFriend(MOCK_USER_ID, data);
    return { friendID: friend.friendID, name: friend.name };
  };

  return (
    <div
      className="size-full flex items-center justify-center"
      style={{
        background: "linear-gradient(135deg, #e0f7ff 0%, #f0e8ff 50%, #fff5e0 100%)",
        minHeight: "100vh",
        fontFamily: "'Nunito', sans-serif",
      }}
    >
      {/* Mobile frame */}
      <div
        className="relative flex flex-col overflow-hidden"
        style={{
          width: "100%",
          maxWidth: 430,
          height: "100vh",
          maxHeight: 900,
          background: "#F8F9FA",
          boxShadow: "0 24px 80px rgba(0,0,0,0.18)",
        }}
      >
        {/* Status bar */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-6"
          style={{ height: 44, background: "#FFFFFF", borderBottom: "1px solid #F0F0F0" }}
        >
          <span style={{ color: "#2D3436", fontSize: "13px", fontWeight: 800 }}>9:41</span>
          <div
            className="flex items-center justify-center px-3"
            style={{ height: 20, background: "#2D3436", borderRadius: 12 }}
          >
            <span style={{ fontSize: "9px", color: "white", fontWeight: 800, letterSpacing: "1px" }}>MIGOBOX</span>
          </div>
          <div className="flex items-center gap-1">
            <div style={{ width: 16, height: 8, borderRadius: 3, background: "#58CC02", border: "1.5px solid #3D9200", position: "relative" }}>
              <div style={{ position: "absolute", right: -4, top: 1.5, width: 3, height: 5, borderRadius: "0 2px 2px 0", background: "#3D9200" }} />
            </div>
          </div>
        </div>

        {/* Screen content */}
        <div className="flex-1 overflow-hidden relative">
          {screen === "home" && (
            <div className="absolute inset-0 overflow-y-auto">
              <HomeDashboard
                friends={friends}
                userName="Rodrigo"
                onFriendClick={goToProfile}
                onChatClick={goToChat}
                onAddFriend={goToAddFriend}
              />
            </div>
          )}

          {screen === "add-friend" && (
            <div className="absolute inset-0 flex flex-col">
              <AddFriend
                onBack={goHome}
                onCreated={handleFriendCreated}
                createFriendApi={createFriendApi}
              />
            </div>
          )}

          {screen === "chat" && activeFriend && (
            <div className="absolute inset-0 flex flex-col">
              <ChatBuilder
                friendId={activeFriend.friendID}
                friendName={activeFriend.name}
                friendEmoji={activeFriend.emoji}
                onBack={
                  // Go back to where we came from — if friend has no prior profile, go home
                  () => setScreen("home")
                }
                onFinish={handleChatFinished}
              />
            </div>
          )}

          {screen === "profile" && activeFriend && (
            <div className="absolute inset-0 overflow-y-auto">
              <FriendProfile
                friend={activeFriend}
                onBack={goHome}
                onChat={() => goToChat(activeFriend.friendID)}
              />
            </div>
          )}

          {/* Fallback if active friend is gone */}
          {(screen === "chat" || screen === "profile") && !activeFriend && (
            <div className="absolute inset-0 flex items-center justify-center">
              <button onClick={goHome} style={{ color: "#1CB0F6", fontWeight: 700 }}>← Voltar</button>
            </div>
          )}
        </div>

        {/* Bottom navigation — only on home */}
        {screen === "home" && (
          <div
            className="flex-shrink-0 flex items-center justify-around px-2 py-2"
            style={{ background: "#FFFFFF", borderTop: "2px solid #ECECEC", height: 68 }}
          >
            {[
              { id: "home", label: "Caixinha", emoji: "📦", active: true },
              { id: "discover", label: "Descobrir", emoji: "🔍", active: false },
              { id: "calendar", label: "Datas", emoji: "🗓️", active: false },
              { id: "me", label: "Eu", emoji: "👤", active: false },
            ].map((tab) => (
              <button
                key={tab.id}
                className="flex flex-col items-center gap-0.5 flex-1 py-1"
                style={{ border: "none", background: "transparent" }}
              >
                <div
                  className="flex items-center justify-center"
                  style={{ width: 44, height: 32, borderRadius: 12, background: tab.active ? "#1CB0F622" : "transparent" }}
                >
                  <span style={{ fontSize: "20px" }}>{tab.emoji}</span>
                </div>
                <span style={{ color: tab.active ? "#1CB0F6" : "#AAAAAA", fontSize: "10px", fontWeight: tab.active ? 800 : 600 }}>
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Home indicator */}
        <div
          className="flex-shrink-0 flex items-center justify-center"
          style={{ height: 20, background: "#FFFFFF" }}
        >
          <div style={{ width: 100, height: 4, borderRadius: 4, background: "#2D3436", opacity: 0.15 }} />
        </div>
      </div>
    </div>
  );
}
