import React, { useState } from 'react';
import { updateLog, deleteLog } from '../services/api';

export default function SessionPanel({ draft, onSubmit, isMinimized, onMinimize, logs, user, onLogsUpdate }) {
  const [editingLog, setEditingLog] = useState(null);
  const [editForm, setEditForm] = useState({ book_name: '', pages_read: '', target_pages: '', reflection: '' });

  const handleEdit = (log) => {
    setEditingLog(log.id);
    setEditForm({
      book_name: log.book_name,
      pages_read: log.pages_read,
      target_pages: log.target_pages,
      reflection: log.reflection || ''
    });
  };

  const handleSaveEdit = async () => {
    try {
      const payload = {
        ...editForm,
        pages_read: Number(editForm.pages_read),
        target_pages: Number(editForm.target_pages),
        user_id: user?.id
      };
      await updateLog(editingLog, payload);
      if (onLogsUpdate) {
        onLogsUpdate(logs.map(log =>
          log.id === editingLog ? { ...log, ...payload } : log
        ));
      }
      setEditingLog(null);
    } catch (err) {
      console.error('Failed to update log:', err);
    }
  };

  const handleDelete = async (logId) => {
    if (!confirm('Are you sure you want to delete this log?')) return;
    try {
      await deleteLog(logId);
      if (onLogsUpdate) {
        onLogsUpdate(logs.filter(log => log.id !== logId));
      }
    } catch (err) {
      console.error('Failed to delete log:', err);
    }
  };

  const handleCancelEdit = () => {
    setEditingLog(null);
    setEditForm({ book_name: '', pages_read: '', target_pages: '', reflection: '' });
  };

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
                    {editingLog === log.id ? (
                      <div className="space-y-2">
                        <input
                          className="w-full bg-white/10 border border-white/15 rounded px-2 py-1 text-xs"
                          placeholder="Book name"
                          value={editForm.book_name}
                          onChange={(e) => setEditForm({ ...editForm, book_name: e.target.value })}
                        />
                        <div className="flex gap-2">
                          <input
                            className="flex-1 bg-white/10 border border-white/15 rounded px-2 py-1 text-xs"
                            placeholder="Pages read"
                            type="number"
                            value={editForm.pages_read}
                            onChange={(e) => setEditForm({ ...editForm, pages_read: e.target.value })}
                          />
                          <input
                            className="w-full flex-1 bg-white/10 border border-white/15 rounded px-2 py-1 text-xs"
                            placeholder="Target pages"
                            type="number"
                            value={editForm.target_pages}
                            onChange={(e) => setEditForm({ ...editForm, target_pages: e.target.value })}
                          />
                        </div>
                        <textarea
                          className="w-full bg-white/10 border border-white/15 rounded px-2 py-1 text-xs resize-none"
                          placeholder="Reflection"
                          value={editForm.reflection}
                          onChange={(e) => setEditForm({ ...editForm, reflection: e.target.value })}
                        />
                        <div className="flex gap-2">
                          <button
                            className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                            onClick={handleSaveEdit}
                          >
                            Save
                          </button>
                          <button
                            className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                            onClick={handleCancelEdit}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="font-medium">{log.book_name}</div>
                        <div className="text-white/70">Pages: {log.pages_read}/{log.target_pages}</div>
                        {log.reflection && <div className="text-white/70 mt-1">{log.reflection}</div>}
                        <div className="flex gap-2 mt-2">
                          <button
                            className="text-xs text-blue-400 hover:text-blue-300"
                            onClick={() => handleEdit(log)}
                          >
                            Edit
                          </button>
                          <button
                            className="text-xs text-red-400 hover:text-red-300"
                            onClick={() => handleDelete(log.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
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
