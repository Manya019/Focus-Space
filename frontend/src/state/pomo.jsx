import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const PomoContext = createContext();

export const PomoProvider = ({ children }) => {
  const [workDuration, setWorkDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);
  const [longBreakDuration, setLongBreakDuration] = useState(15);

  const [timeLeft, setTimeLeft] = useState(workDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState('work'); // 'work', 'break', 'longBreak'
  const [cycles, setCycles] = useState(0);
  
  const intervalRef = useRef(null);

  const handleSwitchMode = () => {
    setIsRunning(false);
    if (mode === 'work') {
      const nextCycles = cycles + 1;
      setCycles(nextCycles);
      if (nextCycles % 4 === 0) {
        setMode('longBreak');
        setTimeLeft(longBreakDuration * 60);
      } else {
        setMode('break');
        setTimeLeft(breakDuration * 60);
      }
    } else {
      setMode('work');
      setTimeLeft(workDuration * 60);
    }
    // Play sound & haptics
    playCue('switch');
  };

  const playCue = (type) => {
    try {
      const sounds = {
        switch: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
        start: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
        tick: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'
      };
      new Audio(sounds[type]).play();
      if (navigator.vibrate) navigator.vibrate(type === 'switch' ? [100, 50, 100] : 50);
    } catch(e) {}
  };

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleSwitchMode();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, mode, cycles, workDuration, breakDuration, longBreakDuration]);

  const toggleTimer = () => {
    setIsRunning(!isRunning);
    if (!isRunning) playCue('start');
  };
  
  const resetTimer = () => {
    setIsRunning(false);
    setMode('work');
    setTimeLeft(workDuration * 60);
    setCycles(0);
  };

  const setTimerMode = (newMode, customDuration) => {
    setIsRunning(false);
    setMode(newMode);
    
    let duration = 0;
    if (customDuration) {
      duration = customDuration;
    } else {
      if (newMode === 'work') duration = workDuration;
      else if (newMode === 'break') duration = breakDuration;
      else if (newMode === 'longBreak') duration = longBreakDuration;
    }
    
    setTimeLeft(duration * 60);
  };

  const updateDurations = (w, b, l) => {
    setWorkDuration(w);
    setBreakDuration(b);
    setLongBreakDuration(l);
    if (!isRunning) {
      if (mode === 'work') setTimeLeft(w * 60);
      else if (mode === 'break') setTimeLeft(b * 60);
      else if (mode === 'longBreak') setTimeLeft(l * 60);
    }
  };

  const value = {
    timeLeft,
    isRunning,
    mode,
    cycles,
    workDuration,
    breakDuration,
    longBreakDuration,
    toggleTimer,
    resetTimer,
    setTimerMode,
    updateDurations,
    progress: (( (mode === 'work' ? workDuration : (mode === 'break' ? breakDuration : longBreakDuration)) * 60 - timeLeft) / ((mode === 'work' ? workDuration : (mode === 'break' ? breakDuration : longBreakDuration)) * 60)) * 100
  };

  return <PomoContext.Provider value={value}>{children}</PomoContext.Provider>;
};

export const usePomo = () => {
  const context = useContext(PomoContext);
  if (!context) {
    throw new Error('usePomo must be used within a PomoProvider');
  }
  return context;
};
