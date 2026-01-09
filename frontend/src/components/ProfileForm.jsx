import React, { useEffect, useState } from 'react';

export default function ProfileForm({ initial, onSave }) {
  const [username, setUsername] = useState('');
  const [genre, setGenre] = useState('');
  const [about, setAbout] = useState('');
  const [likes, setLikes] = useState('');

  useEffect(() => {
    if (initial) {
      setUsername(initial.username || '');
      setGenre(initial.genre || '');
      setAbout(initial.about || '');
      setLikes(initial.likes || '');
    }
  }, [initial]);

  const submit = async (e) => {
    e.preventDefault();
    await onSave({ username, genre, about, likes });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Username</label>
        <input
          className="w-full bg-[#07101a] rounded-md px-3 py-2 text-sm border border-gray-800 focus:outline-none focus:ring-2 focus:ring-accent"
          placeholder="Choose a username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Favorite Genre</label>
        <input
          className="w-full bg-[#07101a] rounded-md px-3 py-2 text-sm border border-gray-800 focus:outline-none focus:ring-2 focus:ring-accent"
          placeholder="e.g., Fantasy, Sci-Fi"
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">About You</label>
        <textarea
          className="w-full bg-[#07101a] rounded-md px-3 py-2 text-sm border border-gray-800 focus:outline-none focus:ring-2 focus:ring-accent resize-none"
          placeholder="Tell us about yourself..."
          rows={3}
          value={about}
          onChange={(e) => setAbout(e.target.value)}
        />
      </div>
      <button
        type="submit"
        className="px-4 py-2 bg-accent rounded-md text-sm font-medium hover:opacity-90"
      >
        Save Profile
      </button>
    </form>
  );
}

