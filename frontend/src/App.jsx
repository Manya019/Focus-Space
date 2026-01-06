import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Profile from './pages/Profile';
import ReadingRoom from './pages/ReadingRoom';
import Discussions from './pages/Discussions';
import BookReviews from './pages/BookReviews';
import { getUserReviews } from './services/api';

const views = ['login', 'profile', 'room', 'discussions', 'reviews'];

export default function App() {
  const [view, setView] = useState('login');
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);
  const [userReviews, setUserReviews] = useState([]);

  const logout = () => {
    setUser(null);
    setView('login');
  };

  useEffect(() => {
    if (user?.id) {
      getUserReviews(user.id).then(setUserReviews).catch(() => setUserReviews([]));
    } else {
      setUserReviews([]);
    }
  }, [user]);

  const renderView = () => {
    switch (view) {
      case 'profile':
        return <Profile user={user} logout={logout} onUserUpdate={setUser} />;
      case 'room':
        return <ReadingRoom user={user} />;
      case 'discussions':
        return <Discussions user={user} />;
      case 'reviews':
        return <BookReviews user={user} />;
      default:
        return <Login onAuthed={(u) => { setUser(u); setView('room'); }} />;
    }
  };

  return (
    <div className="min-h-screen bg-backdrop text-gray-100">
      <header className="flex items-center gap-4 px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <button className="md:hidden p-2 rounded-md hover:bg-gray-800" onClick={() => setSidebarOpen((s) => !s)} aria-label="Toggle sidebar">☰</button>
          <h1 className="text-lg font-semibold">Reading Room</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <nav className="hidden md:flex gap-2">
            {views.filter(v => user ? v !== 'login' : v === 'login').map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1 rounded-md ${view === v ? 'bg-accent text-white' : 'text-muted hover:bg-gray-800'}`}
              >
                {v}
              </button>
            ))}
          </nav>
          <button className="md:hidden p-2 rounded-md hover:bg-gray-800" onClick={() => setUsersOpen((s) => !s)} aria-label="Toggle users">👥</button>
        </div>
      </header>

      <div className="md:flex">
        <aside className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-panel p-4 md:static md:translate-x-0 md:w-60 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex items-center justify-between mb-4">
            <strong>Channels</strong>
            <button className="md:hidden text-sm text-muted" onClick={() => setSidebarOpen(false)}>Close</button>
          </div>
          <ul className="space-y-2 mb-4">
            <li>
              <button className="w-full text-left px-2 py-1 rounded hover:bg-gray-800" onClick={() => { setView('room'); setSidebarOpen(false); }}>Reading Room</button>
            </li>
            <li>
              <button className="w-full text-left px-2 py-1 rounded hover:bg-gray-800" onClick={() => { setView('discussions'); setSidebarOpen(false); }}>Discussions</button>
            </li>
            <li>
              <button className="w-full text-left px-2 py-1 rounded hover:bg-gray-800" onClick={() => { setView('reviews'); setSidebarOpen(false); }}>Reviews</button>
            </li>
          </ul>
          <div>
            <strong className="block mb-2">History</strong>
            <ul className="text-sm text-muted space-y-1">
              {user ? (
                <>
                  {userReviews.length > 0 ? (
                    <>
                      <li className="font-medium text-gray-300 mt-4 mb-4">Reviewed Books:</li>
                      {userReviews.slice(0, 3).map(review => (
                        <li key={review.id} className="text-xs py-1">
                          {review.book_title} ({review.rating}★)
                        </li>
                      ))}
                      {userReviews.length > 3 && (
                        <li className="ml-2 text-xs text-accent">+{userReviews.length - 3} more</li>
                      )}
                    </>
                  ) : (
                    <li>No reviews yet</li>
                  )}
                </>
              ) : (
                <>
                  <li>Joined 2 days ago</li>
                  <li>Last session: 6 hrs</li>
                </>
              )}
            </ul>
          </div>
        </aside>

        <main className="flex-1 p-4 md:mx-4 md:my-4 md:rounded-md">
          {renderView()}
        </main>

        <aside className={`fixed inset-y-0 right-0 z-30 w-72 transform bg-panel p-4 md:static md:translate-x-0 md:w-72 ${usersOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex items-center justify-between mb-4">
            <strong>Active</strong>
            <button className="md:hidden text-sm text-muted" onClick={() => setUsersOpen(false)}>Close</button>
          </div>
          <div className="space-y-3 overflow-y-auto max-h-[70vh]">
            {/* Presence list will be rendered inside ReadingRoom via component, keep this pane for desktop */}
            <p className="text-sm text-muted">Open a room to see active users</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

