import React from 'react';

export default function PresenceList({ presence = [] }) {
  return (
    <div className="panel">
      <h4 className="text-sm font-semibold mb-3">In the room</h4>
      <ul className="space-y-3">
        {presence.map((p, i) => {
          const percent = p.target_pages ? Math.min(100, Math.round(((p.pages_read || 0) / p.target_pages) * 100)) : 0;
          const displayName = p.username || 'Anonymous';
          const initials = displayName[0].toUpperCase();
          const avatarUrl = p.avatar_url;
          return (
            <li key={i} className="text-sm">
              <div className="flex items-center space-x-3 mb-1">
                <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-white">{displayName}</div>
                  <div className="text-xs text-white">{p.book || 'No book'}</div>
                </div>
              </div>
              <div className="progress-bar">
                <i style={{ width: `${percent}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

