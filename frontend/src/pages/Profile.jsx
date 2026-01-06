import React, { useEffect, useState } from 'react';
import ProfileForm from '../components/ProfileForm';
import { getProfile, updateProfile, fetchLogs, getNotifications, setNotifications } from '../services/api';

export default function Profile({ user, logout, onUserUpdate }) {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ sessions: 0, totalPages: 0, totalBooks: 0 });
  const [logs, setLogs] = useState([]);
  const [notifications, setNotifications] = useState({ enabled: false, notify_time: '09:00' });
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    if (!user?.id) return;
    getProfile(user.id).then(setProfile).catch(() => setProfile(null));
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;
    fetchLogs(user.id).then((logs) => {
      setLogs(logs);
      const sessions = logs.length;
      const totalPages = logs.reduce((sum, log) => sum + (log.pages_read || 0), 0);
      const totalBooks = new Set(logs.map(log => log.book_name)).size;
      setStats({ sessions, totalPages, totalBooks });
    }).catch(() => {
      setLogs([]);
      setStats({ sessions: 0, totalPages: 0, totalBooks: 0 });
    });
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;
    getNotifications(user.id).then(setNotifications).catch(() => setNotifications({ enabled: false, notify_time: '09:00' }));
  }, [user]);

  const handleSave = async (values) => {
    await updateProfile(user.id, values);
    setProfile({ ...profile, ...values });
    // Update the user state if username changed
    if (values.username && values.username !== user.username) {
      onUserUpdate?.({ ...user, username: values.username });
    }
  };

  const handleNotificationSave = async (values) => {
    await setNotifications({ user_id: user.id, ...values });
    setNotifications({ ...notifications, ...values });
  };

  if (!user) return (
    <div className="p-6 text-center">
      <p className="text-sm text-muted">Please login first.</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className="panel flex items-center space-x-4">
        <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center text-white text-xl font-bold">
          {(user.username || user.email || 'U')[0].toUpperCase()}
        </div>
        <div>
          <h2 className="text-xl font-semibold">{user.username || 'User'}</h2>
          <p className="text-muted">{user.email}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-panel rounded-md p-1">
        {['info', 'stats', 'history', 'settings'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab ? 'bg-accent text-white' : 'text-muted hover:bg-gray-800'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'info' && (
        <div className="panel">
          <h3 className="text-lg font-semibold mb-4">Profile Information</h3>
          <ProfileForm initial={profile} onSave={handleSave} />
          {profile && (
            <div className="mt-6 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted">About:</span>
                <span>{profile.about || 'Not set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Favorite genre:</span>
                <span>{profile.genre || 'Not set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Likes:</span>
                <span>{profile.likes || 'Not set'}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="panel">
          <h3 className="text-lg font-semibold mb-4">Reading Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-[#07101a] rounded-md">
              <div className="text-2xl font-bold text-accent">{stats.sessions}</div>
              <div className="text-sm text-muted">Sessions</div>
            </div>
            <div className="text-center p-4 bg-[#07101a] rounded-md">
              <div className="text-2xl font-bold text-accent">{stats.totalPages}</div>
              <div className="text-sm text-muted">Pages Read</div>
            </div>
            <div className="text-center p-4 bg-[#07101a] rounded-md">
              <div className="text-2xl font-bold text-accent">{stats.totalBooks}</div>
              <div className="text-sm text-muted">Books</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="panel">
          <h3 className="text-lg font-semibold mb-4">Session Notes History</h3>
          {logs.length > 0 ? (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="border border-gray-800 rounded-md p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium">{log.book_name}</h4>
                    <span className="text-sm text-muted">{new Date(log.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="text-sm text-muted mb-2">
                    Pages read: {log.pages_read} / {log.target_pages}
                  </div>
                  {log.reflection && (
                    <div className="text-sm">
                      <strong>Notes:</strong> {log.reflection}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted">No session notes yet.</p>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="panel">
          <h3 className="text-lg font-semibold mb-4">Account Settings</h3>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Reading Reminders</label>
              <form onSubmit={(e) => { e.preventDefault(); handleNotificationSave(notifications); }} className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="notifications-enabled"
                    checked={notifications.enabled}
                    onChange={(e) => setNotifications({ ...notifications, enabled: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="notifications-enabled" className="text-sm">Enable daily reading reminders</label>
                </div>
                <div>
                  <label htmlFor="notify-time" className="block text-sm mb-1">Reminder time</label>
                  <input
                    type="time"
                    id="notify-time"
                    value={notifications.notify_time}
                    onChange={(e) => setNotifications({ ...notifications, notify_time: e.target.value })}
                    className="bg-[#07101a] rounded-md px-3 py-2 text-sm border border-gray-800"
                    disabled={!notifications.enabled}
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-accent rounded-md text-sm font-medium hover:opacity-90"
                >
                  Save Preferences
                </button>
              </form>
              <p className="text-xs text-muted mt-2">Receive daily email reminders about your unread books.</p>
            </div>

            <div className="pt-4 border-t border-gray-800">
              <button
                onClick={logout}
                className="px-4 py-2 bg-red-600 rounded-md text-sm font-medium hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

