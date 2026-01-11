import React from 'react';

export default function SessionPanel({ draft, onSubmit, isMinimized, onMinimize, logs }) {
  return (
    <div className="panel backdrop-blur-2xl bg-white/20 border border-white/25 rounded-2xl shadow-2xl transition-all duration-300 ease-in-out">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-sm font-semibold text-white/90">Reading session</h4>
        <button
          onClick={onMinimize}
          className="text-white/70 hover:text-white text-lg leading-none"
        >
          {isMinimized ? '+' : '−'}
        </button>
      </div>
      {!isMinimized && (
        <div className="max-h-96 overflow-y-auto">
          <div className="grid gap-3">
            <input
              className="backdrop-blur-lg bg-white/10 border border-white/15 rounded-xl px-3 py-2 text-sm transition-all duration-200 ease-in-out hover:bg-white/15 focus:bg-white/15 focus:border-white/35"
              placeholder="Book"
              value={draft.book}
              onChange={(e) => draft.setBook(e.target.value)}
            />
            <input
              className="backdrop-blur-lg bg-white/10 border border-white/15 rounded-xl px-3 py-2 text-sm transition-all duration-200 ease-in-out hover:bg-white/15 focus:bg-white/15 focus:border-white/35"
              placeholder="Target pages"
              type="number"
              value={draft.targetPages}
              onChange={(e) => draft.setTargetPages(e.target.value)}
            />
            <input
              className="backdrop-blur-lg bg-white/10 border border-white/15 rounded-xl px-3 py-2 text-sm transition-all duration-200 ease-in-out hover:bg-white/15 focus:bg-white/15 focus:border-white/35"
              placeholder="Pages read"
              type="number"
              value={draft.pages}
              onChange={(e) => draft.setPages(e.target.value)}
            />
            <textarea
              className="backdrop-blur-lg bg-white/10 border border-white/15 rounded-xl px-3 py-2 text-sm resize-none transition-all duration-200 ease-in-out hover:bg-white/15 focus:bg-white/15 focus:border-white/35"
              placeholder="Notes"
              value={draft.notes}
              onChange={(e) => draft.setNotes(e.target.value)}
            />
            <button className="backdrop-blur-lg bg-white/15 border border-white/25 rounded-xl px-3 py-2 text-sm font-medium shadow-lg transition-all duration-200 ease-in-out hover:bg-white/25 hover:shadow-xl hover:scale-105" onClick={onSubmit}>Submit log</button>
          </div>
          {logs && logs.length > 0 && (
            <div className="mt-4">
              <h5 className="text-sm font-semibold mb-2 text-white/90">Session History</h5>
              <div className="space-y-2">
                {logs.slice(0, 10).map((log, index) => (
                  <div key={log.id || index} className="backdrop-blur-lg bg-white/10 border border-white/15 rounded-lg p-2 text-xs">
                    <div className="font-medium">{log.book_name}</div>
                    <div className="text-white/70">Pages: {log.pages_read}/{log.target_pages}</div>
                    {log.reflection && <div className="text-white/70 mt-1">{log.reflection}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
