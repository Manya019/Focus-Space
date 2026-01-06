import React, { useState, useEffect } from 'react';
import { getBooks, createBook, getReviews, createReview } from '../services/api';

export default function BookReviews({ user }) {
  const [search, setSearch] = useState('');
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ rating: 5, text: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newBook, setNewBook] = useState({ title: '', author: '' });

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
      console.error(err);
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
    setReviews([]); // Clear reviews while fetching
    try {
      const data = await getReviews(book.id);
      setReviews(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to fetch reviews');
      console.error(err);
      setReviews([]);
    }
  };

  const handleCreateBook = async (e) => {
    e.preventDefault();
    if (!newBook.title.trim() || !newBook.author.trim()) return;
    try {
      const createdBook = await createBook({ title: newBook.title.trim(), author: newBook.author.trim() });
      if (createdBook) {
        setBooks(prev => Array.isArray(prev) ? [...prev, createdBook] : [createdBook]);
        setSelectedBook(createdBook);
        setReviews([]);
      }
      setNewBook({ title: '', author: '' });
      setError('');
    } catch (err) {
      setError('Failed to create book');
      console.error(err);
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
        setReviews(prev => Array.isArray(prev) ? [...prev, review] : [review]);
      }
      setNewReview({ rating: 5, text: '' });
    } catch (err) {
      setError('Failed to submit review');
      console.error(err);
    }
  };

  if (!user) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-muted">Please login to view book reviews.</p>
      </div>
    );
  }

  if (!user.id) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-muted">Invalid user session. Please login again.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="panel">
        <h2 className="text-xl font-semibold mb-4">Book Reviews</h2>
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Search for books..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-[#07101a] rounded-md px-3 py-2 text-sm border border-gray-800"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-accent rounded-md text-sm font-medium hover:opacity-90"
          >
            Search
          </button>
        </form>

        <form onSubmit={handleCreateBook} className="flex gap-2">
          <input
            type="text"
            placeholder="Book title"
            value={newBook.title}
            onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
            className="flex-1 bg-[#07101a] rounded-md px-3 py-2 text-sm border border-gray-800"
            required
          />
          <input
            type="text"
            placeholder="Author"
            value={newBook.author}
            onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
            className="flex-1 bg-[#07101a] rounded-md px-3 py-2 text-sm border border-gray-800"
            required
          />
          <button
            type="submit"
            className="px-4 py-2 bg-secondary rounded-md text-sm font-medium hover:opacity-90"
          >
            Add Book
          </button>
        </form>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>

      {loading ? (
        <div className="text-center">Loading books...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.isArray(books) && books.map((book) => (
            <div key={book?.id || Math.random()} className="panel cursor-pointer" onClick={() => handleBookSelect(book)}>
              <h3 className="text-lg font-semibold">{book?.title || 'Unknown Title'}</h3>
              <p className="text-muted">by {book?.author || 'Unknown Author'}</p>
              <p className="text-sm mt-2">{book?.description || ''}</p>
            </div>
          ))}
        </div>
      )}

      {selectedBook && (
        <div className="panel">
          <h3 className="text-lg font-semibold mb-4">{selectedBook?.title || 'Unknown Title'} by {selectedBook?.author || 'Unknown Author'}</h3>
          <p className="mb-4">{selectedBook?.description || ''}</p>

          <h4 className="font-semibold mb-2">Reviews</h4>
          <div className="space-y-3 mb-6">
            {Array.isArray(reviews) && reviews.map((review) => (
              <div key={review?.id || Math.random()} className="border border-gray-700 rounded-md p-3 bg-[#07101a]">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{review?.username || `User ${review?.user_id || 'Unknown'}`}</span>
                  <span className="text-accent">★ {review?.rating || 0}</span>
                </div>
                <p className="text-sm">{review?.review_text || ''}</p>
                <p className="text-xs text-muted mt-1">{review?.created_at ? new Date(review.created_at).toLocaleDateString() : 'Unknown date'}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleReviewSubmit} className="space-y-3">
            <h4 className="font-semibold">Add Your Review</h4>
            <div>
              <label className="block text-sm mb-1">Rating</label>
              <select
                value={newReview.rating}
                onChange={(e) => setNewReview({ ...newReview, rating: Number(e.target.value) })}
                className="bg-[#07101a] rounded-md px-3 py-2 text-sm border border-gray-800"
              >
                {[1, 2, 3, 4, 5].map((r) => (
                  <option key={r} value={r}>★ {r}</option>
                ))}
              </select>
            </div>
            <textarea
              placeholder="Write your review..."
              value={newReview.text}
              onChange={(e) => setNewReview({ ...newReview, text: e.target.value })}
              className="w-full bg-[#07101a] rounded-md px-3 py-2 text-sm border border-gray-800 resize-none"
              rows={3}
              required
            />
            <button
              type="submit"
              className="px-4 py-2 bg-accent rounded-md text-sm font-medium hover:opacity-90"
            >
              Submit Review
            </button>
          </form>

          <button
            onClick={() => setSelectedBook(null)}
            className="mt-4 text-sm text-muted hover:text-gray-200"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}