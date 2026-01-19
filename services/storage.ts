import { TrainingRecord, Track, RaceEvent } from '../types';

const KEYS = {
  RECORDS: 'louie_records_v7',
  TRACKS: 'louie_tracks_v7',
  RACES: 'louie_races_v7',
  PREF_TRACK: 'louie_pref_track_v7',
  INIT: 'louie_init_v7'
};

// Removed 'isDefault: true' so they can be edited/deleted
const DEFAULT_TRACKS: Track[] = [
  { id: 't1', name: '10m 爆發力測速', distanceMeters: 10 },
  { id: 't2', name: '30m 衝刺測速', distanceMeters: 30 },
];

const generateMockData = () => {
  const records: TrainingRecord[] = [];
  const now = new Date();
  
  // 1. Create a "Heavy Session" (20 reps) for Yesterday on 10m
  // This is for testing the chart stability
  const heavyDay = new Date(now);
  heavyDay.setDate(heavyDay.getDate() - 1); // Yesterday
  const heavyDayStr = heavyDay.toISOString().split('T')[0];
  
  for (let i = 0; i < 20; i++) {
    // Simulate: Start strong, slight fatigue, then final push
    let baseTime = 2.1500;
    if (i > 5) baseTime += 0.05; // Fatigue starts
    if (i > 15) baseTime -= 0.08; // Final push
    
    const variation = (Math.random() * 0.15) - 0.07;
    
    records.push({
      id: `mock_heavy_${i}`,
      date: heavyDayStr,
      trackId: 't1',
      seconds: parseFloat((baseTime + variation).toFixed(4)),
      timestamp: heavyDay.getTime() + i * 120000 // 2 minutes apart
    });
  }

  // 2. Generate ~60 records for 10m scattered over last 3 months
  for (let i = 0; i < 60; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - Math.floor(Math.random() * 90) - 2); // Avoid yesterday
    
    const baseTime = 2.1000;
    // Improvement over time simulation (older dates are slower)
    const ageFactor = (90 - i) * 0.002; 
    const variation = (Math.random() * 0.4) - 0.2;
    
    records.push({
      id: `mock_10m_${i}`,
      date: date.toISOString().split('T')[0],
      trackId: 't1',
      seconds: parseFloat((baseTime + ageFactor + variation).toFixed(4)),
      timestamp: date.getTime()
    });
  }

  // 3. Generate ~30 records for 30m
  for (let i = 0; i < 30; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - Math.floor(Math.random() * 60));
    
    const baseTime = 4.5000;
    const variation = (Math.random() * 0.6) - 0.3;
    
    records.push({
      id: `mock_30m_${i}`,
      date: date.toISOString().split('T')[0],
      trackId: 't2',
      seconds: parseFloat((baseTime + variation).toFixed(4)),
      timestamp: date.getTime()
    });
  }

  const races: RaceEvent[] = [
    {
      id: 'r1',
      name: '小車神全國錦標賽',
      category: '4歲組決賽',
      date: new Date(now.getTime() + 86400000 * 14).toISOString().split('T')[0], // +14 days
      isFinished: false
    },
    {
      id: 'r6',
      name: '極速盃春季賽',
      category: '公開組',
      date: new Date(now.getTime() + 86400000 * 21).toISOString().split('T')[0], // +21 days
      isFinished: false
    },
    {
      id: 'r2',
      name: 'PushBike 夏季聯賽',
      category: '公開組',
      date: new Date(now.getTime() - 86400000 * 5).toISOString().split('T')[0], // -5 days
      isFinished: true,
      rank: '亞軍'
    },
    {
      id: 'r3',
      name: '小小騎士俱樂部盃',
      category: '3歲組',
      date: new Date(now.getTime() - 86400000 * 200).toISOString().split('T')[0], // Long ago
      isFinished: true,
      rank: '冠軍'
    },
    {
      id: 'r4',
      name: '亞洲滑步車公開賽',
      category: '菁英組',
      date: new Date(now.getTime() + 86400000 * 45).toISOString().split('T')[0], // +45 days
      isFinished: false
    },
    {
      id: 'r5',
      name: '週末衝刺賽 (高雄站)',
      category: '積分賽',
      date: new Date(now.getTime() - 86400000 * 30).toISOString().split('T')[0], // -30 days
      isFinished: true,
      rank: '第 5 名'
    }
  ];

  return { records, races };
};

export const StorageService = {
  initialize: () => {
    if (!localStorage.getItem(KEYS.INIT)) {
      const { records, races } = generateMockData();
      localStorage.setItem(KEYS.TRACKS, JSON.stringify(DEFAULT_TRACKS));
      localStorage.setItem(KEYS.RECORDS, JSON.stringify(records));
      localStorage.setItem(KEYS.RACES, JSON.stringify(races));
      localStorage.setItem(KEYS.PREF_TRACK, 't1'); // Default to 10m
      localStorage.setItem(KEYS.INIT, 'true');
    }
  },

  getTracks: (): Track[] => {
    try {
      const stored = localStorage.getItem(KEYS.TRACKS);
      if (!stored) return DEFAULT_TRACKS;
      return JSON.parse(stored);
    } catch (e) {
      return DEFAULT_TRACKS;
    }
  },

  saveTracks: (tracks: Track[]) => {
    localStorage.setItem(KEYS.TRACKS, JSON.stringify(tracks));
  },

  getPreferredTrackId: (): string => {
    return localStorage.getItem(KEYS.PREF_TRACK) || 't1';
  },

  savePreferredTrackId: (id: string) => {
    localStorage.setItem(KEYS.PREF_TRACK, id);
  },

  getTrainingRecords: (): TrainingRecord[] => {
    try {
      const stored = localStorage.getItem(KEYS.RECORDS);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (e) {
      return [];
    }
  },

  saveTrainingRecord: (record: TrainingRecord) => {
    const records = StorageService.getTrainingRecords();
    records.push(record);
    localStorage.setItem(KEYS.RECORDS, JSON.stringify(records));
  },

  saveBatchTrainingRecords: (newRecords: TrainingRecord[]) => {
    const records = StorageService.getTrainingRecords();
    const updated = [...records, ...newRecords];
    localStorage.setItem(KEYS.RECORDS, JSON.stringify(updated));
  },

  getRaces: (): RaceEvent[] => {
    try {
      const stored = localStorage.getItem(KEYS.RACES);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (e) {
      return [];
    }
  },

  saveRace: (race: RaceEvent) => {
    const races = StorageService.getRaces();
    const existingIndex = races.findIndex(r => r.id === race.id);
    if (existingIndex >= 0) {
      races[existingIndex] = race;
    } else {
      races.push(race);
    }
    localStorage.setItem(KEYS.RACES, JSON.stringify(races));
  },

  deleteRace: (id: string) => {
    const races = StorageService.getRaces().filter(r => r.id !== id);
    localStorage.setItem(KEYS.RACES, JSON.stringify(races));
  },

  deleteTrainingRecord: (id: string) => {
    const records = StorageService.getTrainingRecords().filter(r => r.id !== id);
    localStorage.setItem(KEYS.RECORDS, JSON.stringify(records));
  },
  
  clearAll: () => {
    localStorage.clear();
    localStorage.removeItem(KEYS.INIT);
  }
};
