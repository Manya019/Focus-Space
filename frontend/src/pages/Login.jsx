import React, { useState } from 'react';
import { login, register } from '../services/api';

export default function Login({ onAuthed }) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data =
        mode === 'register'
          ? await register({ email, username, password })
          : await login({ email, password });

      // Backend returns canonical username/email (and profile fields on login).
      onAuthed({
        id: data.user_id,
        token: data.token,
        email: data.email ?? email,
        username: data.username ?? username,
        genre: data.genre,
        about: data.about,
        likes: data.likes,
      });
    } catch (err) {
      setError(err.message || 'failed');
    }
  };

  const googleLogin = () => {
    // Redirect to backend Google OAuth endpoint
    const base = import.meta.env.VITE_API_URL;
    if (!base) {
      setError('Missing VITE_API_URL');
      return;
    }
    window.location.href = `${base}/auth/google/login`;
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="panel">
        <h3 className="text-lg font-semibold mb-4">{mode === 'register' ? 'Create account' : 'Sign in'}</h3>
        <form onSubmit={submit} className="space-y-4">
          {mode === 'register' && (
            <input
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full bg-[#07101a] rounded-md px-3 py-2 text-sm border border-gray-800"
            />
          )}
          <input
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-[#07101a] rounded-md px-3 py-2 text-sm border border-gray-800"
          />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-[#07101a] rounded-md px-3 py-2 text-sm border border-gray-800"
          />
          <button
            type="submit"
            className="w-full px-4 py-2 bg-accent rounded-md text-sm font-medium hover:opacity-90"
          >
            {mode === 'register' ? 'Register' : 'Login'}
          </button>
        </form>
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setMode(mode === 'register' ? 'login' : 'register')}
            className="text-sm text-accent hover:underline"
          >
            Switch to {mode === 'register' ? 'Login' : 'Register'}
          </button>
        </div>
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-800"></div>
            </div>
          </div>
        </div>
        {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
      </div>
    </div>
  );
}

