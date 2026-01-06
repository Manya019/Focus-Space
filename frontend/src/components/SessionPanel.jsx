import React from 'react';

export default function SessionPanel({ draft, onSubmit }) {
  return (
    <div className="panel">
      <h4 className="text-sm font-semibold mb-3">Reading session</h4>
      <div className="grid gap-3">
        <input
          className="bg-[#07101a] rounded-md px-3 py-2 text-sm border border-gray-800"
          placeholder="Book"
          value={draft.book}
          onChange={(e) => draft.setBook(e.target.value)}
        />
        <input
          className="bg-[#07101a] rounded-md px-3 py-2 text-sm border border-gray-800"
          placeholder="Target pages"
          type="number"
          value={draft.targetPages}
          onChange={(e) => draft.setTargetPages(e.target.value)}
        />
        <input
          className="bg-[#07101a] rounded-md px-3 py-2 text-sm border border-gray-800"
          placeholder="Pages read"
          type="number"
          value={draft.pages}
          onChange={(e) => draft.setPages(e.target.value)}
        />
        <textarea
          className="bg-[#07101a] rounded-md px-3 py-2 text-sm border border-gray-800 resize-none"
          placeholder="Notes"
          value={draft.notes}
          onChange={(e) => draft.setNotes(e.target.value)}
        />
        <button className="px-3 py-2 bg-accent rounded-md text-sm font-medium" onClick={onSubmit}>Submit log</button>
      </div>
    </div>
  );
}

