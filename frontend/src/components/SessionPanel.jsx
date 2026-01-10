import React from 'react';

export default function SessionPanel({ draft, onSubmit }) {
  return (
    <div className="panel backdrop-blur-2xl bg-white/20 border border-white/25 rounded-2xl shadow-2xl transition-all duration-300 ease-in-out">
      <h4 className="text-sm font-semibold mb-3 text-white/90">Reading session</h4>
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
    </div>
  );
}

