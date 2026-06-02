import React, { useState, useEffect } from 'react';
import { getBooks, createBook, getReviews, createReview } from '../services/api';
import { Search, Plus, Star, Book, User as UserIcon, Calendar, X, MessageCircle, Send, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

export default function BookReviews({ user }) {
  const [search, setSearch] = useState('');
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ rating: 5, text: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newBook, setNewBook] = useState({ title: '', author: '', description: '' });
  const [showAddModal, setShowAddModal] = useState(false);

  // Open Library API search states
  const [olQuery, setOlQuery] = useState('');
  const [olResults, setOlResults] = useState([]);
  const [olLoading, setOlLoading] = useState(false);

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async (query = '') => {
    try {
      setLoading(true);
      const data = await getBooks(query);
      setBooks(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to fetch books');
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchBooks(search);
  };

  const handleBookSelect = async (book) => {
    if (!book || !book.id) return;
    setSelectedBook(book);
    setReviews([]);
    try {
      const data = await getReviews(book.id);
      setReviews(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to fetch reviews');
    }
  };

  const handleCreateBook = async (e) => {
    e.preventDefault();
    if (!newBook.title.trim() || !newBook.author.trim()) return;
    try {
      const createdBook = await createBook({ 
        title: newBook.title.trim(), 
        author: newBook.author.trim(),
        description: newBook.description.trim() 
      });
      if (createdBook) {
        setBooks(prev => [createdBook, ...prev]);
        setShowAddModal(false);
        setNewBook({ title: '', author: '', description: '' });
        setOlResults([]);
        setOlQuery('');
      }
    } catch (err) {
      setError('Failed to create book');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBook || !user || !newReview.text.trim()) return;
    try {
      const review = await createReview({
        book_id: selectedBook.id,
        user_id: user.id,
        rating: newReview.rating,
        review_text: newReview.text
      });
      if (review) {
        // Ensure username is present for the new review
        review.username = user.username || user.email;
        setReviews(prev => [review, ...prev]);
        setNewReview({ rating: 5, text: '' });
      }
    } catch (err) {
      setError('Failed to submit review');
    }
  };

  // Search Open Library API
  const handleOpenLibrarySearch = async (e) => {
    e.preventDefault();
    if (!olQuery.trim()) return;
    setOlLoading(true);
    try {
      const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(olQuery.trim())}&limit=5`);
      const data = await res.json();
      if (data && data.docs) {
        setOlResults(data.docs.map(doc => ({
          title: doc.title,
          author: doc.author_name ? doc.author_name.join(', ') : 'Unknown Author',
          description: doc.first_sentence ? doc.first_sentence[0] : (doc.subject ? `A masterpiece about ${doc.subject.slice(0, 3).join(', ')}.` : ''),
          coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null
        })));
      }
    } catch (err) {
      console.error("Open Library search failed:", err);
    } finally {
      setOlLoading(false);
    }
  };

  const selectOpenLibraryBook = (book) => {
    setNewBook({
      title: book.title,
      author: book.author,
      description: book.description
    });
    setOlResults([]);
    setOlQuery('');
  };

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-center">
        <div className="max-w-sm space-y-4">
          <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto border border-slate-800">
            <Book className="text-indigo-400" size={32} />
          </div>
          <h2 className="text-xl font-bold text-white">Explore Books</h2>
          <p className="text-slate-400 text-sm">Please log in to browse and review books.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 bg-slate-900/40 border-b border-slate-800 backdrop-blur-md shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-1">Book Gallery</h1>
            <p className="text-sm text-slate-500">Discover and share thoughts on your favorite reads</p>
          </div>
          
          <div className="flex items-center gap-3">
            <form onSubmit={handleSearch} className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={16} />
              <input
                type="text"
                placeholder="Search books..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all w-full md:w-64"
              />
            </form>
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-900/20 transition-all active:scale-95 animate-in fade-in duration-300"
            >
              <Plus size={18} />
              <span>Add Book</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
            <p className="text-sm text-slate-500 font-medium tracking-wide">Fetching books...</p>
          </div>
        ) : error ? (
          <div className="bg-red-950/20 border border-red-900/50 p-6 rounded-2xl text-center max-w-md mx-auto">
            <p className="text-red-400 text-sm">{error}</p>
            <button onClick={() => fetchBooks()} className="mt-4 text-xs font-bold text-red-300 hover:underline">Try again</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {books.map((book) => (
              <div 
                key={book.id} 
                onClick={() => handleBookSelect(book)}
                className="group relative bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden hover:border-indigo-500/50 hover:bg-slate-900/60 transition-all duration-300 cursor-pointer shadow-xl hover:shadow-indigo-900/10 flex flex-col h-full"
              >
                {/* Book "Cover" Aesthetic */}
                <div className="aspect-[3/4] bg-gradient-to-br from-slate-800 to-slate-950 p-8 flex flex-col justify-end relative overflow-hidden shrink-0">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/20 transition-all"></div>
                  <Book className="text-slate-700 mb-4 group-hover:text-indigo-500/40 transition-colors" size={48} />
                  <h3 className="text-xl font-black text-white leading-tight mb-2 line-clamp-2">{book.title}</h3>
                  <p className="text-indigo-400 font-bold text-sm">{book.author}</p>
                </div>
                
                <div className="p-6 flex flex-col flex-1">
                  <p className="text-slate-400 text-xs line-clamp-3 mb-6 flex-1 italic leading-relaxed font-sans">
                    {book.description || "No description provided for this masterpiece."}
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-800/50">
                    <div className="flex items-center gap-1 text-amber-400">
                      <Star size={14} fill="currentColor" />
                      <span className="text-xs font-bold">4.8</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                      {book.created_at ? new Date(book.created_at).getFullYear() : 'New'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Book Detail Modal */}
      {selectedBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 overflow-hidden">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setSelectedBook(null)}></div>
          
          <div className="relative bg-slate-900 border border-slate-800 w-full max-w-5xl max-h-full rounded-[40px] shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setSelectedBook(null)}
              className="absolute top-6 right-6 z-10 w-10 h-10 bg-slate-950/50 backdrop-blur-md rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              <X size={20} />
            </button>

            {/* Left Column: Book Info */}
            <div className="md:w-2/5 bg-gradient-to-b from-indigo-950/20 to-slate-950 p-10 flex flex-col">
              <div className="mb-8">
                <div className="w-12 h-12 bg-indigo-600/20 rounded-2xl flex items-center justify-center border border-indigo-500/20 mb-6">
                  <Book className="text-indigo-400" size={24} />
                </div>
                <h2 className="text-3xl font-black text-white leading-tight mb-2 tracking-tight">{selectedBook.title}</h2>
                <p className="text-xl font-bold text-indigo-400 mb-6">by {selectedBook.author}</p>
                <div className="h-1 w-20 bg-indigo-600 rounded-full mb-8"></div>
                <p className="text-slate-400 text-sm leading-relaxed italic">
                  {selectedBook.description || "No description provided."}
                </p>
              </div>

              <div className="mt-auto space-y-4 pt-8 border-t border-slate-800/50">
                <div className="flex items-center gap-3 text-slate-400">
                  <Calendar size={16} />
                  <span className="text-xs">Added {selectedBook.created_at ? new Date(selectedBook.created_at).toLocaleDateString() : 'Recently'}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-400">
                  <MessageCircle size={16} />
                  <span className="text-xs">{reviews.length} community reviews</span>
                </div>
              </div>
            </div>

            {/* Right Column: Reviews */}
            <div className="md:w-3/5 bg-slate-900 p-10 flex flex-col overflow-hidden">
              <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-2">
                Reviews
                <span className="text-xs bg-slate-800 px-3 py-1 rounded-full text-slate-400 font-bold">{reviews.length}</span>
              </h3>

              <div className="flex-1 overflow-y-auto pr-2 mb-8 space-y-6 custom-scrollbar">
                {reviews.map((r, i) => (
                  <div key={i} className="bg-slate-800/30 border border-slate-800 rounded-3xl p-6 hover:bg-slate-800/50 transition-colors">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-600/20 rounded-xl flex items-center justify-center text-indigo-400 text-[10px] font-bold border border-indigo-500/20 uppercase">
                          {(r.username || 'U')[0]}
                        </div>
                        <span className="text-sm font-bold text-slate-200">{r.username || 'Anonymous'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-amber-400 bg-amber-400/5 px-3 py-1 rounded-full border border-amber-400/10">
                        <Star size={12} fill="currentColor" />
                        <span className="text-xs font-black">{r.rating}</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed italic">"{r.review_text}"</p>
                  </div>
                ))}
                {reviews.length === 0 && (
                  <div className="h-32 flex flex-col items-center justify-center text-slate-600 italic">
                    <p className="text-sm">No reviews yet. Be the first!</p>
                  </div>
                )}
              </div>

              {/* Add Review Form */}
              <div className="bg-slate-950/50 border border-slate-800 p-6 rounded-[32px] shrink-0">
                <form onSubmit={handleReviewSubmit} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Write a review</span>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewReview({ ...newReview, rating: star })}
                          className={cn(
                            "transition-all duration-200",
                            newReview.rating >= star ? "text-amber-400 scale-110" : "text-slate-700 hover:text-slate-500"
                          )}
                        >
                          <Star size={18} fill={newReview.rating >= star ? "currentColor" : "none"} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="relative">
                    <textarea
                      placeholder="Share your thoughts on this book..."
                      value={newReview.text}
                      onChange={(e) => setNewReview({ ...newReview, text: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none h-24 transition-all"
                      required
                    />
                    <button
                      type="submit"
                      disabled={!newReview.text.trim()}
                      className="absolute bottom-4 right-4 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg transition-all active:scale-90 disabled:opacity-50"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Book Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => { setShowAddModal(false); setOlResults([]); setOlQuery(''); }}></div >
          <div className="relative bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-[40px] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-white">Add New Book</h2>
              <button onClick={() => { setShowAddModal(false); setOlResults([]); setOlQuery(''); }} className="text-slate-400 hover:text-white p-1">
                <X size={20} />
              </button>
            </div>

            {/* Open Library Search Section */}
            <div className="mb-6 bg-slate-950/40 p-4 rounded-3xl border border-white/5">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                <Sparkles size={12} /> Auto-fill from Open Library (Free Book API)
              </span>
              <form onSubmit={handleOpenLibrarySearch} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search book title or author..."
                  value={olQuery}
                  onChange={(e) => setOlQuery(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 rounded-xl text-xs font-bold transition-all"
                  disabled={olLoading}
                >
                  {olLoading ? 'Searching...' : 'Search'}
                </button>
              </form>

              {/* Open Library Search Results list */}
              {olResults.length > 0 && (
                <div className="mt-4 flex flex-col gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {olResults.map((olBook, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => selectOpenLibraryBook(olBook)}
                      className="w-full text-left bg-slate-900 border border-transparent hover:border-indigo-500/30 p-2.5 rounded-xl transition flex gap-3 items-center group"
                    >
                      {olBook.coverUrl ? (
                        <img src={olBook.coverUrl} alt="Cover" className="w-8 h-10 object-cover rounded-md" />
                      ) : (
                        <div className="w-8 h-10 bg-slate-850 rounded-md flex items-center justify-center"><Book size={12} className="text-slate-500" /></div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-white truncate group-hover:text-indigo-400 transition-colors">{olBook.title}</h4>
                        <p className="text-[10px] text-slate-400 truncate">{olBook.author}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Manual Form (Can be populated from search) */}
            <form onSubmit={handleCreateBook} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Book Title</label>
                <input
                  type="text"
                  placeholder="The Midnight Library"
                  value={newBook.title}
                  onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Author Name</label>
                <input
                  type="text"
                  placeholder="Matt Haig"
                  value={newBook.author}
                  onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Short Description</label>
                <textarea
                  placeholder="What is this book about?"
                  value={newBook.description}
                  onChange={(e) => setNewBook({ ...newBook, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none h-20"
                />
              </div>
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setOlResults([]); setOlQuery(''); }}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-900/20 transition-all active:scale-95"
                >
                  Add to Gallery
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}