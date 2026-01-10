import React, { useState, useEffect, useRef } from 'react';

export default function PomodoroTimer() {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [isWork, setIsWork] = useState(true);
  const [cycles, setCycles] = useState(0);
  const [workDuration, setWorkDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);
  const [longBreakDuration, setLongBreakDuration] = useState(15);
  const intervalRef = useRef(null);

  const workTime = workDuration * 60;
  const breakTime = breakDuration * 60;
  const longBreakTime = longBreakDuration * 60;

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            if (isWork) {
              setCycles((c) => c + 1);
              if ((cycles + 1) % 4 === 0) {
                setTimeLeft(longBreakTime);
              } else {
                setTimeLeft(breakTime);
              }
              setIsWork(false);
            } else {
              setTimeLeft(workTime);
              setIsWork(true);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, isWork, cycles, workTime, breakTime, longBreakTime]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startTimer = () => setIsRunning(true);
  const pauseTimer = () => setIsRunning(false);
  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(workDuration * 60);
    setIsWork(true);
    setCycles(0);
  };

  return (
    <div className="backdrop-blur-2xl bg-white/20 border border-white/25 rounded-2xl shadow-2xl p-2 transition-all duration-300 ease-in-out hover:bg-white/25 flex items-center gap-4">
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-white/90">
          {isWork ? 'Work' : cycles % 4 === 0 ? 'Long Break' : 'Break'}
        </h3>
        <div className="text-2xl font-mono font-bold text-white">
          {formatTime(timeLeft)}
        </div>
        <div className="flex gap-1 mt-1 justify-center">
          <input
            type="number"
            min="1"
            max="60"
            value={workDuration}
            onChange={(e) => setWorkDuration(Number(e.target.value))}
            onKeyDown={(e) => { if (e.key === 'Enter') resetTimer(); }}
            className="w-12 backdrop-blur-sm bg-white/10 border border-white/20 rounded px-1 py-1 text-xs text-center"
            disabled={isRunning}
          />
        </div>
      </div>
      <div className="flex gap-2">
        {!isRunning ? (
          <button
            onClick={startTimer}
            className="backdrop-blur-lg bg-white/15 border border-white/20 rounded-xl px-3 py-2 text-sm font-medium text-white shadow-lg transition-all duration-200 ease-in-out hover:bg-white/25 hover:shadow-xl hover:scale-105"
          >
            Start
          </button>
        ) : (
          <button
            onClick={pauseTimer}
            className="backdrop-blur-lg bg-white/15 border border-white/20 rounded-xl px-3 py-2 text-sm font-medium text-white shadow-lg transition-all duration-200 ease-in-out hover:bg-white/25 hover:shadow-xl hover:scale-105"
          >
            Pause
          </button>
        )}
        <button
          onClick={resetTimer}
          className="backdrop-blur-lg bg-white/15 border border-white/20 rounded-xl px-3 py-2 text-sm font-medium text-white shadow-lg transition-all duration-200 ease-in-out hover:bg-white/25 hover:shadow-xl hover:scale-105"
        >
          Reset
        </button>
      </div>
    </div>
  );
}