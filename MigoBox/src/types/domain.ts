export namespace domain {
  export type Gender = 'male' | 'female' | 'other';

  export type ReminderRecurrence = 'none' | 'yearly' | 'monthly' | 'weekly' | 'daily';

  export interface User {
    active?: boolean;
    birthDate?: string;
    city?: string;
    email?: string;
    fullName?: string;
    planID?: string;
    userID?: string;
  }

  export interface Friend {
    avatar?: string;
    birthDate?: string;
    city?: string;
    friendID?: string;
    gender?: Gender;
    name?: string;
    profile?: Profile;
    userID?: string;
    userRelation?: string;
  }

  export interface Profile {
    dislikes?: string[];
    embedding?: number[];
    friendID?: string;
    likes?: string[];
    personality?: string[];
  }

  export interface Gift {
    description?: string;
    friendID?: string;
    giftID?: string;
    occasionDetails?: string;
    priceRange?: string;
    reminderID?: string;
    tags?: string[];
    title?: string;
  }

  export interface Reminder {
    friendID?: string;
    message?: string;
    recurrence?: ReminderRecurrence;
    reminderID?: string;
    triggerAt?: string;
    type?: string;
    userID?: string;
  }
}
