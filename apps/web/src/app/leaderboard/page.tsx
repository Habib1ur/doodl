'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Award, Trophy } from 'lucide-react';
import { AvatarBadge } from '@/components/AvatarPicker';
import { BrandLogo } from '@/components/BrandLogo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { getApiUrl } from '@/lib/socket';

interface LeaderboardEntry {
  rank: number;
  username: string;
  avatar: string;
  gamesPlayed: number;
  gamesWon: number;
  totalPoints: number;
  correctGuesses: number;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbConnected, setDbConnected] = useState(true);

  useEffect(() => {
    fetch(`${getApiUrl()}/api/leaderboard`)
      .then((r) => r.json())
      .then((data: { entries?: LeaderboardEntry[]; databaseConnected?: boolean }) => {
        setEntries(data.entries ?? []);
        setDbConnected(data.databaseConnected ?? false);
      })
      .catch(() => {
        setDbConnected(false);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-surface-border bg-surface-card px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
        <BrandLogo />
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <Link
            href="/profile"
            className="min-h-[40px] px-2.5 sm:px-3.5 rounded-input border border-surface-border text-xs sm:text-sm font-semibold text-ink-secondary hover:text-ink-main inline-flex items-center gap-1"
          >
            Profile
          </Link>
          <Link
            href="/"
            className="min-h-[40px] px-2.5 sm:px-3.5 rounded-input border border-surface-border text-xs sm:text-sm font-semibold text-ink-secondary hover:text-ink-main inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline sm:inline">Back</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-4xl w-full mx-auto px-4 py-8 sm:py-12 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-card brand-gradient text-white flex items-center justify-center shadow-soft">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-page-title font-extrabold text-ink-main">Leaderboard</h1>
            <p className="text-sm text-ink-secondary">
              Top registered Doodlio artists and guessers.
            </p>
          </div>
        </div>

        <div className="rounded-panel border border-surface-border bg-surface-card p-5 sm:p-6 shadow-soft">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-card bg-surface-bg animate-pulse" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <Award className="w-10 h-10 mx-auto text-ink-muted" />
              <p className="font-semibold text-ink-main">
                {dbConnected
                  ? 'No ranked matches recorded yet.'
                  : 'Database not connected yet.'}
              </p>
              <p className="text-sm text-ink-secondary">
                {dbConnected
                  ? 'Play a match with a registered account to appear on the leaderboard!'
                  : 'Guest play is fully active! Configure DATABASE_URL in .env to persist global rankings.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {entries.map((e) => (
                <div
                  key={e.username}
                  className="flex items-center justify-between gap-3 p-3.5 rounded-card border border-surface-border bg-surface-bg"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 text-center font-extrabold text-base">#{e.rank}</span>
                    <AvatarBadge avatarId={e.avatar} />
                    <div>
                      <div className="font-bold text-ink-main">{e.username}</div>
                      <div className="text-xs text-ink-secondary">
                        {e.gamesWon} wins • {e.gamesPlayed} played • {e.correctGuesses} guesses
                      </div>
                    </div>
                  </div>
                  <div className="font-extrabold text-brand-green text-base">
                    {e.totalPoints} pts
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
