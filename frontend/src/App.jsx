import React, { useState, useEffect, useRef } from 'react';
import { SignedIn, SignedOut, UserButton, useUser, SignInButton, useClerk } from '@clerk/clerk-react';
import { Menu, X, Users, BookOpen, MessageSquare, Star, LayoutDashboard, LogOut, ShieldAlert, Zap, ChevronLeft, ChevronUp } from 'lucide-react';
import LandingPage from './pages/LandingPage';
import Profile from './pages/Profile';
import FocusSpace from './pages/FocusSpace';
import Discussions from './pages/Discussions';
import BookReviews from './pages/BookReviews';
import PomodoroTimer from './components/PomodoroTimer';
import { getUserReviews } from './services/api';
import { cn } from './lib/utils';
import { PomoProvider } from './state/pomo';

const navItems = [
  { id: 'room', label: 'FocusSpace', icon: BookOpen },
  { id: 'discussions', label: 'Discussions', icon: MessageSquare },
  { id: 'reviews', label: 'Book Gallery', icon: Star },
  { id: 'profile', label: 'Account', icon: Users },
];

export default function App({ isAuthEnabled }) {
  const clerk = isAuthEnabled ? useUser() : { user: null, isLoaded: true, isSignedIn: false };
  const { signOut } = isAuthEnabled ? useClerk() : { signOut: null };
  const { user: clerkUser, isLoaded, isSignedIn } = clerk;
  
  const [view, setView] = useState('landing');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [userReviews, setUserReviews] = useState([]);
  const accountMenuRef = useRef(null);

  // Memoize user object for stable references
  const user = React.useMemo(() => {
    if (!clerkUser) return isSignedIn ? { id: 'demo-user', name: 'Demo User' } : null;
    return {
      id: clerkUser.id,
      token: clerkUser.id,
      name: clerkUser.fullName || clerkUser.username || 'User',
      username: clerkUser.fullName || clerkUser.username || clerkUser.firstName || 'User',
      email: clerkUser.primaryEmailAddress?.emailAddress,
      avatar: clerkUser.imageUrl,
    };
  }, [clerkUser, isSignedIn]);

  useEffect(() => {
    if (user?.id && isAuthEnabled) {
      getUserReviews(user.id)
        .then(data => setUserReviews(Array.isArray(data) ? data : []))
        .catch(() => setUserReviews([]));
    }
  }, [user, isAuthEnabled]);

  useEffect(() => {
    if (isSignedIn && view === 'landing') {
      setView('room');
    }
  }, [isSignedIn, view]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!accountMenuRef.current?.contains(event.target)) {
        setAccountMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const renderView = () => {
    switch (view) {
      case 'profile':
        return <Profile user={user} logout={() => signOut?.({ redirectUrl: '/' })} onUserUpdate={() => {}} />;
      case 'room':
        return <FocusSpace user={user} />;
      case 'discussions':
        return <Discussions user={user} />;
      case 'reviews':
        return <BookReviews user={user} />;
      default:
        return <FocusSpace user={user} />;
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (view === 'landing' && !isSignedIn) {
    return <LandingPage onEnter={() => setView('room')} isAuthEnabled={isAuthEnabled} />;
  }

  return (
    <PomoProvider>
      <div className="h-[100dvh] bg-[#020617] text-slate-100 flex overflow-hidden font-sans relative overscroll-none">
        {/* Floating Sidebar Toggle */}
        {!sidebarOpen && (
          <button 
            onClick={() => setSidebarOpen(true)}
            className="fixed top-8 left-8 z-[100] p-3 rounded-xl bg-slate-900/80 border border-slate-800/50 text-slate-400 hover:text-white transition-all backdrop-blur-md shadow-lg"
            title="Open Sidebar"
          >
            <Menu size={20} />
          </button>
        )}
        {/* Sidebar */}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-50 w-80 bg-[#0f172a]/80 backdrop-blur-xl border-r border-slate-800/50 transform transition-all duration-500 ease-in-out md:relative md:translate-x-0 shadow-2xl shadow-indigo-950/20",
          !sidebarOpen && "-translate-x-full md:hidden"
        )}>
        <div className="flex min-h-0 flex-col h-full">
          {/* Logo */}
          <div className="shrink-0 p-8 flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView('landing')}>
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/40 group-hover:scale-110 transition-transform">
                <BookOpen size={22} className="text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-xl tracking-tight leading-none">Focus Space</span>
              </div>
            </div>
            <button 
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition duration-300" 
              onClick={() => setSidebarOpen(false)}
              title="Collapse Sidebar"
            >
              <ChevronLeft size={20} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 min-h-0 px-4 space-y-2 mt-4 overflow-y-auto overscroll-contain custom-scrollbar">
            <div className="px-4 mb-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Main Menu</div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = view === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setView(item.id);
                    if (window.innerWidth < 768) setSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group relative overflow-hidden",
                    isActive 
                      ? "bg-indigo-600 text-white shadow-xl shadow-indigo-900/30" 
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                  )}
                >
                  <Icon size={20} className={cn(
                    "transition-all duration-300 z-10",
                    isActive ? "scale-110" : "group-hover:scale-110"
                  )} />
                  <span className="font-bold text-sm z-10">{item.label}</span>
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-indigo-500 z-0"></div>
                  )}
                </button>
              );
            })}

            {/* Pomodoro Section */}
            <div className="pt-8 px-4 pb-4">
              <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                
                Focus Zone
              </div>
              <PomodoroTimer variant="sidebar" />
            </div>
          </nav>

          {/* Account Menu */}
          <div ref={accountMenuRef} className="shrink-0 relative p-4 bg-slate-900/50 border-t border-slate-800/50">
            {accountMenuOpen && (
              <div className="absolute left-4 right-4 bottom-[calc(100%+0.75rem)] z-[70] rounded-2xl border border-slate-700/60 bg-slate-950/95 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  {isAuthEnabled && user?.avatar ? (
                    <img src={user.avatar} alt="" className="w-11 h-11 rounded-xl object-cover border border-white/10" />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-indigo-600/25 flex items-center justify-center text-indigo-300 font-black border border-indigo-500/20">
                      {(user?.name || 'Demo').charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-slate-100 truncate">{user?.name || 'Demo Account'}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        {isAuthEnabled ? 'Pro Member' : 'Demo Mode'}
                      </span>
                    </div>
                  </div>
                  {isAuthEnabled && (
                    <UserButton afterSignOutUrl="/" appearance={{ elements: { userButtonAvatarBox: "w-9 h-9 rounded-xl" } }} />
                  )}
                </div>

                {!isAuthEnabled && (
                  <div className="mt-4 rounded-xl bg-amber-500/5 border border-amber-500/20 p-3 flex gap-2">
                    <ShieldAlert size={15} className="text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-amber-200/70 leading-relaxed font-medium">
                      Secure auth disabled. Add Clerk keys to enable persistence.
                    </p>
                  </div>
                )}

                <button 
                  onClick={() => {
                    setAccountMenuOpen(false);
                    setView('landing');
                  }}
                  className="mt-4 w-full rounded-xl bg-indigo-600/15 border border-indigo-500/20 px-3 py-2 text-left text-[11px] font-black uppercase tracking-widest text-indigo-300 hover:bg-indigo-600/25 hover:text-white transition-colors"
                >
                  {isAuthEnabled ? 'Account Home' : 'Sign In'}
                </button>
              </div>
            )}

            <button
              onClick={() => setAccountMenuOpen(open => !open)}
              className="w-full h-12 flex items-center gap-3 rounded-2xl bg-slate-800/40 border border-slate-800/50 px-3 text-left hover:border-indigo-500/30 hover:bg-slate-800/70 transition-all"
              title="Account"
            >
              {isAuthEnabled && user?.avatar ? (
                <img src={user.avatar} alt="" className="w-8 h-8 rounded-lg object-cover border border-white/10" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center text-indigo-300 text-sm font-black border border-indigo-500/20">
                  {(user?.name || 'D').charAt(0)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-slate-200 truncate">{user?.name || 'Demo Account'}</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                  {isAuthEnabled ? 'Pro Member' : 'Sign In'}
                </p>
              </div>
              <ChevronUp size={16} className={cn("text-slate-500 transition-transform", accountMenuOpen && "rotate-180")} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col h-full overflow-hidden relative">
        {/* Top Glow */}
        <div className="absolute top-0 left-1/4 right-1/4 h-32 bg-indigo-600/5 blur-[120px] -z-10 pointer-events-none"></div>



        <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar relative">
          <div className="h-full min-h-0">
            {renderView()}
          </div>
        </main>
      </div>
    </div>
    </PomoProvider>
  );
}
