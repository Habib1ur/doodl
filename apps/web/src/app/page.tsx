'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Brush,
  Globe,
  MessageSquare,
  Plus,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import type { PublicRoomSummary } from '@doodlio/shared';
import { BrandLogo } from '@/components/BrandLogo';
import { CreateRoomModal, JoinRoomModal } from '@/components/RoomModals';
import { ThemeToggle } from '@/components/ThemeToggle';
import { getApiUrl } from '@/lib/socket';

export default function HomePage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [publicRooms, setPublicRooms] = useState<PublicRoomSummary[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  const fetchPublicRooms = async () => {
    setLoadingRooms(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/rooms/public`);
      if (res.ok) {
        const data = (await res.json()) as { rooms: PublicRoomSummary[] };
        setPublicRooms(data.rooms ?? []);
      }
    } catch {
      // Server may be offline during static preview
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    fetch(`${getApiUrl()}/api/rooms/public`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { rooms?: PublicRoomSummary[] } | null) => {
        if (!cancelled && data?.rooms) {
          setPublicRooms(data.rooms);
        }
      })
      .catch(() => {
        // Server may be offline during static preview
      })
      .finally(() => {
        if (!cancelled) setLoadingRooms(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openJoinWithCode = (code = '') => {
    setJoinCode(code);
    setJoinOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <header className="sticky top-0 z-30 border-b border-surface-border bg-surface-bg/85 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <BrandLogo />

          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-ink-secondary">
            <a href="#how-to-play" className="hover:text-ink-main transition">
              How to Play
            </a>
            <a href="#public-rooms" className="hover:text-ink-main transition">
              Public Rooms
            </a>
            <Link href="/leaderboard" className="hover:text-ink-main transition">
              Leaderboard
            </Link>
            <Link href="/profile" className="hover:text-ink-main transition">
              Profile
            </Link>
          </nav>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => openJoinWithCode('')}
              className="hidden sm:inline-flex min-h-[44px] px-4 rounded-input border border-surface-border bg-surface-card text-sm font-bold text-ink-main hover:bg-surface-elevated transition items-center gap-1.5"
            >
              Join Room
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="min-h-[44px] px-4 sm:px-5 rounded-input brand-gradient text-white text-sm font-bold shadow-soft hover:opacity-95 active:scale-95 transition inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Play Now
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-12 sm:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-green-soft dark:bg-surface-elevated border border-brand-green/25 text-brand-green-deep dark:text-brand-emerald text-xs sm:text-sm font-bold">
                <Sparkles className="w-4 h-4" />
                Draw it. Guess it. Own it.
              </div>

              <h1 className="text-hero font-extrabold text-ink-main">
                Think fast. Draw faster.{' '}
                <span className="brand-gradient-text">Guess together.</span>
              </h1>

              <p className="text-base sm:text-lg text-ink-secondary max-w-xl leading-relaxed">
                Bring your friends, grab your virtual brush, and see who can guess the funniest
                drawings in real-time multiplayer rooms.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="min-h-[50px] px-7 rounded-input brand-gradient text-white font-bold text-base shadow-elevated hover:opacity-95 active:scale-[0.98] transition inline-flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Create a Room
                </button>
                <button
                  type="button"
                  onClick={() => openJoinWithCode('')}
                  className="min-h-[50px] px-7 rounded-input border border-surface-border bg-surface-card text-ink-main font-bold text-base hover:bg-surface-elevated active:scale-[0.98] transition inline-flex items-center justify-center gap-2"
                >
                  Join with Code
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-5 pt-2 text-xs sm:text-sm font-medium text-ink-secondary">
                <span className="inline-flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-brand-green" /> No sign-up required
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-brand-blue" /> Mobile & desktop ready
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-brand-teal" /> English & Bengali-English
                </span>
              </div>
            </motion.div>

            {/* Interactive Game Preview Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="rounded-panel border border-surface-border bg-surface-card p-4 sm:p-5 shadow-elevated space-y-3"
            >
              <div className="flex items-center justify-between text-xs font-bold px-1">
                <span className="px-2.5 py-1 rounded-control bg-brand-green-soft text-brand-green-deep">
                  Round 2 / 3
                </span>
                <span className="font-mono tracking-[0.25em] text-sm text-ink-main">
                  _ I _ Z A
                </span>
                <span className="px-2.5 py-1 rounded-full bg-brand-blue-soft text-brand-blue-deep">
                  48s
                </span>
              </div>

              <div className="rounded-card border border-surface-border bg-white p-6 flex items-center justify-center aspect-[16/10]">
                <svg viewBox="0 0 260 150" className="w-full h-full max-w-[260px]" aria-hidden="true">
                  <path
                    d="M55 115 L130 25 L205 115 Q130 135 55 115 Z"
                    fill="#FEF3C7"
                    stroke="#F97316"
                    strokeWidth="5"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M48 116 Q130 142 212 116"
                    fill="none"
                    stroke="#D97706"
                    strokeWidth="9"
                    strokeLinecap="round"
                  />
                  <circle cx="115" cy="78" r="9" fill="#E65C68" />
                  <circle cx="148" cy="92" r="8" fill="#E65C68" />
                  <circle cx="132" cy="58" r="7" fill="#E65C68" />
                  <circle cx="95" cy="100" r="6" fill="#16A36A" />
                </svg>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="px-3 py-2 rounded-input bg-brand-green-soft text-brand-green-deep font-bold">
                  🦊 Fox guessed it! (+100)
                </div>
                <div className="px-3 py-2 rounded-input bg-surface-bg border border-surface-border text-ink-secondary">
                  🐙 Octopus: &ldquo;cheese?&rdquo;
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* How to Play */}
        <section id="how-to-play" className="py-12 sm:py-16 border-t border-surface-border bg-surface-card/50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h2 className="text-section-title font-extrabold text-ink-main">
                How to Play Doodlio
              </h2>
              <p className="text-sm sm:text-base text-ink-secondary">
                Jump into a match in under 10 seconds. No downloads, no friction.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                {
                  step: '01',
                  icon: Users,
                  title: 'Create or Join a Room',
                  desc: 'Start a private room and share the 6-letter invite link, or hop into an open public lobby.',
                  color: 'text-brand-green bg-brand-green-soft',
                },
                {
                  step: '02',
                  icon: Brush,
                  title: 'Draw Your Secret Word',
                  desc: 'Pick from 3 word choices when it is your turn and sketch it live on the shared canvas.',
                  color: 'text-brand-blue bg-brand-blue-soft',
                },
                {
                  step: '03',
                  icon: Trophy,
                  title: 'Guess Fast & Score Big',
                  desc: 'Type guesses in chat before the timer runs out. Faster guesses earn up to 100 points!',
                  color: 'text-brand-teal bg-brand-green-soft',
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="rounded-card border border-surface-border bg-surface-card p-6 shadow-soft space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className={`w-11 h-11 rounded-input inline-flex items-center justify-center ${item.color}`}>
                      <item.icon className="w-5 h-5" />
                    </span>
                    <span className="text-xs font-extrabold text-ink-muted">{item.step}</span>
                  </div>
                  <h3 className="text-lg font-bold text-ink-main">{item.title}</h3>
                  <p className="text-sm text-ink-secondary leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Live Public Rooms */}
        <section id="public-rooms" className="py-12 sm:py-16 border-t border-surface-border">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-section-title font-extrabold text-ink-main">
                  Public Rooms
                </h2>
                <p className="text-sm text-ink-secondary">
                  Join an active public room right now or create your own.
                </p>
              </div>
              <button
                type="button"
                onClick={fetchPublicRooms}
                className="min-h-[42px] px-4 rounded-input border border-surface-border bg-surface-card text-sm font-semibold text-ink-main hover:bg-surface-elevated inline-flex items-center gap-2 transition"
              >
                <RefreshCw className={`w-4 h-4 ${loadingRooms ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {publicRooms.length === 0 ? (
              <div className="rounded-card border border-dashed border-surface-border bg-surface-card/70 p-8 text-center space-y-3">
                <p className="text-sm font-medium text-ink-secondary">
                  No public rooms are open at the moment.
                </p>
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="min-h-[44px] px-5 rounded-input brand-gradient text-white text-sm font-bold inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Start a Public Room
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {publicRooms.map((r) => (
                  <div
                    key={r.code}
                    className="rounded-card border border-surface-border bg-surface-card p-5 shadow-soft flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold tracking-widest text-base text-ink-main">
                          {r.code}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-brand-blue-soft text-brand-blue-deep uppercase">
                          {r.language}
                        </span>
                      </div>
                      <p className="text-xs text-ink-secondary">
                        Host: <span className="font-semibold text-ink-main">{r.hostName}</span> •{' '}
                        {r.playerCount}/{r.maxPlayers} players
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openJoinWithCode(r.code)}
                      className="min-h-[42px] px-4 rounded-input bg-brand-green hover:bg-brand-green-deep text-white text-sm font-bold transition"
                    >
                      Join
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Feature Highlights */}
        <section className="py-12 sm:py-16 border-t border-surface-border bg-surface-card/50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: Brush,
                title: 'Smooth Vector Canvas',
                desc: 'Normalized coordinates & Bézier smoothing for crisp strokes on any screen.',
              },
              {
                icon: MessageSquare,
                title: 'Smart Guess Engine',
                desc: 'Close-guess alerts, alias matching, and instant anti-leak protection.',
              },
              {
                icon: ShieldCheck,
                title: 'Server-Authoritative',
                desc: 'Timers, secret words, and scoring are verified strictly on the server.',
              },
              {
                icon: Smartphone,
                title: 'Reconnection Ready',
                desc: 'Accidentally refreshed? Rejoin your active seat and canvas automatically.',
              },
            ].map((feat) => (
              <div
                key={feat.title}
                className="rounded-card border border-surface-border bg-surface-card p-5 space-y-2"
              >
                <feat.icon className="w-5 h-5 text-brand-green" />
                <h3 className="font-bold text-base text-ink-main">{feat.title}</h3>
                <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-surface-border py-6 text-center text-xs sm:text-sm text-ink-secondary">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} Doodlio. Draw it. Guess it. Own it.</span>
          <div className="flex items-center gap-4">
            <Link href="/leaderboard" className="hover:text-ink-main">
              Leaderboard
            </Link>
            <a href="#how-to-play" className="hover:text-ink-main">
              How to Play
            </a>
          </div>
        </div>
      </footer>

      <CreateRoomModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <JoinRoomModal
        open={joinOpen}
        initialCode={joinCode}
        onClose={() => setJoinOpen(false)}
      />
    </div>
  );
}
