'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  Clock,
  Copy,
  Crown,
  Globe,
  Layers,
  Lock,
  LogOut,
  Play,
  Share2,
  Users,
} from 'lucide-react';
import { GAME_DEFAULTS, LANGUAGES, type RoomState } from '@doodlio/shared';
import { getSocket } from '@/lib/socket';
import { useGameStore } from '@/stores/useGameStore';
import { AvatarBadge } from './AvatarPicker';

interface LobbyViewProps {
  room: RoomState;
  playerId: string;
}

export function LobbyView({ room, playerId }: LobbyViewProps) {
  const router = useRouter();
  const { addToast, resetRoom } = useGameStore();
  const [copied, setCopied] = useState(false);

  const me = room.players.find((p) => p.id === playerId);
  const isHost = Boolean(me?.isHost);
  const connectedCount = room.players.filter((p) => p.isConnected).length;
  const allReady = room.players
    .filter((p) => p.isConnected)
    .every((p) => p.isHost || p.isReady);

  const canStart = isHost && connectedCount >= GAME_DEFAULTS.MIN_PLAYERS && allReady;

  const copyInviteLink = async () => {
    const url = `${window.location.origin}/room/${room.code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      addToast('Invite link copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast(`Share code: ${room.code}`, 'info');
    }
  };

  const handleToggleReady = () => {
    if (!me) return;
    getSocket().emit('room:ready', { isReady: !me.isReady }, (ack) => {
      if (!ack.ok) addToast(ack.error, 'error');
    });
  };

  const handleStartGame = () => {
    getSocket().emit('game:start', (ack) => {
      if (!ack.ok) addToast(ack.error, 'error');
    });
  };

  const handleLeave = () => {
    getSocket().emit('room:leave', () => {
      sessionStorage.removeItem(`doodlio_session_${room.code}`);
      resetRoom();
      router.push('/');
    });
  };

  const langLabel =
    LANGUAGES.find((l) => l.id === room.settings.language)?.label ?? room.settings.language;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-10 space-y-6">
      {/* Room Code Banner */}
      <div className="rounded-panel border border-surface-border bg-surface-card p-5 sm:p-6 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-secondary">
            {room.settings.isPublic ? (
              <>
                <Globe className="w-3.5 h-3.5 text-brand-blue" /> Public Room
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-brand-green" /> Private Room
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-widest text-ink-main">
              {room.code}
            </h1>
            <button
              type="button"
              onClick={copyInviteLink}
              className="min-h-[40px] px-3.5 rounded-full bg-brand-blue-soft dark:bg-surface-elevated text-brand-blue-deep dark:text-brand-sky text-xs font-bold inline-flex items-center gap-1.5 hover:opacity-90 active:scale-95 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy Invite Link'}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLeave}
          className="min-h-[44px] px-4 rounded-input border border-surface-border text-sm font-semibold text-ink-secondary hover:text-semantic-danger hover:border-semantic-danger/40 inline-flex items-center justify-center gap-2 transition self-start sm:self-auto"
        >
          <LogOut className="w-4 h-4" />
          Leave Room
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
        {/* Players List */}
        <section className="rounded-panel border border-surface-border bg-surface-card p-5 sm:p-6 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-green" />
              Players ({room.players.length}/{room.settings.maxPlayers})
            </h2>
            <span className="text-xs font-medium text-ink-secondary">
              Min {GAME_DEFAULTS.MIN_PLAYERS} to start
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {room.players.map((p) => (
              <div
                key={p.id}
                className={`flex items-center justify-between gap-3 p-3 rounded-card border transition ${
                  p.id === playerId
                    ? 'border-brand-green/50 bg-brand-green-soft/60 dark:bg-surface-elevated'
                    : 'border-surface-border bg-surface-bg'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <AvatarBadge avatarId={p.avatar} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm truncate">{p.name}</span>
                      {p.isHost && (
                        <Crown
                          className="w-4 h-4 text-semantic-warning shrink-0"
                          aria-label="Room Host"
                        />
                      )}
                    </div>
                    <span className="text-xs text-ink-secondary">
                      {p.id === playerId ? 'You' : p.isConnected ? 'Connected' : 'Reconnecting...'}
                    </span>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${
                    p.isHost || p.isReady
                      ? 'bg-brand-green-light text-brand-green-deep dark:bg-brand-green/20 dark:text-brand-emerald'
                      : 'bg-surface-card border border-surface-border text-ink-muted'
                  }`}
                >
                  {p.isHost ? 'Host' : p.isReady ? 'Ready' : 'Waiting'}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Room Settings & Actions */}
        <section className="rounded-panel border border-surface-border bg-surface-card p-5 sm:p-6 shadow-soft flex flex-col justify-between gap-6">
          <div className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Layers className="w-5 h-5 text-brand-blue" />
              Match Settings
            </h2>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-input bg-surface-bg border border-surface-border">
                <dt className="text-xs text-ink-secondary">Rounds</dt>
                <dd className="font-bold text-base mt-0.5">{room.settings.rounds}</dd>
              </div>
              <div className="p-3 rounded-input bg-surface-bg border border-surface-border">
                <dt className="text-xs text-ink-secondary flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Draw Time
                </dt>
                <dd className="font-bold text-base mt-0.5">{room.settings.drawTime}s</dd>
              </div>
              <div className="p-3 rounded-input bg-surface-bg border border-surface-border">
                <dt className="text-xs text-ink-secondary">Language</dt>
                <dd className="font-bold text-sm mt-0.5">{langLabel}</dd>
              </div>
              <div className="p-3 rounded-input bg-surface-bg border border-surface-border">
                <dt className="text-xs text-ink-secondary">Categories</dt>
                <dd className="font-bold text-sm mt-0.5 capitalize truncate">
                  {room.settings.categories.join(', ')}
                </dd>
              </div>
            </dl>
          </div>

          <div className="space-y-3">
            {isHost ? (
              <>
                <button
                  type="button"
                  onClick={handleStartGame}
                  disabled={!canStart}
                  className="w-full min-h-[48px] rounded-input brand-gradient text-white font-bold text-base shadow-soft hover:opacity-95 active:scale-[0.99] transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-5 h-5" />
                  Start Game
                </button>
                {!canStart && (
                  <p className="text-xs text-center text-ink-secondary">
                    {connectedCount < GAME_DEFAULTS.MIN_PLAYERS
                      ? 'Invite at least 1 more player to start.'
                      : 'Waiting for all players to mark themselves ready.'}
                  </p>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={handleToggleReady}
                className={`w-full min-h-[48px] rounded-input font-bold text-base transition flex items-center justify-center gap-2 ${
                  me?.isReady
                    ? 'border border-surface-border bg-surface-bg text-ink-main hover:bg-surface-elevated'
                    : 'brand-gradient text-white shadow-soft hover:opacity-95'
                }`}
              >
                <Check className="w-5 h-5" />
                {me?.isReady ? 'Ready! (Click to unready)' : 'Mark Ready'}
              </button>
            )}

            <button
              type="button"
              onClick={copyInviteLink}
              className="w-full min-h-[44px] rounded-input border border-surface-border bg-surface-bg text-sm font-semibold text-ink-main hover:bg-surface-elevated inline-flex items-center justify-center gap-2 transition"
            >
              <Share2 className="w-4 h-4" />
              Invite Friends
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
