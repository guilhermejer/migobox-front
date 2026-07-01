export type Gender = "male" | "female" | "other";

export interface Profile {
  friendID: string;
  likes: string[];
  dislikes: string[];
  personality: string[];
  embedding?: number[];
}

export interface Friend {
  friendID: string;
  userID: string;
  name: string;
  birthDate?: string;
  city?: string;
  gender?: Gender;
  userRelation?: string;
  profile?: Profile;
  // UI-only helpers
  emoji?: string;
}

export interface Gift {
  giftID: string;
  friendID: string;
  title: string;
  description: string;
  priceRange: string;
  tags: string[];
  occasionDetails?: string;
  reminderID?: string;
}

export interface Reminder {
  reminderID: string;
  userID: string;
  friendID: string;
  type: string;
  message: string;
  triggerAt: string;
}

export interface User {
  userID: string;
  fullName: string;
  email: string;
  birthDate?: string;
  city?: string;
  active: boolean;
  planID?: string;
}

// Request shapes matching Swagger
export interface FriendUpsertRequest {
  name: string;
  userRelation?: string;
  birthDate?: string;
  city?: string;
  gender?: string;
}

export interface AgentChatResponse {
  message?: string;
  response?: string;
  tags?: string[];
  [key: string]: unknown;
}
