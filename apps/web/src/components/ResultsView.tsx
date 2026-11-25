'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Award, Home, Palette, RotateCcw, Share2, Trophy } from 'lucide-react';
import type { GameEndPayload, RoomState } from '@doodlio/shared';
import { getSocket } from '@/lib/socket';
import { useGameStore } from '@/stores/useGameStore';
import { AvatarBadge } from './AvatarPicker';

interface ResultsViewProps {
  room: RoomState;
  playerId: string;
  results: GameEndPayload;
}

export function ResultsView({ room, playerId, results }: ResultsViewProps) {
  const router = useRouter();
  const { addToast, resetRoom } = useGameStore();

  const me = room.players.find((p) => p.id === playerId);
  const isHost = Boolean(me?.isHost);
  const winner = results.rankings[0];

  const handlePlayAgain = () => {
    getSocket().emit('game:play-again', (ack) => {
      if (!ack.ok) addToast(ack.error, 'error');
    });
  };

  const handleShare = async () => {
    const summary = results.rankings
      .slice(0, 3)
      .map((r) => `#${r.rank} ${r.player.name} (${r.pointsEarned} pts)`)
      .join('\n');
    const text = `🎨 Doodl Match Results (${room.code}):\n${summary}`;
    try {
      await navigator.clipboard.writeText(text);
      addToast('Match results copied to clipboard!', 'success');
    } catch {
      addToast('Unable to copy results.', 'error');
    }
  };

  const handleGoHome = () => {
    getSocket().emit('room:leave', () => {
      sessionStorage.removeItem(`doodlio_session_${room.code}`);
      resetRoom();
      router.push('/');
    });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-panel border border-surface-border bg-surface-card p-6 sm:p-8 shadow-elevated text-center space-y-4"
      >
        <div className="w-16 h-16 mx-auto rounded-2xl brand-gradient text-white flex items-center justify-center shadow-soft">
          <Trophy className="w-8 h-8" />
        </div>
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-green">
            Game Complete • {results.totalRounds} Rounds
          </span>
          <h1 className="text-page-title font-extrabold text-ink-main mt-1">
            {winner ? `${winner.player.name} Wins!` : 'Final Standings'}
          </h1>
        </div>

        {/* Rankings List */}
        <div className="space-y-2.5 text-left pt-2">
          {results.rankings.map((entry) => {
            const isBestDrawer = entry.player.id === results.bestDrawerId;
            return (
              <div
                key={entry.player.id}
                className={`flex items-center justify-between gap-3 p-3.5 rounded-card border ${
                  entry.rank === 1
                    ? 'border-semantic-warning/50 bg-semantic-warning/10'
                    : entry.player.id === playerId
                      ? 'border-brand-green/50 bg-brand-green-soft/60 dark:bg-surface-elevated'
                      : 'border-surface-border bg-surface-bg'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-7 text-center font-extrabold text-lg text-ink-main">
                    {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                  </span>
                  <AvatarBadge avatarId={entry.player.avatar} />
                  <div className="min-w-0">
                    <div className="font-bold text-ink-main flex flex-wrap items-center gap-2">
                      <span className="truncate">{entry.player.name}</span>
                      {isBestDrawer && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-blue-soft text-brand-blue-deep text-[11px] font-bold">
                          <Palette className="w-3 h-3" /> Best Drawer
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-ink-secondary">
                      {entry.correctGuesses} correct {entry.correctGuesses === 1 ? 'guess' : 'guesses'}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-lg font-extrabold text-ink-main flex items-center gap-1">
                    <Award className="w-4 h-4 text-brand-green" />
                    {entry.pointsEarned}
                  </div>
                  <div className="text-[11px] text-ink-muted">points</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          {isHost ? (
            <button
              type="button"
              onClick={handlePlayAgain}
              className="w-full sm:w-auto min-h-[48px] px-6 rounded-input brand-gradient text-white font-bold inline-flex items-center justify-center gap-2 shadow-soft hover:opacity-95 active:scale-95 transition"
            >
              <RotateCcw className="w-4 h-4" />
              Return to Lobby & Play Again
            </button>
          ) : (
            <div className="text-sm text-ink-secondary font-medium">
              Waiting for host to start another match...
            </div>
          )}

          <button
            type="button"
            onClick={handleShare}
            className="w-full sm:w-auto min-h-[48px] px-5 rounded-input border border-surface-border bg-surface-bg text-ink-main font-semibold inline-flex items-center justify-center gap-2 hover:bg-surface-elevated transition"
          >
            <Share2 className="w-4 h-4" />
            Share Results
          </button>

          <button
            type="button"
            onClick={handleGoHome}
            className="w-full sm:w-auto min-h-[48px] px-5 rounded-input border border-surface-border bg-surface-bg text-ink-secondary font-semibold inline-flex items-center justify-center gap-2 hover:text-ink-main transition"
          >
            <Home className="w-4 h-4" />
            Home
          </button>
        </div>
      </motion.div>
    </div>
  );
}
