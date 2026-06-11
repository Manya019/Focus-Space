import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Coffee, BookOpen, Moon, Timer, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { usePomo } from '../state/pomo';

export default function PomodoroTimer({ variant }) {
  const { 
    timeLeft, 
    isRunning, 
    mode, 
    toggleTimer, 
    resetTimer, 
    setTimerMode,
    progress,
    isSimpleTimer,
    toggleTimerMode
  } = usePomo();

  const [showCustom, setShowCustom] = useState(false);
  const [customVal, setCustomVal] = useState('25');

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const modeConfig = {
    work: { 
      label: 'Focus', 
      icon: BookOpen, 
      activeTab: 'bg-indigo-500/10 text-indigo-400',
      button: 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/20',
      dot: 'bg-indigo-500',
      progress: 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]'
    },
    break: { 
      label: 'Break', 
      icon: Coffee, 
      activeTab: 'bg-emerald-500/10 text-emerald-400',
      button: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20',
      dot: 'bg-emerald-500',
      progress: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
    },
    longBreak: { 
      label: 'Rest', 
      icon: Moon, 
      activeTab: 'bg-purple-500/10 text-purple-400',
      button: 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/20',
      dot: 'bg-purple-500',
      progress: 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]'
    }
  };

  const presets = [
    { label: '25m', value: 25 },
    { label: '50m', value: 50 },
    { label: '90m', value: 90 },
  ];

  const activeMode = modeConfig[mode] || modeConfig.work;

  const handlePreset = (val) => {
    setTimerMode(mode, val);
    setShowCustom(false);
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    const val = parseInt(customVal);
    if (!isNaN(val) && val > 0) {
      setTimerMode(mode, val);
      setShowCustom(false);
    }
  };

  if (variant === 'bar') {
    return (
      <div className="w-full max-w-4xl bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-2.5 shadow-2xl relative overflow-hidden group transition-all duration-500 hover:border-white/20 flex items-center justify-between gap-4">
        {/* Background Glow */}
        <div className={cn(
          "absolute -left-12 top-0 w-24 h-24 blur-[30px] opacity-15 transition-all duration-1000 pointer-events-none",
          mode === 'work' ? "bg-indigo-500" : mode === 'break' ? "bg-emerald-500" : "bg-purple-500"
        )}></div>

        {/* Left: Modes */}
        <div className="flex bg-slate-950/40 rounded-xl border border-slate-800/40 p-0.5 min-w-[210px]">
          {Object.entries(modeConfig).map(([key, config]) => {
            const Icon = config.icon;
            const isActive = mode === key;
            return (
              <button
                key={key}
                onClick={() => setTimerMode(key)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg text-[9px] font-bold transition-all duration-300",
                  isActive 
                    ? config.activeTab 
                    : "text-slate-500 hover:text-slate-300"
                )}
              >
                <Icon size={10} />
                <span>{config.label}</span>
              </button>
            );
          })}
        </div>

        {/* Middle: Timer Display & Progress Bar */}
        <div className="flex-1 flex items-center gap-4 max-w-md">
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <span className="text-xl font-black text-white font-mono tracking-tighter">
              {formatTime(timeLeft)}
            </span>
            <div className="flex items-center gap-1">
              <div className={cn("w-1.5 h-1.5 rounded-full", isRunning ? "animate-pulse" : "", activeMode.dot)} />
              <span className="text-[8px] font-black uppercase tracking-wider text-slate-500">
                {isRunning ? 'Flowing' : 'Paused'}
              </span>
            </div>
          </div>
          <div className="flex-1 h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800/20 relative">
            <div 
              className={cn(
                "h-full transition-all duration-1000 ease-linear",
                activeMode.progress
              )}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Right: Quick Presets & Playback Controls */}
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {presets.map((p) => (
              <button
                key={p.value}
                onClick={() => handlePreset(p.value)}
                className="px-2 py-1 rounded-lg bg-slate-950/40 border border-slate-800/40 text-[9px] font-bold text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all"
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="h-6 w-px bg-white/10" />
          <div className="flex items-center gap-1">
            <button
              onClick={toggleTimer}
              className={cn(
                "w-7 h-7 flex items-center justify-center rounded-lg transition-all active:scale-90 shadow-md",
                isRunning 
                  ? "bg-slate-800 text-white hover:bg-slate-700" 
                  : activeMode.button
              )}
            >
              {isRunning ? <Pause size={10} fill="currentColor" /> : <Play size={10} className="ml-0.5" fill="currentColor" />}
            </button>
            
            <button
              onClick={resetTimer}
              className="w-7 h-7 flex items-center justify-center bg-slate-900/40 hover:bg-slate-800 text-slate-500 hover:text-white rounded-lg border border-slate-800/50 transition-all active:scale-90"
            >
              <RotateCcw size={10} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'sidebar') {
    return (
      <div className="w-full bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-3 shadow-xl relative overflow-hidden transition-all duration-500 hover:border-slate-700/50">
        <div className={cn(
          "absolute -top-10 -right-10 w-24 h-24 blur-[40px] opacity-20 transition-all duration-1000 pointer-events-none",
          mode === 'work' ? "bg-indigo-500" : mode === 'break' ? "bg-emerald-500" : "bg-purple-500"
        )}></div>

        <div className="relative z-10 flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-950/40 border border-slate-800/40 p-1">
            {Object.entries(modeConfig).map(([key, config]) => {
              const Icon = config.icon;
              const isActive = mode === key;
              return (
                <button
                  key={key}
                  onClick={() => setTimerMode(key)}
                  title={config.label}
                  className={cn(
                    "h-9 flex items-center justify-center rounded-lg transition-all duration-300",
                    isActive 
                      ? config.activeTab 
                      : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  <Icon size={14} />
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-2xl font-black text-white font-mono leading-none">
                {formatTime(timeLeft)}
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <div className={cn("w-1.5 h-1.5 rounded-full", isRunning ? "animate-pulse" : "", activeMode.dot)} />
                <span className="text-[8px] font-black uppercase tracking-wider text-slate-500">
                  {isRunning ? 'Flowing' : 'Paused'}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 gap-1.5">
              <button
                onClick={toggleTimer}
                title={isRunning ? "Pause" : "Start"}
                className={cn(
                  "w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-90 shadow-lg",
                  isRunning 
                    ? "bg-slate-800 text-white hover:bg-slate-700" 
                    : activeMode.button
                )}
              >
                {isRunning ? <Pause size={16} fill="currentColor" /> : <Play size={16} className="ml-0.5" fill="currentColor" />}
              </button>
              
              <button
                onClick={resetTimer}
                title="Reset"
                className="w-10 h-10 flex items-center justify-center bg-slate-900/40 hover:bg-slate-800 text-slate-500 hover:text-white rounded-xl border border-slate-800/50 transition-all active:scale-90"
              >
                <RotateCcw size={15} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {presets.map((p) => (
              <button
                key={p.value}
                onClick={() => handlePreset(p.value)}
                className="flex-1 h-8 rounded-lg bg-slate-950/40 border border-slate-800/40 text-[10px] font-bold text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all"
              >
                {p.label}
              </button>
            ))}
            <button 
              onClick={() => setShowCustom(!showCustom)}
              title="Custom"
              className={cn(
                "w-8 h-8 flex items-center justify-center rounded-lg transition-all",
                showCustom ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" : "bg-slate-950/40 border border-slate-800/40 text-slate-400 hover:text-white"
              )}
            >
              <Timer size={12} />
            </button>
          </div>

          {showCustom && (
            <motion.form 
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleCustomSubmit}
              className="flex gap-2"
            >
              <input 
                type="number"
                value={customVal}
                onChange={(e) => setCustomVal(e.target.value)}
                className="min-w-0 flex-1 bg-slate-950/60 border border-slate-800/60 rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                placeholder="Minutes"
              />
              <button 
                type="submit"
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all"
              >
                Set
              </button>
            </motion.form>
          )}

          <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden border border-slate-800/20">
            <div 
              className={cn(
                "h-full transition-all duration-1000 ease-linear",
                activeMode.progress
              )}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  if (isSimpleTimer) {
    return (
      <div className="w-full max-w-lg bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl px-5 py-4 shadow-2xl relative overflow-hidden group transition-all duration-500 hover:border-white/20">
        <div className={cn(
          "absolute -left-12 top-0 w-24 h-24 blur-[30px] opacity-15 pointer-events-none transition-colors duration-500",
          mode === 'work' ? "bg-indigo-500" : mode === 'break' ? "bg-emerald-500" : "bg-purple-500"
        )}></div>
        <div className="relative z-10 flex flex-col gap-3">
          {/* Top Row: Tabs + Time + Controls */}
          <div className="flex items-center gap-4">
            <div className="flex p-0.5 bg-slate-950/40 rounded-lg border border-slate-800/40">
              {Object.entries(modeConfig).map(([key, config]) => {
                const Icon = config.icon;
                const isActive = mode === key;
                return (
                  <button
                    key={key}
                    onClick={() => setTimerMode(key)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-bold transition-all duration-300",
                      isActive 
                        ? config.activeTab
                        : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    <Icon size={11} />
                    <span>{config.label}</span>
                  </button>
                );
              })}
            </div>
            <span className={cn(
              "text-2xl font-black font-mono tracking-tighter transition-colors duration-500",
              mode === 'work' ? "text-indigo-300" : mode === 'break' ? "text-emerald-300" : "text-purple-300"
            )}>
              {formatTime(timeLeft)}
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={toggleTimer}
                className={cn(
                  "w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90 shadow-md",
                  isRunning
                    ? "bg-slate-800 text-white hover:bg-slate-700"
                    : mode === 'work'
                      ? "bg-indigo-600 hover:bg-indigo-500"
                      : mode === 'break'
                        ? "bg-emerald-600 hover:bg-emerald-500"
                        : "bg-purple-600 hover:bg-purple-500"
                )}
              >
                {isRunning ? <Pause size={14} fill="currentColor" /> : <Play size={14} className="ml-0.5" fill="currentColor" />}
              </button>
              <button
                onClick={resetTimer}
                className="w-9 h-9 flex items-center justify-center bg-slate-900/40 hover:bg-slate-800 text-slate-500 hover:text-white rounded-xl border border-slate-800/50 transition-all active:scale-90"
              >
                <RotateCcw size={13} />
              </button>
              <div className="h-6 w-px bg-white/10 mx-1" />
              <button
                onClick={toggleTimerMode}
                className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 transition-all"
              >
                Pomo
              </button>
            </div>
          </div>

          {/* Presets & Custom (hidden on Focus tab — purely navigational) */}
          {mode !== 'work' && (
          <>
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {presets.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setTimerMode(mode, p.value)}
                  className="px-3 py-1.5 rounded-lg bg-slate-950/40 border border-slate-800/40 text-[10px] font-bold text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setShowCustom(!showCustom)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all",
                showCustom ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" : "bg-slate-950/40 border border-slate-800/40 text-slate-400 hover:text-white"
              )}
            >
              <Timer size={12} />
              Custom
            </button>
          </div>

          {showCustom && (
            <motion.form 
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={(e) => { e.preventDefault(); const val = parseInt(customVal); if (!isNaN(val) && val > 0) { setTimerMode(mode, val); setShowCustom(false); } }}
              className="flex gap-2"
            >
              <input 
                type="number"
                value={customVal}
                onChange={(e) => setCustomVal(e.target.value)}
                className="flex-1 bg-slate-950/60 border border-slate-800/60 rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                placeholder="Minutes..."
              />
              <button 
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all"
              >
                Set
              </button>
            </motion.form>
          )}
          </>
          )}

          {/* Progress Bar (hidden for Focus which counts up) */}
          {mode !== 'work' && (
          <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden border border-slate-800/20">
            <div 
              className={cn(
                "h-full transition-all duration-1000 ease-linear",
                activeMode.progress
              )}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[320px] bg-slate-900/60 backdrop-blur-xl border border-slate-800/50 rounded-[32px] p-5 shadow-2xl relative overflow-hidden group transition-all duration-500 hover:border-slate-700/50">
      {/* Background Glow */}
      <div className={cn(
        "absolute -top-12 -right-12 w-32 h-32 blur-[50px] opacity-20 transition-all duration-1000",
        mode === 'work' ? "bg-indigo-500" : mode === 'break' ? "bg-emerald-500" : "bg-purple-500"
      )}></div>

      <div className="relative z-10 flex flex-col gap-5">
        {/* Mode Row */}
        <div className="flex gap-1.5">
          <div className="flex flex-1 p-1 bg-slate-950/40 rounded-2xl border border-slate-800/40">
            {Object.entries(modeConfig).map(([key, config]) => {
              const Icon = config.icon;
              const isActive = mode === key;
              return (
                <button
                  key={key}
                  onClick={() => setTimerMode(key)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold transition-all duration-300",
                    isActive 
                      ? config.activeTab 
                      : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  <Icon size={12} />
                  <span>{config.label}</span>
                </button>
              );
            })}
          </div>
          <button
            onClick={toggleTimerMode}
            className="px-2.5 rounded-xl text-[10px] font-bold transition-all bg-slate-950/40 text-slate-500 hover:text-slate-300 border border-slate-800/40"
            title="Switch to Timer mode"
          >
            Timer
          </button>
        </div>

        {/* Main Timer Area */}
        <div className="flex items-center justify-between px-1">
          <div className="flex flex-col">
            <div className="text-4xl font-black text-white font-mono tracking-tighter leading-none mb-1">
              {formatTime(timeLeft)}
            </div>
            <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", isRunning ? "animate-pulse" : "", activeMode.dot)} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  {isRunning ? 'Flowing' : 'Paused'}
                </span>
              </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={toggleTimer}
              className={cn(
                "w-12 h-12 flex items-center justify-center rounded-2xl transition-all active:scale-90 shadow-xl",
                isRunning 
                  ? "bg-slate-800 text-white hover:bg-slate-700" 
                  : activeMode.button
              )}
            >
              {isRunning ? <Pause size={20} fill="currentColor" /> : <Play size={20} className="ml-0.5" fill="currentColor" />}
            </button>
            <button
              onClick={resetTimer}
              className="w-12 h-12 flex items-center justify-center bg-slate-900/40 hover:bg-slate-800 text-slate-500 hover:text-white rounded-2xl border border-slate-800/50 transition-all active:scale-90"
            >
              <RotateCcw size={18} />
            </button>
          </div>
        </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                {presets.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => handlePreset(p.value)}
                    className="px-3 py-1.5 rounded-lg bg-slate-950/40 border border-slate-800/40 text-[10px] font-bold text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setShowCustom(!showCustom)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all",
                  showCustom ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" : "bg-slate-950/40 border border-slate-800/40 text-slate-400 hover:text-white"
                )}
              >
                <Timer size={12} />
                Custom
              </button>
            </div>

            {showCustom && (
              <motion.form 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={handleCustomSubmit}
                className="flex gap-2"
              >
                <input 
                  type="number"
                  value={customVal}
                  onChange={(e) => setCustomVal(e.target.value)}
                  className="flex-1 bg-slate-950/60 border border-slate-800/60 rounded-xl px-4 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                  placeholder="Minutes..."
                />
                <button 
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all"
                >
                  Set
                </button>
              </motion.form>
            )}
          </div>

          {/* Minimal Progress */}
          <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden border border-slate-800/20">
            <div 
              className={cn(
                "h-full transition-all duration-1000 ease-linear",
                activeMode.progress
              )}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
      </div>
    </div>
  );
}
