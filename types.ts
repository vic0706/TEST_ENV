// types.ts

export interface Track {
  id: string;
  name: string;
  distanceMeters: number;
  isDefault?: boolean;
}

export interface TrainingRecord {
  id: string;
  date: string; // ISO string YYYY-MM-DD
  trackId: string;
  seconds: number;
  timestamp: number;
}

export interface RaceEvent {
  id: string;
  date: string;
  name: string;
  category: string; // New: 賽事類別 (e.g., 爭先賽, 麒麟賽)
  rank?: string; // e.g., "第 1 名", "DNF", "預賽淘汰"
  photoData?: string; // Base64 thumbnail string
  isFinished: boolean;
  notes?: string;
}

export interface DayStats {
  date: string;
  avgSeconds: number; 
  bestSeconds: number;
  avgSpeedKmh: number;
  stdDev: number;
  count: number;
  stabilityScore: number; // 0-100
}

export interface WeeklyTrend {
  weekLabel: string; // e.g., "W42"
  weekStartDate: string;
  avgSeconds: number;
  bestSeconds: number;
  recordCount: number;
}

export enum AppView {
  DASHBOARD = 'dashboard', // 總覽
  RACE_MANAGER = 'race_manager', // 賽事
  TRAINING_LOG = 'training_log', // 訓練
  TRACK_SETTINGS = 'track_settings' // 設定
}
