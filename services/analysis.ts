import { TrainingRecord, Track, DayStats, WeeklyTrend } from '../types';
import { startOfWeek, format, subWeeks, isAfter, isSameWeek } from 'date-fns';

const calculateSpeed = (meters: number, seconds: number) => {
  if (seconds === 0) return 0;
  return (meters / 1000) / (seconds / 3600);
};

const calculateStdDev = (values: number[]) => {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
};

export const analyzeTrackData = (records: TrainingRecord[], track: Track): {
  dailyStats: DayStats[];
  weeklyTrend: WeeklyTrend[];
} => {
  const trackRecords = records
    .filter(r => r.trackId === track.id)
    .sort((a, b) => a.timestamp - b.timestamp);

  if (trackRecords.length === 0) {
    return { dailyStats: [], weeklyTrend: [] };
  }

  // --- Daily Stats ---
  const groupedByDate: { [date: string]: TrainingRecord[] } = {};
  trackRecords.forEach(r => {
    if (!groupedByDate[r.date]) groupedByDate[r.date] = [];
    groupedByDate[r.date].push(r);
  });

  const dailyStats: DayStats[] = Object.keys(groupedByDate).map(date => {
    const dayRecords = groupedByDate[date];
    const times = dayRecords.map(r => r.seconds);

    const avgSeconds = times.reduce((a, b) => a + b, 0) / times.length;
    const bestSeconds = Math.min(...times);
    const avgSpeedKmh = calculateSpeed(track.distanceMeters, avgSeconds);
    
    // Stability
    const stdDev = calculateStdDev(times);
    // CV logic: Lower CV is better. 
    // CV 0.02 (2%) -> Score 90+. CV 0.10 (10%) -> Score 50.
    const cv = avgSeconds > 0 ? stdDev / avgSeconds : 0; 
    let stabilityScore = Math.max(0, 100 - (cv * 500)); 
    if (dayRecords.length < 3) stabilityScore = 0;

    return {
      date,
      avgSeconds,
      bestSeconds,
      avgSpeedKmh,
      stdDev,
      count: dayRecords.length,
      stabilityScore
    };
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Reverse chronologically for list

  // --- Weekly Trend (Last 4 Weeks) ---
  const weeklyTrend: WeeklyTrend[] = [];
  const today = new Date();
  
  // Generate last 4 weeks buckets
  for (let i = 3; i >= 0; i--) {
    const weekStart = startOfWeek(subWeeks(today, i), { weekStartsOn: 1 }); // Monday start
    const weekLabel = i === 0 ? '本週' : format(weekStart, 'MM/dd');
    
    // Find records in this week
    const weeksRecords = trackRecords.filter(r => 
      isSameWeek(new Date(r.date), weekStart, { weekStartsOn: 1 })
    );

    if (weeksRecords.length > 0) {
        const times = weeksRecords.map(r => r.seconds);
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const best = Math.min(...times);
        weeklyTrend.push({
            weekLabel,
            weekStartDate: format(weekStart, 'yyyy-MM-dd'),
            avgSeconds: avg,
            bestSeconds: best,
            recordCount: weeksRecords.length
        });
    } else {
        // Push empty placeholder to keep chart scale consistent or just skip
        weeklyTrend.push({
            weekLabel,
            weekStartDate: format(weekStart, 'yyyy-MM-dd'),
            avgSeconds: 0,
            bestSeconds: 0,
            recordCount: 0
        });
    }
  }

  return { dailyStats, weeklyTrend };
};

export const getStabilityLabel = (score: number, count: number): { label: string; color: string; desc: string } => {
  if (count < 3) return { label: '數據不足', color: 'text-gray-500', desc: '需更多趟數' };
  if (score >= 90) return { label: '極致精確', color: 'text-indigo-400', desc: '如機器般穩定' };
  if (score >= 80) return { label: '高度穩定', color: 'text-emerald-400', desc: '控制力優異' };
  if (score >= 60) return { label: '狀態良好', color: 'text-blue-400', desc: '表現持平' };
  if (score >= 40) return { label: '稍有波動', color: 'text-yellow-400', desc: '需提升專注' };
  return { label: '狀態發散', color: 'text-rose-400', desc: '建議調整節奏' };
};
