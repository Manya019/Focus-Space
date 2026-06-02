import React, { useState } from 'react';
import { updateLog, deleteLog } from '../services/api';
import { Minus, Plus, Book, Target, Check, X, Edit2, Trash2, Search, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { searchBooks } from '../services/books';
import { motion, AnimatePresence } from 'framer-motion';

export default function SessionPanel({ draft, onSubmit, isMinimized, onMinimize, logs, user, onLogsUpdate }) {
  const [editingLog, setEditingLog] = useState(null);
  const [editForm, setEditForm] = useState({ book_name: '', pages_read: '', target_pages: '', reflection: '' });
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async (query) => {
    draft.setBook(query);
    if (query.length > 2) {
      setIsSearching(true);
      const results = await searchBooks(query);
      setSearchResults(results);
      setIsSearching(false);
      setShowResults(true);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  };

  const selectBook = (book) => {
    draft.setBook(book.title);
    if (book.pageCount) draft.setTargetPages(book.pageCount);
    setShowResults(false);
  };

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
    <div className="glass-panel rounded-3xl overflow-hidden shadow-2xl border border-white/10 w-full">
      {/* Header */}
      <div className="p-4 bg-white/5 flex justify-between items-center border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-accent/20 flex items-center justify-center">
            <Book size={12} className="text-accent" />
          </div>
          <h4 className="text-xs font-bold text-gray-200 uppercase tracking-wider">Session</h4>
        </div>
        <button
          onClick={onMinimize}
          className="p-1.5 rounded-lg hover:bg-white/10 text-muted transition-colors"
        >
          {isMinimized ? <Plus size={16} /> : <Minus size={16} />}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {!isMinimized && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-5 space-y-4 max-h-[450px] overflow-y-auto scrollbar-hide">
          <div className="space-y-3">
            <div className="relative group/search">
              <input
                className="w-full bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:bg-white/10 focus:border-accent/50 outline-none transition-all placeholder:text-muted/50"
                placeholder="Search book title..."
                value={draft.book}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowResults(true)}
              />
              <div className="absolute left-3 top-3 text-muted/50 group-focus-within/search:text-accent transition-colors">
                {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              </div>

              {showResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl z-[60] overflow-hidden max-h-60 overflow-y-auto">
                  {searchResults.map((book) => (
                    <button
                      key={book.id}
                      onClick={() => selectBook(book)}
                      className="w-full p-3 flex gap-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
                    >
                      {book.cover && <img src={book.cover} className="w-8 h-12 rounded object-cover" alt="" />}
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-xs font-bold text-white truncate">{book.title}</span>
                        <span className="text-[10px] text-muted truncate">{book.author}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted uppercase ml-1">Target</label>
                <input
                  className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-sm focus:bg-white/10 focus:border-accent/50 outline-none transition-all"
                  type="number"
                  value={draft.targetPages}
                  onChange={(e) => draft.setTargetPages(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted uppercase ml-1">Read</label>
                <input
                  className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-sm focus:bg-white/10 focus:border-accent/50 outline-none transition-all"
                  type="number"
                  value={draft.pages}
                  onChange={(e) => draft.setPages(e.target.value)}
                />
              </div>
            </div>

            <textarea
              className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-sm h-20 resize-none focus:bg-white/10 focus:border-accent/50 outline-none transition-all placeholder:text-muted/50"
              placeholder="Any reflections..."
              value={draft.notes}
              onChange={(e) => draft.setNotes(e.target.value)}
            />

            <button 
              className="w-full py-3 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-bold shadow-lg shadow-accent/20 transition-all active:scale-[0.98]" 
              onClick={onSubmit}
            >
              Log Session
            </button>
          </div>

          {logs && logs.length > 0 && (
            <div className="pt-4 border-t border-white/5">
              <h5 className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-4">Recent Sessions</h5>
              <div className="space-y-3">
                {logs.slice(0, 5).map((log, index) => (
                  <div key={log.id || index} className="p-3 rounded-2xl bg-white/5 border border-white/5 group hover:bg-white/[0.08] transition-all">
                    {editingLog === log.id ? (
                      <div className="space-y-2">
                        <input
                          className="w-full bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 text-xs"
                          value={editForm.book_name}
                          onChange={(e) => setEditForm({ ...editForm, book_name: e.target.value })}
                        />
                        <div className="flex gap-2">
                          <button onClick={handleSaveEdit} className="p-1 rounded bg-green-500/20 text-green-500 hover:bg-green-500/30">
                            <Check size={14} />
                          </button>
                          <button onClick={handleCancelEdit} className="p-1 rounded bg-red-500/20 text-red-500 hover:bg-red-500/30">
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-bold text-gray-200 truncate pr-8">{log.book_name}</span>
                          <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <button onClick={() => handleEdit(log)} className="p-1 text-muted hover:text-white transition-colors">
                              <Edit2 size={12} />
                            </button>
                            <button onClick={() => handleDelete(log.id)} className="p-1 text-muted hover:text-red-400 transition-colors">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted">
                          <span className="flex items-center gap-1"><Check size={10} className="text-accent" /> {log.pages_read} pages</span>
                          <span>•</span>
                          <span>{new Date(log.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
