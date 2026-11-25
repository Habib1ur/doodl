'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Gamepad2,
  LogOut,
  Percent,
  Sparkles,
  Target,
  Trophy,
  User as UserIcon,
} from 'lucide-react';
import {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from '@doodlio/shared';
import { AvatarBadge, AvatarPicker } from '@/components/AvatarPicker';
import { BrandLogo } from '@/components/BrandLogo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { clearAuthSession, getAuthToken, saveAuthSession } from '@/lib/auth';
import { getApiUrl } from '@/lib/socket';
import { useGameStore } from '@/stores/useGameStore';

interface ProfileData {
  user: {
    id: string;
    username: string;
    createdAt: string;
  };
  profile: {
    avatar: string;
    gamesPlayed: number;
    gamesWon: number;
    totalPoints: number;
    correctGuesses: number;
    bestScore: number;
    winRate: number;
  };
  achievements: Array<{
    slug: string;
    title: string;
    description: string;
    icon: string;
    unlockedAt: string;
  }>;
  recentMatches: Array<{
    id: string;
    roomCode: string;
    language: string;
    rounds: number;
    score: number;
    rank: number;
    correctGuesses: number;
    startedAt: string;
  }>;
}

export default function ProfilePage() {
  const { addToast } = useGameStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<ProfileData | null>(null);

  const loadProfile = useCallback(async (token: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (res.status === 401) clearAuthSession();
        setData(null);
        return;
      }
      const json = (await res.json()) as ProfileData;
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }
    void loadProfile(token);
  }, [loadProfile]);

  const loginForm = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  const registerForm = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: '', password: '', avatar: 'fox' },
  });

  const registerAvatar = registerForm.watch('avatar');

  const handleLogin = async (values: LoginInput) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const json = (await res.json()) as {
        token?: string;
        user?: { id: string; username: string; avatar: string };
        error?: string;
      };
      if (!res.ok || !json.token || !json.user) {
        addToast(json.error ?? 'Unable to sign in.', 'error');
        return;
      }
      saveAuthSession(json.token, json.user);
      addToast(`Welcome back, ${json.user.username}!`, 'success');
      await loadProfile(json.token);
    } catch {
      addToast('Unable to reach server.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (values: RegisterInput) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const json = (await res.json()) as {
        token?: string;
        user?: { id: string; username: string; avatar: string };
        error?: string;
      };
      if (!res.ok || !json.token || !json.user) {
        addToast(json.error ?? 'Unable to create account.', 'error');
        return;
      }
      saveAuthSession(json.token, json.user);
      addToast(`Account created! Welcome, ${json.user.username}!`, 'success');
      await loadProfile(json.token);
    } catch {
      addToast('Unable to reach server.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAvatarUpdate = async (avatarId: string) => {
    const token = getAuthToken();
    if (!token || !data) return;
    try {
      const res = await fetch(`${getApiUrl()}/api/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ avatar: avatarId }),
      });
      if (res.ok) {
        setData({
          ...data,
          profile: { ...data.profile, avatar: avatarId },
        });
        saveAuthSession(token, {
          id: data.user.id,
          username: data.user.username,
          avatar: avatarId,
        });
        addToast('Avatar updated!', 'success');
      }
    } catch {
      addToast('Failed to update avatar.', 'error');
    }
  };

  const handleSignOut = () => {
    clearAuthSession();
    setData(null);
    addToast('Signed out.', 'info');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-surface-border bg-surface-card px-4 sm:px-6 h-16 flex items-center justify-between">
        <BrandLogo />
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="min-h-[40px] px-3.5 rounded-input border border-surface-border text-sm font-semibold text-ink-secondary hover:text-ink-main inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-4xl w-full mx-auto px-4 py-8 sm:py-12 space-y-6">
        {loading ? (
          <div className="rounded-panel border border-surface-border bg-surface-card p-6 space-y-4">
            <div className="h-12 w-48 rounded-card bg-surface-bg animate-pulse" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 rounded-card bg-surface-bg animate-pulse" />
              ))}
            </div>
          </div>
        ) : data ? (
          <>
            {/* Profile Header */}
            <div className="rounded-panel border border-surface-border bg-surface-card p-6 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <AvatarBadge avatarId={data.profile.avatar} size="lg" />
                <div>
                  <h1 className="text-page-title font-extrabold text-ink-main">
                    {data.user.username}
                  </h1>
                  <p className="text-sm text-ink-secondary">
                    Registered Doodl Player • Best Score: {data.profile.bestScore} pts
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="min-h-[44px] px-4 rounded-input border border-surface-border bg-surface-bg text-sm font-semibold text-ink-secondary hover:text-ink-main inline-flex items-center gap-2 self-start sm:self-auto"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Games Played', value: data.profile.gamesPlayed, icon: Gamepad2 },
                { label: 'Games Won', value: data.profile.gamesWon, icon: Trophy },
                { label: 'Total Points', value: data.profile.totalPoints, icon: Award },
                { label: 'Win Rate', value: `${data.profile.winRate}%`, icon: Percent },
                { label: 'Correct Guesses', value: data.profile.correctGuesses, icon: Target },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-card border border-surface-border bg-surface-card p-4 shadow-soft space-y-1"
                >
                  <div className="flex items-center justify-between text-ink-muted">
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      {stat.label}
                    </span>
                    <stat.icon className="w-4 h-4 text-brand-green" />
                  </div>
                  <div className="text-2xl font-extrabold text-ink-main">{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Avatar Picker */}
            <div className="rounded-panel border border-surface-border bg-surface-card p-5 sm:p-6 shadow-soft space-y-3">
              <h2 className="text-base font-bold text-ink-main">Change Avatar</h2>
              <AvatarPicker value={data.profile.avatar} onChange={handleAvatarUpdate} />
            </div>

            {/* Achievements */}
            <div className="rounded-panel border border-surface-border bg-surface-card p-5 sm:p-6 shadow-soft space-y-3">
              <h2 className="text-base font-bold text-ink-main flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-green" />
                Achievements ({data.achievements.length})
              </h2>
              {data.achievements.length === 0 ? (
                <p className="text-sm text-ink-secondary">
                  Play matches to unlock badges like First Victory, Speed Guesser, and Master Artist!
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {data.achievements.map((ach) => (
                    <div
                      key={ach.slug}
                      className="flex items-center gap-3 p-3.5 rounded-card border border-brand-green/30 bg-brand-green-soft/40 dark:bg-surface-elevated"
                    >
                      <span className="text-2xl">{ach.icon}</span>
                      <div>
                        <div className="font-bold text-sm text-ink-main flex items-center gap-1.5">
                          {ach.title}
                          <CheckCircle2 className="w-3.5 h-3.5 text-brand-green" />
                        </div>
                        <div className="text-xs text-ink-secondary">{ach.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Match History */}
            <div className="rounded-panel border border-surface-border bg-surface-card p-5 sm:p-6 shadow-soft space-y-3">
              <h2 className="text-base font-bold text-ink-main">Recent Match History</h2>
              {data.recentMatches.length === 0 ? (
                <p className="text-sm text-ink-secondary">
                  No completed matches recorded yet. Create or join a room while signed in!
                </p>
              ) : (
                <div className="space-y-2">
                  {data.recentMatches.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-card border border-surface-border bg-surface-bg"
                    >
                      <div>
                        <div className="font-bold text-sm text-ink-main">
                          Room {m.roomCode} • Rank #{m.rank}
                        </div>
                        <div className="text-xs text-ink-secondary">
                          {m.rounds} rounds • {m.correctGuesses} guesses • {m.language.toUpperCase()}
                        </div>
                      </div>
                      <div className="font-extrabold text-brand-green text-sm">
                        {m.score} pts
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="max-w-md mx-auto rounded-panel border border-surface-border bg-surface-card p-6 sm:p-8 shadow-elevated space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-card brand-gradient text-white flex items-center justify-center shadow-soft">
                <UserIcon className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-extrabold text-ink-main">Player Profile</h1>
              <p className="text-sm text-ink-secondary">
                Sign in or register to save stats, match history, and achievements. Guest play
                always works without an account!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 p-1 rounded-input bg-surface-bg border border-surface-border">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`min-h-[40px] rounded-control text-sm font-bold transition ${
                  mode === 'login'
                    ? 'bg-surface-card text-ink-main shadow-soft'
                    : 'text-ink-secondary hover:text-ink-main'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`min-h-[40px] rounded-control text-sm font-bold transition ${
                  mode === 'register'
                    ? 'bg-surface-card text-ink-main shadow-soft'
                    : 'text-ink-secondary hover:text-ink-main'
                }`}
              >
                Create Account
              </button>
            </div>

            {mode === 'login' ? (
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-ink-main">Username</label>
                  <input
                    {...loginForm.register('username')}
                    placeholder="Your username"
                    className="w-full min-h-[44px] px-3.5 rounded-input border border-surface-border bg-surface-bg text-base text-ink-main focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  />
                  {loginForm.formState.errors.username && (
                    <p className="text-xs text-semantic-danger font-medium">
                      {loginForm.formState.errors.username.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-ink-main">Password</label>
                  <input
                    type="password"
                    {...loginForm.register('password')}
                    placeholder="••••••••"
                    className="w-full min-h-[44px] px-3.5 rounded-input border border-surface-border bg-surface-bg text-base text-ink-main focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  />
                  {loginForm.formState.errors.password && (
                    <p className="text-xs text-semantic-danger font-medium">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[48px] rounded-input brand-gradient text-white font-bold shadow-soft hover:opacity-95 active:scale-95 transition disabled:opacity-60"
                >
                  {submitting ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            ) : (
              <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-ink-main">Username</label>
                  <input
                    {...registerForm.register('username')}
                    placeholder="Choose a unique username"
                    className="w-full min-h-[44px] px-3.5 rounded-input border border-surface-border bg-surface-bg text-base text-ink-main focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  />
                  {registerForm.formState.errors.username && (
                    <p className="text-xs text-semantic-danger font-medium">
                      {registerForm.formState.errors.username.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-ink-main">Password</label>
                  <input
                    type="password"
                    {...registerForm.register('password')}
                    placeholder="At least 6 characters"
                    className="w-full min-h-[44px] px-3.5 rounded-input border border-surface-border bg-surface-bg text-base text-ink-main focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  />
                  {registerForm.formState.errors.password && (
                    <p className="text-xs text-semantic-danger font-medium">
                      {registerForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-ink-main">Avatar</label>
                  <AvatarPicker
                    value={registerAvatar}
                    onChange={(id) => registerForm.setValue('avatar', id)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[48px] rounded-input brand-gradient text-white font-bold shadow-soft hover:opacity-95 active:scale-95 transition disabled:opacity-60"
                >
                  {submitting ? 'Creating account...' : 'Create Account'}
                </button>
              </form>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
