// src/types/index.ts

export type StudyLevel = "hsc" | "mbbs" | "university";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  studyLevel: StudyLevel;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  subject?: string;
}

export interface StudySession {
  id: string;
  userId: string;
  duration: number; // in seconds
  mode: "pomodoro" | "admission" | "hscBoard";
  subject: string;
  chapter: string;
  completedAt: Date | string;
}