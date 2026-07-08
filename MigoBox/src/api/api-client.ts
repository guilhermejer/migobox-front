import { Platform } from 'react-native';

import { domain } from '@/types/domain';

const defaultBaseUrl = Platform.select({
  android: 'http://10.0.2.2:8080',
  default: 'http://localhost:8080',
});

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? defaultBaseUrl;
const API_DEBUG_ENABLED = process.env.EXPO_PUBLIC_API_DEBUG === 'true' || __DEV__;
let apiRequestSeq = 0;

type ApiError = {
  status: number;
  message: string;
};

type RequestJsonOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: HeadersInit;
};

export type ProfilePhotoSignedUrlRequest = {
  contentType: 'image/jpeg' | 'image/png';
  objectName?: string;
};

export type ProfilePhotoGetUrlRequest = {
  contentType?: 'image/jpeg' | 'image/png';
  objectName?: string;
};

export const DEFAULT_PROFILE_PHOTO_CONTENT_TYPE = 'image/jpeg' as const;

export type ProfilePhotoSignedUrlResponse = {
  url: string;
  objectName: string;
  method: 'GET' | 'PUT' | 'DELETE';
  expiresAt: string;
  friendId?: string;
};

export type FriendUpsertRequest = {
  avatar?: string;
  birthDate?: string;
  city?: string;
  gender?: domain.Gender;
  name?: string;
  userRelation?: string;
};

export type UserUpsertRequest = {
  fullName?: string;
  email?: string;
  active?: boolean;
  planId?: string;
  birthDate?: string;
  city?: string;
  suggestionLookaheadDays?: number;
};

type AgentChatRequest = {
  friendID: string;
  message: string;
};

type AgentFinalizeRequest = {
  friendID: string;
};

export type AgentResponse = {
  message?: string;
  response?: string;
  reply?: string;
  tags?: string[];
  [key: string]: unknown;
};

export type SuggestionCreateRequest = {
  occasionDetails?: string;
  suggestionType?: 'gift' | 'outing' | 'mixed';
  reminderID?: string;
};

export type SuggestionChatRequest = {
  giftID: string;
  message: string;
  friendID?: string;
  occasionDetails?: string;
};

export type SuggestionFinalizeRequest = {
  giftID: string;
  friendID?: string;
};

export type SuggestionChatResponse = {
  assistantMessage?: string;
  session?: Record<string, unknown>;
};

export type SuggestionFinalizeResponse = {
  gift?: domain.Gift;
  session?: Record<string, unknown>;
  extractedSuggestion?: Record<string, unknown>;
};

export type ReminderUpsertRequest = {
  friendID?: string;
  message?: string;
  recurrence?: domain.ReminderRecurrence;
  triggerAt?: string;
  type?: string;
  userID?: string;
};

function nextApiRequestId() {
  apiRequestSeq += 1;
  return apiRequestSeq;
}

function truncateText(value: string, max = 180) {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}...`;
}

function safeSerialize(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable-body]';
  }
}

function logApi(level: 'log' | 'warn' | 'error', message: string, details?: Record<string, unknown>) {
  if (!API_DEBUG_ENABLED) return;

  if (details) {
    console[level](`[api-client] ${message}`, details);
    return;
  }

  console[level](`[api-client] ${message}`);
}

async function requestJson<T>(path: string, init?: RequestJsonOptions): Promise<T> {
  const requestId = nextApiRequestId();
  const method = init?.method ?? 'GET';
  const url = `${API_BASE_URL}${path}`;
  const bodyText = init?.body === undefined ? undefined : safeSerialize(init.body);
  const startedAt = Date.now();

  logApi('log', `#${requestId} request start`, {
    method,
    path,
    url,
    body: bodyText ? truncateText(bodyText) : undefined,
  });

  let response: Response;

  try {
    response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
      body: bodyText,
    });
  } catch (networkError) {
    logApi('error', `#${requestId} request network failure`, {
      method,
      path,
      durationMs: Date.now() - startedAt,
      error: networkError instanceof Error ? networkError.message : String(networkError),
    });

    const error: ApiError = {
      status: 0,
      message: 'Falha de rede ao chamar a API.',
    };

    throw error;
  }

  logApi('log', `#${requestId} response received`, {
    method,
    path,
    status: response.status,
    ok: response.ok,
    durationMs: Date.now() - startedAt,
  });

  if (!response.ok) {
    let message = 'Algo deu errado ao falar com a API.';

    try {
      const payload = (await response.json()) as Record<string, string>;
      const firstMessage = Object.values(payload)[0];
      if (firstMessage) {
        message = firstMessage;
      }
    } catch {
      // Ignore parse errors and keep fallback message.
    }

    const error: ApiError = {
      status: response.status,
      message,
    };

    logApi('warn', `#${requestId} request failed`, {
      method,
      path,
      status: error.status,
      message: error.message,
      durationMs: Date.now() - startedAt,
    });

    throw error;
  }

  const payload = (await response.json()) as T;

  logApi('log', `#${requestId} request success`, {
    method,
    path,
    durationMs: Date.now() - startedAt,
  });

  return payload;
}

async function executeSignedRequest(
  url: string,
  method: 'PUT' | 'DELETE',
  options?: { contentType?: string; body?: BodyInit },
) {
  const requestId = nextApiRequestId();
  const startedAt = Date.now();

  logApi('log', `#${requestId} signed request start`, {
    method,
    url: truncateText(url, 220),
    hasBody: Boolean(options?.body),
    contentType: options?.contentType,
  });

  let response: Response;

  try {
    response = await fetch(url, {
      method,
      headers: options?.contentType ? { 'Content-Type': options.contentType } : undefined,
      body: options?.body,
    });
  } catch (networkError) {
    logApi('error', `#${requestId} signed request network failure`, {
      method,
      durationMs: Date.now() - startedAt,
      error: networkError instanceof Error ? networkError.message : String(networkError),
    });

    throw new Error('Falha de rede ao executar operacao no bucket.');
  }

  logApi('log', `#${requestId} signed response received`, {
    method,
    status: response.status,
    ok: response.ok,
    durationMs: Date.now() - startedAt,
  });

  if (!response.ok) {
    logApi('warn', `#${requestId} signed request failed`, {
      method,
      status: response.status,
      durationMs: Date.now() - startedAt,
    });

    throw new Error('Nao foi possivel concluir a operacao no bucket.');
  }

  logApi('log', `#${requestId} signed request success`, {
    method,
    durationMs: Date.now() - startedAt,
  });
}

export const apiClient = {
  findUserByEmail(email: string) {
    const query = new URLSearchParams({ email });
    return requestJson<domain.User>(`/users/email?${query.toString()}`);
  },

  listFriendsByUserId(userId: string) {
    return requestJson<domain.Friend[]>(`/users/${userId}/friends`);
  },

  listRemindersByUserId(userId: string) {
    return requestJson<domain.Reminder[]>(`/users/${userId}/reminders`);
  },

  createReminder(userId: string, body: ReminderUpsertRequest) {
    return requestJson<domain.Reminder>(`/users/${userId}/reminders`, {
      method: 'PUT',
      body,
    });
  },

  updateReminder(reminderId: string, body: ReminderUpsertRequest) {
    return requestJson<domain.Reminder>(`/reminders/${reminderId}`, {
      method: 'POST',
      body,
    });
  },

  deleteReminder(reminderId: string) {
    return requestJson<domain.Reminder>(`/reminders/${reminderId}`, {
      method: 'DELETE',
    });
  },

  createFriend(userId: string, body: FriendUpsertRequest) {
    return requestJson<domain.Friend>(`/users/${userId}/friends`, {
      method: 'PUT',
      body,
    });
  },

  updateFriend(friendId: string, body: FriendUpsertRequest) {
    return requestJson<domain.Friend>(`/friends/${friendId}`, {
      method: 'POST',
      body,
    });
  },

  getFriendById(friendId: string) {
    return requestJson<domain.Friend>(`/friends/${friendId}`);
  },

  getFriendProfile(friendId: string) {
    return requestJson<domain.Profile>(`/friends/${friendId}/profile`);
  },

  updateProfile(friendId: string, body: Partial<domain.Profile> & { friendID: string }) {
    return requestJson<domain.Profile>(`/friends/${friendId}/profile`, {
      method: 'PUT',
      body,
    });
  },

  listGiftsByFriendId(friendId: string) {
    return requestJson<domain.Gift[]>(`/friends/${friendId}/gifts`);
  },

  deleteGift(giftId: string) {
    return requestJson<domain.Gift>(`/gifts/${giftId}`, {
      method: 'DELETE',
    });
  },

  createSuggestions(friendId: string, body: SuggestionCreateRequest) {
    return requestJson<Record<string, unknown>>(`/profiles/${friendId}/suggestions`, {
      method: 'POST',
      body,
    });
  },

  suggestionAgentChat(giftId: string, message: string, friendId?: string, occasionDetails?: string) {
    const body: SuggestionChatRequest = { giftID: giftId, message, friendID: friendId, occasionDetails };
    return requestJson<SuggestionChatResponse>('/suggestions/agent/chat', {
      method: 'POST',
      body,
    });
  },

  suggestionAgentFinalize(giftId: string, friendId?: string) {
    const body: SuggestionFinalizeRequest = { giftID: giftId, friendID: friendId };
    return requestJson<SuggestionFinalizeResponse>('/suggestions/agent/finalize', {
      method: 'POST',
      body,
    });
  },

  agentChat(friendId: string, message: string) {
    const body: AgentChatRequest = { friendID: friendId, message };
    return requestJson<AgentResponse>('/profiles/agent/chat', {
      method: 'POST',
      body,
    });
  },

  agentFinalize(friendId: string) {
    const body: AgentFinalizeRequest = { friendID: friendId };
    return requestJson<AgentResponse>('/profiles/agent/finalize', {
      method: 'POST',
      body,
    });
  },

  requestFriendProfilePhotoUploadUrl(friendId: string, body: ProfilePhotoSignedUrlRequest) {
    return requestJson<ProfilePhotoSignedUrlResponse>(
      `/friends/${friendId}/profile-photo/upload-url`,
      {
        method: 'POST',
        body,
      },
    );
  },

  requestFriendProfilePhotoUpdateUrl(friendId: string, body: ProfilePhotoSignedUrlRequest) {
    return requestJson<ProfilePhotoSignedUrlResponse>(
      `/friends/${friendId}/profile-photo/update-url`,
      {
        method: 'POST',
        body,
      },
    );
  },

  requestFriendProfilePhotoGetUrl(friendId: string, body: ProfilePhotoGetUrlRequest = {}) {
    const requestBody: ProfilePhotoGetUrlRequest = {
      contentType: DEFAULT_PROFILE_PHOTO_CONTENT_TYPE,
      ...body,
    };
    return requestJson<ProfilePhotoSignedUrlResponse>(
      `/friends/${friendId}/profile-photo/get-url`,
      {
        method: 'POST',
        body: requestBody,
      },
    );
  },

  requestFriendProfilePhotoDeleteUrl(friendId: string) {
    return requestJson<ProfilePhotoSignedUrlResponse>(
      `/friends/${friendId}/profile-photo/delete-url`,
      {
        method: 'POST',
      },
    );
  },

  executeSignedProfilePhotoRequest: executeSignedRequest,

  getUserById(userId: string) {
    return requestJson<domain.User>(`/users/${userId}`);
  },

  updateUser(userId: string, body: UserUpsertRequest) {
    return requestJson<domain.User>(`/users/${userId}`, {
      method: 'POST',
      body,
    });
  },
};

export type { ApiError };
