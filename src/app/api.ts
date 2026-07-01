import type { Friend, FriendUpsertRequest, Profile, Gift, Reminder, AgentChatResponse } from "./types";

const BASE_URL = "http://localhost:8080";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as Record<string, string>).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// Users
export const getUser = (userId: string) =>
  request<{ userID: string; fullName: string; email: string }>(`/users/${userId}`);

// Friends
export const getFriends = (userId: string) =>
  request<Friend[]>(`/users/${userId}/friends`);

export const createFriend = (userId: string, data: FriendUpsertRequest) =>
  request<Friend>(`/users/${userId}/friends`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const updateFriend = (friendId: string, data: FriendUpsertRequest) =>
  request<Friend>(`/friends/${friendId}`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getFriend = (friendId: string) =>
  request<Friend>(`/friends/${friendId}`);

// Profile
export const getProfile = (friendId: string) =>
  request<Profile>(`/friends/${friendId}/profile`);

export const upsertProfile = (friendId: string, data: Partial<Profile>) =>
  request<Profile>(`/friends/${friendId}/profile`, {
    method: "PUT",
    body: JSON.stringify({ friend_id: friendId, ...data }),
  });

// Profile Agent
export const agentChat = (friendId: string, message: string) =>
  request<AgentChatResponse>("/profiles/agent/chat", {
    method: "POST",
    body: JSON.stringify({ friend_id: friendId, message }),
  });

export const agentFinalize = (friendId: string) =>
  request<AgentChatResponse>("/profiles/agent/finalize", {
    method: "POST",
    body: JSON.stringify({ friend_id: friendId }),
  });

export const deleteAgentSession = (friendId: string) =>
  request<unknown>(`/profiles/agent/session/${friendId}`, { method: "DELETE" });

// Gifts
export const getGifts = (friendId: string) =>
  request<Gift[]>(`/friends/${friendId}/gifts`);

export const createGift = (friendId: string, data: Partial<Gift>) =>
  request<Gift>(`/friends/${friendId}/gifts`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

// Suggestions
export const createSuggestions = (friendId: string, occasionDetails?: string, reminderId?: string) =>
  request<unknown>(`/profiles/${friendId}/suggestions`, {
    method: "POST",
    body: JSON.stringify({ occasion_details: occasionDetails ?? "", reminder_id: reminderId }),
  });

export const suggestionChat = (giftId: string, message: string) =>
  request<AgentChatResponse>("/suggestions/agent/chat", {
    method: "POST",
    body: JSON.stringify({ gift_id: giftId, message }),
  });

export const suggestionFinalize = (giftId: string) =>
  request<AgentChatResponse>("/suggestions/agent/finalize", {
    method: "POST",
    body: JSON.stringify({ gift_id: giftId }),
  });

// Reminders
export const getReminders = (userId: string) =>
  request<Reminder[]>(`/users/${userId}/reminders`);

export const createReminder = (userId: string, data: Partial<Reminder>) =>
  request<Reminder>(`/users/${userId}/reminders`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
