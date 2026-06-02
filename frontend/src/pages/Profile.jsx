import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Trophy, Flame, BookOpen, Clock, Settings, LogOut, X,
  ChevronRight, Sparkles, Star, Calendar, Zap, Shield
} from 'lucide-react';
import ProfileForm from '../components/ProfileForm';
import { getProfile, updateProfile, fetchLogs, getNotifications, setNotifications as saveNotifications } from '../services/api';
import { cn } from '../lib/utils';

export default function Profile({ user, logout, onUserUpdate }) {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ sessions: 0, totalPages: 0, totalBooks: 0, totalMinutes: 0 });
  const [logs, setLogs] = useState([]);
  const [notifications, setNotifications] = useState({ enabled: false, notify_time: '09:00' });
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    getProfile(user.id).then(setProfile).catch(() => setProfile(null));
    getNotifications(user.id).then(setNotifications).catch(() => {});
    
    fetchLogs(user.id).then((logs) => {
      setLogs(logs);
      const sessions = logs.length;
      const totalPages = logs.reduce((sum, log) => sum + (log.pages_read || 0), 0);
      const totalMinutes = logs.reduce((sum, log) => sum + (log.duration_minutes || 0), 0);
      const totalBooks = new Set(logs.map(log => log.book_name)).size;
      setStats({ sessions, totalPages, totalBooks, totalMinutes });
    });
  }, [user]);

  const handleSave = async (values) => {
    await updateProfile(user.id, values);
    setProfile({ ...profile, ...values });
    if (values.username && values.username !== user.username) {
      onUserUpdate?.({ ...user, username: values.username });
    }
    setShowSettings(false);
  };

  const handleNotificationSave = async (values) => {
    await saveNotifications({ user_id: user.id, ...values });
    setNotifications({ ...notifications, ...values });
  };

  if (!user) return <div className="p-12 text-center text-slate-500">Please login to view profile.</div>;

  const level = profile?.level || 1;
  const xp = profile?.xp || 0;
  const xpInLevel = xp % 1000;
  const streak = profile?.streak || 0;

  const badges = [
    { name: 'Early Bird', icon: Clock, color: 'text-indigo-400', earned: stats.sessions > 5 },
    { name: 'Polymath', icon: BookOpen, color: 'text-indigo-400', earned: stats.totalBooks > 3 },
    { name: 'Focus Master', icon: Zap, color: 'text-indigo-400', earned: stats.totalMinutes > 300 },
    { name: 'Persistent', icon: Shield, color: 'text-indigo-400', earned: streak > 3 },
  ];

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 min-h-screen">
      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Profile Card (Large) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:col-span-8 bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[40px] p-8 relative overflow-hidden group"
        >
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-500/10 blur-[100px] group-hover:bg-indigo-500/20 transition-all duration-700" />
          
          <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center md:items-start">
            <div className="relative">
              <div className="w-32 h-32 rounded-[32px] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-indigo-500/20">
                {(profile?.username || user.username || 'U')[0].toUpperCase()}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-slate-900 border-4 border-slate-900 rounded-2xl p-2 shadow-xl">
                 <Trophy size={20} className="text-amber-400" />
              </div>
            </div>

            <div className="flex-1 text-center md:text-left space-y-4 w-full">
              <div>
                <h1 className="text-4xl font-serif font-black text-white tracking-tight">{profile?.username || user.username}</h1>
                <p className="text-slate-400 font-medium">{user.email}</p>
              </div>
              
              <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                <span className="px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-black uppercase tracking-widest">Level {level}</span>
                <span className="px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <Flame size={12} fill="currentColor" /> {streak} Day Streak
                </span>
              </div>

              {/* XP Progress */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter text-slate-500">
                  <span>Level Progress</span>
                  <span className="text-slate-300">{xpInLevel} / 1000 XP</span>
                </div>
                <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${xpInLevel / 10}%` }}
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions (Small) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="md:col-span-4 bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[40px] p-6 flex flex-col justify-between"
        >
          <div className="space-y-4">
             <button 
               onClick={() => setShowSettings(true)}
               className="w-full flex items-center justify-between p-4 rounded-3xl bg-white/5 hover:bg-white/10 transition-all group"
             >
               <div className="flex items-center gap-3">
                 <Settings size={20} className="text-slate-400 group-hover:text-white" />
                 <span className="text-sm font-bold text-slate-300 group-hover:text-white">Profile Settings</span>
               </div>
               <ChevronRight size={18} className="text-slate-600" />
             </button>
             <button 
               onClick={logout}
               className="w-full flex items-center justify-between p-4 rounded-3xl bg-red-500/5 hover:bg-red-500/10 transition-all group"
             >
               <div className="flex items-center gap-3">
                 <LogOut size={20} className="text-red-400/70 group-hover:text-red-400" />
                 <span className="text-sm font-bold text-red-400/70 group-hover:text-red-400">Sign Out</span>
               </div>
             </button>
          </div>

          <div className="p-4 rounded-3xl bg-indigo-600/10 border border-indigo-500/20">
             <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Current Goal</p>
             <p className="text-xs text-slate-300">Read <span className="text-white font-bold">500</span> more pages to reach Level {level + 1}</p>
          </div>
        </motion.div>

        {/* Stats Grid (Medium) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="md:col-span-12 grid grid-cols-2 md:grid-cols-4 gap-6"
        >
          <StatBox icon={BookOpen} label="Total Books" value={stats.totalBooks} />
          <StatBox icon={Calendar} label="Sessions" value={stats.sessions} />
          <StatBox icon={Clock} label="Pages Read" value={stats.totalPages} />
          <StatBox icon={Clock} label="Focus Minutes" value={stats.totalMinutes} />
        </motion.div>

        {/* Badges & Achievements (Medium) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="md:col-span-5 bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[40px] p-8"
        >
          <h3 className="text-lg font-serif font-black text-white mb-6 flex items-center gap-2">
            <Star size={20} className="text-amber-400" /> Badges
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {badges.map(badge => (
              <div 
                key={badge.name} 
                className={cn(
                  "p-4 rounded-3xl border transition-all duration-500 flex flex-col items-center text-center gap-2",
                  badge.earned 
                    ? "bg-white/5 border-white/10 opacity-100" 
                    : "bg-black/20 border-white/5 opacity-40 grayscale"
                )}
              >
                <badge.icon size={24} className={badge.color} />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">{badge.name}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent History (Medium) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="md:col-span-7 bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[40px] p-8"
        >
          <h3 className="text-lg font-serif font-black text-white mb-6">Recent Journey</h3>
          <div className="space-y-4">
            {logs.slice(0, 3).map((log, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-3xl bg-white/5 border border-white/5 hover:border-indigo-500/30 transition-all">
                 <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-xs font-bold text-indigo-400">
                    {new Date(log.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                 </div>
                 <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-bold text-white truncate">{log.book_name}</p>
                    <p className="text-xs text-slate-500">Read {log.pages_read} pages • {log.duration_minutes || 0} mins</p>
                 </div>
                 <ChevronRight size={16} className="text-slate-600" />
              </div>
            ))}
            {logs.length === 0 && <p className="text-slate-500 text-sm text-center py-8 italic">No reading logs yet. Start your journey!</p>}
          </div>
        </motion.div>

      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
           <motion.div 
             initial={{ scale: 0.9, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             className="bg-[#0f172a] border border-white/10 rounded-[40px] p-8 max-w-md w-full shadow-2xl relative"
           >
             <button onClick={() => setShowSettings(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 text-slate-400 hover:text-white transition">
               <X size={20} />
             </button>
             <h3 className="text-2xl font-serif font-black text-white mb-6">Settings</h3>
             
             <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 block">Personal Details</label>
                  <ProfileForm initial={profile} onSave={handleSave} />
                </div>

                <div className="pt-6 border-t border-white/5">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 block">Daily Reminders</label>
                   <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-slate-300">Email Notifications</span>
                      <button
                        type="button"
                        onClick={() => handleNotificationSave({ ...notifications, enabled: !notifications.enabled })}
                        className={cn(
                          "w-10 h-6 rounded-full transition-colors relative duration-300 focus:outline-none border border-white/10",
                          notifications.enabled ? "bg-indigo-600" : "bg-white/10"
                        )}
                      >
                        <span 
                          className={cn(
                            "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-300",
                            notifications.enabled ? "translate-x-5" : "translate-x-0"
                          )}
                        />
                      </button>
                   </div>
                   {notifications.enabled && (
                      <input 
                        type="time" 
                        value={notifications.notify_time} 
                        onChange={(e) => handleNotificationSave({ ...notifications, notify_time: e.target.value })}
                        className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none"
                      />
                   )}
                </div>
             </div>
           </motion.div>
        </div>
      )}
    </div>
  );
}

function StatBox({ icon: Icon, label, value }) {
  return (
    <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[32px] p-6 hover:border-indigo-500/20 transition-all group">
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-4 border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 transition-transform group-hover:scale-110 duration-500">
        <Icon size={20} />
      </div>
      <div className="text-2xl font-black text-white mb-1">{value}</div>
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</div>
    </div>
  );
}
