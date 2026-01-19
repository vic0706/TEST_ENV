import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Activity, Settings, Save, Trash2, Zap, Trophy, Timer, Camera, BarChart3, LineChart as ChartIcon, Search, Filter, X, ChevronRight, CheckCircle2, History, ChevronDown, Edit2, Check, ArrowRight, Upload } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine } from 'recharts';
import { format, differenceInDays, isFuture, parseISO, isPast, compareAsc, compareDesc } from 'date-fns';

import { StorageService } from './services/storage';
import { analyzeTrackData, getStabilityLabel } from './services/analysis';
import { Card, Button, StatBox } from './components/ui_components';
import { AppView, TrainingRecord, Track, RaceEvent } from './types';

// --- Helper for Image Compression ---
const compressImage = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600; 
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

// --- Custom Icon: Balance Bike ---
const BalanceBikeIcon = ({ size = 24, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    {/* Rear Wheel */}
    <circle cx="5.5" cy="17.5" r="3.5" />
    {/* Front Wheel */}
    <circle cx="18.5" cy="17.5" r="3.5" />
    {/* Frame Body - simplified for balance bike */}
    <path d="M5.5 17.5 L9 9 L16 11" /> 
    <path d="M9 9 L6 11" /> {/* Seat post area */}
    <path d="M16 11 L18.5 17.5" /> {/* Fork */}
    <path d="M16 11 L16 8 L19 8" /> {/* Handlebars */}
    <path d="M9 9 L7 7" /> {/* Seat */}
  </svg>
);

// --- SUB-COMPONENTS ---

// Modal to show details of a specific training day
const DayDetailModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  date: string;
  records: TrainingRecord[];
  trackName: string;
}> = ({ isOpen, onClose, date, records, trackName }) => {
  if (!isOpen) return null;

  // Prepare data for chart (Individual runs)
  const chartData = records.map((r, idx) => ({
    run: idx + 1,
    seconds: r.seconds,
  }));

  const avg = records.reduce((a, b) => a + b.seconds, 0) / records.length;
  const best = Math.min(...records.map(r => r.seconds));
  const worst = Math.max(...records.map(r => r.seconds));
  const spread = (worst - best).toFixed(4);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900 shrink-0">
          <div>
             <h3 className="text-white font-bold text-lg">{format(parseISO(date), 'MM/dd')} 訓練詳情</h3>
             <p className="text-slate-400 text-xs">{trackName} - 共 {records.length} 趟</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-white hover:bg-slate-700"><X size={20}/></button>
        </div>
        
        <div className="p-4 overflow-y-auto">
           {/* Chart: Run by Run Analysis */}
           <div className="h-64 w-full bg-slate-800/50 rounded-xl p-2 mb-4 border border-slate-700/50">
             <h4 className="text-slate-500 text-[10px] font-bold uppercase mb-2 text-center">單日穩定性分析 (趟次走勢)</h4>
             <ResponsiveContainer width="100%" height="90%">
               <LineChart data={chartData} margin={{top: 5, right: 10, left: -20, bottom: 0}}>
                 <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                 <XAxis type="number" dataKey="run" tickCount={Math.min(records.length, 10)} domain={[1, 'dataMax']} stroke="#64748b" fontSize={10} />
                 <YAxis type="number" domain={['dataMin - 0.05', 'dataMax + 0.05']} stroke="#64748b" fontSize={10} />
                 <Tooltip 
                   contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }}
                   formatter={(val: any) => Number(val).toFixed(4) + 's'}
                   labelFormatter={(val) => `第 ${val} 趟`}
                 />
                 <ReferenceLine y={avg} stroke="#fbbf24" strokeDasharray="3 3" />
                 <Line type="monotone" dataKey="seconds" stroke="#f43f5e" strokeWidth={2} dot={{r: 3, fill:'#f43f5e'}} activeDot={{r: 5}} animationDuration={500} />
               </LineChart>
             </ResponsiveContainer>
           </div>
           
           <div className="flex justify-between mb-4 bg-slate-800 p-3 rounded-xl">
             <div className="text-center">
               <div className="text-[10px] text-slate-500">極速</div>
               <div className="text-emerald-400 font-bold font-mono">{best.toFixed(4)}</div>
             </div>
             <div className="text-center">
               <div className="text-[10px] text-slate-500">平均</div>
               <div className="text-amber-400 font-bold font-mono">{avg.toFixed(4)}</div>
             </div>
             <div className="text-center">
               <div className="text-[10px] text-slate-500">秒差</div>
               <div className="text-rose-400 font-bold font-mono">{spread}</div>
             </div>
           </div>

           {/* List */}
           <h4 className="text-slate-500 text-xs font-bold mb-2">詳細數據</h4>
           <div className="space-y-1">
             {records.map((r, i) => (
               <div key={r.id} className="flex justify-between items-center p-3 bg-slate-800 rounded-lg border border-slate-700/50 hover:bg-slate-700 transition-colors">
                 <div className="flex items-center gap-3">
                    <span className="text-slate-500 font-mono text-xs w-6">#{i + 1}</span>
                    <span className="text-slate-400 text-xs">{format(new Date(r.timestamp), 'HH:mm')}</span>
                 </div>
                 <span className={`font-mono font-bold text-lg ${r.seconds === best ? 'text-emerald-400' : 'text-white'}`}>
                   {r.seconds.toFixed(4)}
                 </span>
               </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
};

// --- VIEWS ---

// 1. DASHBOARD VIEW
const DashboardView: React.FC<{ 
  tracks: Track[], 
  records: TrainingRecord[],
  races: RaceEvent[],
  preferredTrackId: string,
  onNavigate: (view: AppView) => void
}> = ({ tracks, records, races, preferredTrackId, onNavigate }) => {
  const [selectedTrackId, setSelectedTrackId] = useState(preferredTrackId);
  const selectedTrack = tracks.find(t => t.id === selectedTrackId);
  const [detailDate, setDetailDate] = useState<string | null>(null);

  useEffect(() => {
    if (tracks.find(t => t.id === preferredTrackId)) {
        setSelectedTrackId(preferredTrackId);
    } else if (tracks.length > 0 && !selectedTrack) {
        setSelectedTrackId(tracks[0].id);
    }
  }, [preferredTrackId, tracks, selectedTrack]);

  const stats = useMemo(() => {
    if (!selectedTrack) return null;
    return analyzeTrackData(records, selectedTrack);
  }, [records, selectedTrack]);

  // Sort upcoming races: Nearest date first (Ascending)
  const allUpcomingRaces = races
    .filter(r => isFuture(parseISO(r.date)) && !r.isFinished)
    .sort((a, b) => compareAsc(parseISO(a.date), parseISO(b.date)));
  
  // Requirement: Show Max 2
  const visibleRaces = allUpcomingRaces.slice(0, 2);
  const hasMoreRaces = allUpcomingRaces.length > 2;
  
  const selectedDayRecords = useMemo(() => {
    if (!detailDate || !selectedTrack) return [];
    return records
      .filter(r => r.date === detailDate && r.trackId === selectedTrack.id)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [detailDate, records, selectedTrack]);

  return (
    <div className="space-y-6 pb-24">
      <DayDetailModal 
        isOpen={!!detailDate} 
        onClose={() => setDetailDate(null)}
        date={detailDate || ''}
        records={selectedDayRecords}
        trackName={selectedTrack?.name || ''}
      />

      {/* 1. Announcements */}
      <div className="space-y-3">
        <div className="flex justify-between items-end px-1">
             <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">近期賽事公告</h3>
             {hasMoreRaces && (
                 <button onClick={() => onNavigate(AppView.RACE_MANAGER)} className="text-[10px] text-red-400 flex items-center gap-1 hover:text-red-300">
                     還有 {allUpcomingRaces.length - 2} 場 <ArrowRight size={10} />
                 </button>
             )}
        </div>
        
        {visibleRaces.length > 0 ? (
          visibleRaces.map(race => {
              const daysLeft = differenceInDays(parseISO(race.date), new Date());
              return (
                  <div key={race.id} className="bg-gradient-to-r from-red-900/40 to-slate-900 border border-red-500/30 rounded-2xl p-4 flex items-center justify-between shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
                      <div>
                          <div className="flex items-center gap-2 text-red-300 mb-1">
                              <Trophy size={14} />
                              <span className="text-xs font-bold">{format(parseISO(race.date), 'yyyy/MM/dd')}</span>
                          </div>
                          <h4 className="text-white font-bold text-lg">{race.name}</h4>
                          <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded mt-1 inline-block">{race.category}</span>
                      </div>
                      <div className="text-center bg-red-600/20 rounded-lg p-2 min-w-[70px]">
                          <div className="text-xs text-red-300">倒數</div>
                          <div className="text-xl font-black text-white">{daysLeft}</div>
                          <div className="text-[10px] text-red-300">天</div>
                      </div>
                  </div>
              );
          })
        ) : (
          <div className="text-slate-600 text-sm p-4 border border-slate-800 rounded-xl border-dashed text-center">
            目前無近期賽事
          </div>
        )}
      </div>

      {/* 2. Stats Control */}
      <div className="flex items-center justify-between pt-2">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="text-emerald-500" size={20}/>
            數據總覽
        </h2>
        <select 
          value={selectedTrackId}
          onChange={(e) => setSelectedTrackId(e.target.value)}
          className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none font-medium max-w-[150px]"
        >
          {tracks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {!stats || stats.dailyStats.length === 0 ? (
        <div className="text-center text-slate-500 py-12 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
          <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
          <p>此賽道尚無訓練數據</p>
        </div>
      ) : (
        <>
           {/* 3. Trend Chart */}
           <Card>
            <div className="flex justify-between items-end mb-4">
                <h3 className="text-slate-400 text-xs font-bold uppercase">4週成績趨勢 (平均/最快)</h3>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.weeklyTrend} margin={{ right: 10, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="weekLabel" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                    itemStyle={{ fontSize: '12px' }}
                    formatter={(val: number) => val > 0 ? val.toFixed(3) + 's' : '無數據'}
                    labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{fontSize: '12px'}}/>
                  <Line type="monotone" dataKey="avgSeconds" name="平均" stroke="#fbbf24" strokeWidth={3} dot={{r: 4, strokeWidth:0, fill:'#fbbf24'}} connectNulls />
                  <Line type="monotone" dataKey="bestSeconds" name="最快" stroke="#34d399" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* 4. Daily Performance List (Clickable) */}
          <div className="space-y-4">
            <h3 className="text-slate-400 text-xs font-bold uppercase px-1">單日訓練清單 (點擊查看圖表)</h3>
            <div className="overflow-y-auto max-h-[400px]">
                {stats.dailyStats.map((day) => {
                const stability = getStabilityLabel(day.stabilityScore, day.count);
                return (
                    <div key={day.date} onClick={() => setDetailDate(day.date)} className="cursor-pointer mb-2">
                        <Card className="group hover:bg-slate-800/80 transition-colors border-l-4 border-l-transparent hover:border-l-red-500 relative overflow-hidden">
                        <div className="flex justify-between items-center border-b border-slate-700/50 pb-3 mb-3 relative z-10">
                            <div className="flex items-center gap-2">
                                <div className="bg-slate-700 w-1 h-8 rounded-full"></div>
                                <div>
                                    <div className="text-white font-mono font-bold text-lg leading-none">{format(parseISO(day.date), 'MM/dd')}</div>
                                    <div className="text-[10px] text-slate-500 uppercase font-bold">{format(parseISO(day.date), 'EEEE')}</div>
                                </div>
                            </div>
                            <div className="text-right flex items-center gap-2">
                                <div className="text-right">
                                    <div className={`text-xs font-bold ${stability.color} flex items-center gap-1 justify-end`}>
                                        <Activity size={12} />
                                        {stability.label}
                                    </div>
                                    <div className="text-[10px] text-slate-500">{stability.desc}</div>
                                </div>
                                <ChevronRight size={16} className="text-slate-600" />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 relative z-10">
                            <StatBox 
                            label="平均" 
                            value={day.avgSeconds.toFixed(2)} 
                            sub="秒" 
                            color="text-amber-400"
                            />
                            <StatBox 
                            label="最快" 
                            value={day.bestSeconds.toFixed(2)} 
                            sub="秒" 
                            color="text-emerald-400"
                            />
                            <StatBox 
                            label="趟數" 
                            value={day.count} 
                            sub="趟" 
                            color="text-slate-300"
                            />
                        </div>
                        </Card>
                    </div>
                );
                })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// 2. RACE MANAGER VIEW
const RaceManagerView: React.FC<{
  races: RaceEvent[],
  onSave: (r: RaceEvent) => void,
  onDelete: (id: string) => void
}> = ({ races, onSave, onDelete }) => {
  const [viewState, setViewState] = useState<'list' | 'edit'>('list');
  const [editId, setEditId] = useState<string | null>(null);
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');

  // Form State
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('');
  const [rank, setRank] = useState('');
  const [photoData, setPhotoData] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derived Data
  const categories = useMemo(() => {
    const cats = new Set(races.map(r => r.category).filter(Boolean));
    return ['All', ...Array.from(cats)];
  }, [races]);

  const sortedAndFilteredRaces = useMemo(() => {
    let result = races.filter(r => {
        const matchesName = r.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCat = filterCategory === 'All' || r.category === filterCategory;
        return matchesName && matchesCat;
    });

    // Special Sort: "The closer the date, the higher it ranks"
    // Split into Future and Past
    const future = result.filter(r => isFuture(parseISO(r.date)) || differenceInDays(parseISO(r.date), new Date()) === 0);
    const past = result.filter(r => isPast(parseISO(r.date)) && differenceInDays(parseISO(r.date), new Date()) !== 0);

    // Sort Future: Ascending (Soonest first)
    future.sort((a, b) => compareAsc(parseISO(a.date), parseISO(b.date)));
    
    // Sort Past: Descending (Most recent first)
    past.sort((a, b) => compareDesc(parseISO(a.date), parseISO(b.date)));

    return [...future, ...past];
  }, [races, searchTerm, filterCategory]);

  const resetForm = () => {
    setName('');
    setDate('');
    setCategory('');
    setRank('');
    setPhotoData(undefined);
    setEditId(null);
    setViewState('list');
  };

  const handleEdit = (race: RaceEvent) => {
    setName(race.name);
    setDate(race.date);
    setCategory(race.category);
    setRank(race.rank || '');
    setPhotoData(race.photoData);
    setEditId(race.id);
    setViewState('edit');
  };

  const handleSave = () => {
    if (!name || !date || !category) return;
    const isFinished = !!rank;
    onSave({
      id: editId || Date.now().toString(),
      name,
      date,
      category,
      rank,
      photoData,
      isFinished
    });
    resetForm();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const compressed = await compressImage(e.target.files[0]);
        setPhotoData(compressed);
      } catch (err) {
        alert("圖片上傳失敗");
      }
    }
  };

  if (viewState === 'edit') {
      return (
        <div className="space-y-6 pb-24">
            <h2 className="text-2xl font-black text-white">{editId ? '編輯賽事' : '新增賽事'}</h2>
            <Card className="animate-fade-in border-red-500/30">
                <div className="space-y-4">
                    <div>
                        <label className="block text-slate-400 text-xs mb-1">賽事名稱</label>
                        <input className="w-full bg-slate-900 text-white p-3 rounded-xl border border-slate-700" 
                            value={name} onChange={e => setName(e.target.value)} placeholder="例: 全國滑步車大賽" />
                    </div>
                    <div>
                        <label className="block text-slate-400 text-xs mb-1">賽事類別</label>
                        <input className="w-full bg-slate-900 text-white p-3 rounded-xl border border-slate-700" 
                            value={category} onChange={e => setCategory(e.target.value)} placeholder="例: 3歲組, 公開組" list="category-suggestions"/>
                        <datalist id="category-suggestions">
                            {categories.filter(c => c !== 'All').map(c => <option key={c} value={c} />)}
                        </datalist>
                    </div>
                    <div>
                        <label className="block text-slate-400 text-xs mb-1">比賽日期</label>
                        <input type="date" className="w-full bg-slate-900 text-white p-3 rounded-xl border border-slate-700" 
                            value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-slate-400 text-xs mb-1">名次 (完賽後填寫)</label>
                        <input className="w-full bg-slate-900 text-white p-3 rounded-xl border border-slate-700" 
                            value={rank} onChange={e => setRank(e.target.value)} placeholder="未填寫則視為未來賽事" />
                    </div>
                    <div>
                        <label className="block text-slate-400 text-xs mb-1">賽事照片</label>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-slate-700 hover:bg-slate-600 text-white p-3 rounded-xl flex items-center gap-2 text-sm"
                            >
                                <Camera size={18} /> {photoData ? '更換照片' : '上傳照片'}
                            </button>
                            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                            {photoData && <div className="text-emerald-500 text-xs flex items-center gap-1"><Zap size={12}/> 已選擇</div>}
                        </div>
                        {photoData && (
                            <div className="mt-2 w-full h-32 rounded-lg overflow-hidden bg-black relative">
                                <img src={photoData} alt="Preview" className="w-full h-full object-cover opacity-80" />
                                <button onClick={() => setPhotoData(undefined)} className="absolute top-1 right-1 bg-black/50 p-1 rounded-full text-white"><Trash2 size={12}/></button>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2 pt-2">
                        <Button onClick={resetForm} variant="secondary" className="flex-1">取消</Button>
                        <Button onClick={handleSave} className="flex-1">儲存</Button>
                    </div>
                </div>
            </Card>
        </div>
      );
  }

  return (
    <div className="space-y-6 pb-24">
       <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black text-white">賽事履歷</h2>
          <Button onClick={() => setViewState('edit')} className="px-3 py-2 text-xs bg-red-600">
                <Plus size={16} /> 新增
          </Button>
       </div>

       {/* Search & Filter */}
       <div className="flex gap-2">
           <div className="relative flex-1">
               <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
               <input 
                 className="w-full bg-slate-800 text-white pl-9 pr-3 py-2 rounded-lg border border-slate-700 text-sm outline-none focus:border-red-500"
                 placeholder="搜尋賽事名稱..."
                 value={searchTerm}
                 onChange={e => setSearchTerm(e.target.value)}
               />
           </div>
           <div className="relative">
               <select 
                 className="bg-slate-800 text-white pl-3 pr-8 py-2 rounded-lg border border-slate-700 text-sm outline-none appearance-none"
                 value={filterCategory}
                 onChange={e => setFilterCategory(e.target.value)}
               >
                 {categories.map(c => <option key={c} value={c}>{c === 'All' ? '全部分類' : c}</option>)}
               </select>
               <Filter size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"/>
           </div>
       </div>

       <div className="space-y-4">
            {sortedAndFilteredRaces.length === 0 && <div className="text-center text-slate-500 py-10">查無資料</div>}
            {sortedAndFilteredRaces.map(race => (
                <div key={race.id} className="bg-slate-800 rounded-2xl overflow-hidden shadow-lg border border-slate-700">
                    {race.photoData && (
                        <div className="h-40 w-full relative">
                             <img src={race.photoData} alt={race.name} className="w-full h-full object-cover" />
                             <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
                        </div>
                    )}
                    <div className="p-4 relative">
                        {!race.photoData && <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>}
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-slate-400 text-xs font-mono">{race.date}</span>
                                    <span className="bg-slate-700 text-slate-300 text-[10px] px-2 py-0.5 rounded-full">{race.category}</span>
                                </div>
                                <h3 className="text-white font-bold text-lg leading-tight mb-1">{race.name}</h3>
                                {race.rank ? (
                                    <div className="text-emerald-400 font-bold mt-1 flex items-center gap-1">
                                        <Trophy size={14} /> {race.rank}
                                    </div>
                                ) : (
                                    <div className="text-red-400 text-xs mt-1 font-bold">即將到來</div>
                                )}
                            </div>
                            <div className="flex gap-2 ml-2">
                                <button onClick={() => handleEdit(race)} className="p-2 text-slate-400 hover:text-white bg-slate-700/50 rounded-lg"><Settings size={16}/></button>
                                <button onClick={() => onDelete(race.id)} className="p-2 text-rose-500 hover:bg-rose-900/20 bg-slate-700/50 rounded-lg"><Trash2 size={16}/></button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
         </div>
    </div>
  );
};

// 3. TRAINING LOG VIEW
const TrainingLogView: React.FC<{ 
  tracks: Track[], 
  onSave: (r: Omit<TrainingRecord, 'id' | 'timestamp'>) => void,
  onBatchSave: (rs: TrainingRecord[]) => void
}> = ({ tracks, onSave, onBatchSave }) => {
  const [trackId, setTrackId] = useState(tracks[0]?.id || '');
  const [seconds, setSeconds] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showSuccess, setShowSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tracks.length > 0 && !tracks.find(t => t.id === trackId)) {
        setTrackId(tracks[0].id);
    }
  }, [tracks, trackId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!seconds || !trackId) return;
    
    onSave({ date, trackId, seconds: parseFloat(seconds) });
    
    // Continuous entry: Clear seconds, Show success, Refocus
    setSeconds('');
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
    
    if (inputRef.current) {
        inputRef.current.focus();
    }
  };

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split('\n');
      const newRecords: TrainingRecord[] = [];
      let successCount = 0;

      // Expected format: Date(YYYY-MM-DD),Seconds OR Seconds (uses selected date)
      // Header check: Skip first line if it contains "date" or "seconds"
      const startIndex = lines[0].toLowerCase().includes('second') ? 1 : 0;

      for (let i = startIndex; i < lines.length; i++) {
         const line = lines[i].trim();
         if (!line) continue;
         
         const parts = line.split(',');
         let recordDate = date;
         let recordSeconds = 0;

         if (parts.length === 2) {
             // Date, Seconds
             const d = parts[0].trim();
             const s = parseFloat(parts[1].trim());
             if (d.match(/^\d{4}-\d{2}-\d{2}$/) && !isNaN(s)) {
                 recordDate = d;
                 recordSeconds = s;
             }
         } else if (parts.length === 1) {
             // Just Seconds
             const s = parseFloat(parts[0].trim());
             if (!isNaN(s)) {
                 recordSeconds = s;
             }
         }

         if (recordSeconds > 0) {
             newRecords.push({
                 id: Date.now().toString() + Math.random().toString().slice(2),
                 date: recordDate,
                 trackId: trackId, // Import to currently selected track
                 seconds: recordSeconds,
                 timestamp: new Date(recordDate).getTime() + i // slight offset to keep order
             });
             successCount++;
         }
      }

      if (successCount > 0) {
          onBatchSave(newRecords);
          alert(`成功匯入 ${successCount} 筆數據！`);
      } else {
          alert('匯入失敗，請檢查格式。\n格式: YYYY-MM-DD,秒數 或 僅秒數');
      }
      
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 animate-fade-in pt-4 relative">
       
      {showSuccess && (
          <div className="absolute top-0 left-0 right-0 z-50 flex justify-center animate-fade-in">
              <div className="bg-emerald-500 text-white px-6 py-2 rounded-full shadow-lg font-bold flex items-center gap-2">
                  <CheckCircle2 size={18} /> 儲存成功！可繼續輸入
              </div>
          </div>
      )}

      <div className="text-center">
        <h2 className="text-2xl font-black text-white tracking-tight">專項訓練</h2>
        <p className="text-slate-400 text-sm mt-1">連續輸入或批量匯入</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">選擇項目</label>
          <div className="relative">
             <select 
               value={trackId}
               onChange={(e) => setTrackId(e.target.value)}
               className="w-full bg-slate-900 text-white text-lg p-4 rounded-xl border border-slate-700 appearance-none outline-none focus:border-red-500 font-bold"
             >
                {tracks.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
             </select>
             <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">成績輸入</label>
          <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800 flex flex-col items-center justify-center relative">
            <input
              ref={inputRef}
              type="number"
              step="0.0001"
              inputMode="decimal"
              value={seconds}
              onChange={(e) => setSeconds(e.target.value)}
              className="w-full bg-transparent text-white text-5xl font-mono font-black text-center outline-none placeholder:text-slate-800"
              placeholder="0.0000"
              required
            />
            <span className="text-slate-500 font-bold mt-2 text-sm tracking-widest">SECONDS</span>
          </div>
        </div>

        <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">日期</label>
            <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-900 text-white p-4 rounded-xl border border-slate-800 outline-none focus:border-red-500 font-mono"
                required
            />
        </div>

        <Button type="submit" className="w-full text-lg py-4 mt-4 bg-red-600 hover:bg-red-500 shadow-xl shadow-red-900/20 active:scale-95 transition-transform">
          <Save size={20} />
          確認儲存 (下一筆)
        </Button>
      </form>
      
      {/* CSV Upload Section */}
      <div className="border-t border-slate-800 pt-6 mt-6">
          <h3 className="text-slate-400 text-xs font-bold uppercase mb-3 text-center">批量匯入 (CSV)</h3>
          <div className="flex gap-2">
             <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border border-slate-700 border-dashed rounded-xl p-4 text-slate-400 hover:text-white hover:border-red-500 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
             >
                <Upload size={18} />
                <span className="text-sm font-bold">點擊上傳 CSV 檔案</span>
             </button>
             <input 
               type="file" 
               accept=".csv" 
               ref={fileInputRef} 
               onChange={handleCsvImport} 
               className="hidden" 
             />
          </div>
          <p className="text-[10px] text-slate-500 text-center mt-2">
            格式: <span className="font-mono text-slate-400">YYYY-MM-DD,秒數</span> 或 <span className="font-mono text-slate-400">僅秒數</span> (使用上方選定日期)
          </p>
      </div>
    </div>
  );
};

// 4. SETTINGS VIEW
const SettingsView: React.FC<{
  tracks: Track[],
  setTracks: (t: Track[]) => void,
  preferredTrackId: string,
  setPreferredTrackId: (id: string) => void
}> = ({ tracks, setTracks, preferredTrackId, setPreferredTrackId }) => {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const addTrack = () => {
    if (!newName) return;
    const newTrack: Track = {
      id: Date.now().toString(),
      name: newName,
      distanceMeters: 0 
    };
    const updated = [...tracks, newTrack];
    setTracks(updated);
    StorageService.saveTracks(updated);
    setNewName('');
  };

  const removeTrack = (id: string) => {
    if (confirm('確定刪除此賽道項目？相關數據保留但不再顯示。')) {
      const updated = tracks.filter(t => t.id !== id);
      setTracks(updated);
      StorageService.saveTracks(updated);
      if (id === preferredTrackId && updated.length > 0) {
          setPreferredTrackId(updated[0].id);
      }
    }
  };

  const startEdit = (t: Track) => {
      setEditingId(t.id);
      setEditName(t.name);
  };

  const saveEdit = () => {
      if (editingId && editName) {
          const updated = tracks.map(t => t.id === editingId ? { ...t, name: editName } : t);
          setTracks(updated);
          StorageService.saveTracks(updated);
          setEditingId(null);
      }
  };

  const handleSetPreferred = (id: string) => {
    setPreferredTrackId(id);
    StorageService.savePreferredTrackId(id);
  };

  return (
    <div className="space-y-8 pb-20">
      <h2 className="text-2xl font-black text-white">設定</h2>
      
      {/* 1. Add Track */}
      <section>
        <h3 className="text-slate-400 text-xs font-bold uppercase mb-3 ml-1">新增項目</h3>
        <Card>
            <div className="flex gap-2">
            <input 
                className="flex-1 bg-slate-900 text-white p-3 rounded-xl border border-slate-700 outline-none placeholder:text-slate-600"
                placeholder="輸入項目名稱..."
                value={newName}
                onChange={e => setNewName(e.target.value)}
            />
            <Button onClick={addTrack} className="bg-slate-700 hover:bg-slate-600">
                <Plus size={20} />
            </Button>
            </div>
        </Card>
      </section>

      {/* 2. Manage Tracks & Default */}
      <section>
        <h3 className="text-slate-400 text-xs font-bold uppercase mb-3 ml-1">項目管理 (預設/編輯)</h3>
        <p className="text-[10px] text-slate-500 mb-3 ml-1">點擊圓圈設定首頁預設顯示的項目</p>
        <div className="space-y-2">
            {tracks.map(t => (
            <div key={t.id} className="flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700">
                
                {/* Left Side: Select Default */}
                <div className="flex items-center gap-3 cursor-pointer mr-2" onClick={() => handleSetPreferred(t.id)}>
                     <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
                        preferredTrackId === t.id ? 'border-red-500 bg-red-600' : 'border-slate-600'
                    }`}>
                        {preferredTrackId === t.id && <div className="w-2 h-2 bg-white rounded-full"></div>}
                    </div>
                </div>

                {/* Middle: Content */}
                <div className="flex-1 mr-2">
                    {editingId === t.id ? (
                        <div className="flex gap-2">
                            <input 
                                className="w-full bg-slate-900 text-white p-2 text-sm rounded-lg border border-slate-600 outline-none"
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                                autoFocus
                            />
                            <button onClick={saveEdit} className="bg-emerald-600 text-white p-2 rounded-lg"><Check size={16}/></button>
                            <button onClick={() => setEditingId(null)} className="bg-slate-600 text-white p-2 rounded-lg"><X size={16}/></button>
                        </div>
                    ) : (
                        <div className={`font-bold ${preferredTrackId === t.id ? 'text-white' : 'text-slate-300'}`}>{t.name}</div>
                    )}
                </div>

                {/* Right Side: Actions */}
                {editingId !== t.id && (
                     <div className="flex gap-1">
                        <button onClick={() => startEdit(t)} className="text-red-400 p-2 hover:bg-slate-700 rounded-lg">
                            <Edit2 size={16} />
                        </button>
                        <button onClick={() => removeTrack(t.id)} className="text-rose-500 p-2 hover:bg-rose-500/10 rounded-lg">
                            <Trash2 size={16} />
                        </button>
                    </div>
                )}
            </div>
            ))}
        </div>
      </section>

      <div className="pt-4 text-center">
         <Button variant="secondary" onClick={() => {
             if(confirm('這將清除所有數據並重置為測試狀態，確定嗎？')) {
                 StorageService.clearAll();
                 window.location.reload();
             }
         }} className="w-full text-xs py-3 border border-slate-700">
            <History size={14} /> 重置所有數據 (測試用)
         </Button>
      </div>
    </div>
  );
};


// --- MAIN APP ---
export default function App() {
  const [view, setView] = useState<AppView>(AppView.DASHBOARD);
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [races, setRaces] = useState<RaceEvent[]>([]);
  const [preferredTrackId, setPreferredTrackId] = useState('');

  useEffect(() => {
    // Initialize mock data (v7)
    StorageService.initialize();
    
    setTracks(StorageService.getTracks());
    setRecords(StorageService.getTrainingRecords());
    setRaces(StorageService.getRaces());
    setPreferredTrackId(StorageService.getPreferredTrackId());
  }, []);

  const handleSaveRecord = (data: Omit<TrainingRecord, 'id' | 'timestamp'>) => {
    const newRecord: TrainingRecord = {
      ...data,
      id: Date.now().toString(),
      timestamp: Date.now(),
    };
    StorageService.saveTrainingRecord(newRecord);
    setRecords(prev => [...prev, newRecord]);
    // Continuous entry: no view change
  };

  const handleBatchSaveRecords = (newRecords: TrainingRecord[]) => {
    StorageService.saveBatchTrainingRecords(newRecords);
    setRecords(prev => [...prev, ...newRecords]);
  };

  const handleSaveRace = (race: RaceEvent) => {
      StorageService.saveRace(race);
      setRaces(StorageService.getRaces());
  };

  const handleDeleteRace = (id: string) => {
      if(confirm('確定刪除此賽事紀錄？')) {
        StorageService.deleteRace(id);
        setRaces(StorageService.getRaces());
      }
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans selection:bg-red-500/30 pb-safe">
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className="bg-red-600 p-2 rounded-xl shadow-lg shadow-red-600/20">
                <BalanceBikeIcon className="text-white" size={24} />
            </div>
            <div>
                <h1 className="text-lg font-black text-white tracking-tight leading-none italic">Louie RUNBIKE</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Professional Tracker</p>
            </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-5 max-w-md mx-auto min-h-[85vh]">
        {/* Render views based on requested order */}
        {view === AppView.DASHBOARD && <DashboardView tracks={tracks} records={records} races={races} preferredTrackId={preferredTrackId} onNavigate={setView} />}
        {view === AppView.RACE_MANAGER && <RaceManagerView races={races} onSave={handleSaveRace} onDelete={handleDeleteRace} />}
        {view === AppView.TRAINING_LOG && <TrainingLogView tracks={tracks} onSave={handleSaveRecord} onBatchSave={handleBatchSaveRecords} />}
        {view === AppView.TRACK_SETTINGS && <SettingsView tracks={tracks} setTracks={setTracks} preferredTrackId={preferredTrackId} setPreferredTrackId={setPreferredTrackId} />}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full bg-slate-900/90 backdrop-blur-lg border-t border-slate-800 pb-safe z-50">
        <div className="flex justify-around items-center max-w-md mx-auto px-2">
          {/* 1. 總覽 */}
          <NavButton 
            active={view === AppView.DASHBOARD} 
            onClick={() => setView(AppView.DASHBOARD)} 
            icon={<ChartIcon size={24} />} 
            label="總覽" 
          />
          {/* 2. 賽事 */}
          <NavButton 
            active={view === AppView.RACE_MANAGER} 
            onClick={() => setView(AppView.RACE_MANAGER)} 
            icon={<Trophy size={24} />} 
            label="賽事" 
          />
          {/* 3. 訓練 */}
           <NavButton 
            active={view === AppView.TRAINING_LOG} 
            onClick={() => setView(AppView.TRAINING_LOG)} 
            icon={<Timer size={24} />} 
            label="訓練" 
          />
          {/* 4. 設定 */}
          <NavButton 
            active={view === AppView.TRACK_SETTINGS} 
            onClick={() => setView(AppView.TRACK_SETTINGS)} 
            icon={<Settings size={24} />} 
            label="設定" 
          />
        </div>
      </nav>
    </div>
  );
}

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center py-4 w-full transition-all duration-300 relative ${
      active ? 'text-red-400' : 'text-slate-500 hover:text-slate-300'
    }`}
  >
    {active && <span className="absolute top-0 w-8 h-1 bg-red-600 rounded-b-full shadow-[0_0_10px_rgba(220,38,38,0.5)]"></span>}
    <div className={`mb-1 transition-transform ${active ? 'scale-110 -translate-y-1' : ''}`}>{icon}</div>
    <span className="text-[10px] font-bold tracking-wide">{label}</span>
  </button>
);
