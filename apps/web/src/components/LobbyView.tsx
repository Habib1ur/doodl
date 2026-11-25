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
  Plus,
  Share2,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { GAME_DEFAULTS, LANGUAGES, type RoomState, type UpdateSettingsInput } from '@doodlio/shared';
import { getSocket } from '@/lib/socket';
import { useGameStore } from '@/stores/useGameStore';
import { AvatarBadge } from './AvatarPicker';
import { DrawingCanvas } from './DrawingCanvas';

interface LobbyViewProps {
  room: RoomState;
  playerId: string;
}

export function LobbyView({ room, playerId }: LobbyViewProps) {
  const router = useRouter();
  const { addToast, resetRoom } = useGameStore();
  const [copied, setCopied] = useState(false);
  const [fullscreenCanvas, setFullscreenCanvas] = useState(false);
  const [wordDraft, setWordDraft] = useState('');

  const me = room.players.find((p) => p.id === playerId);
  const isHost = Boolean(me?.isHost);
  const connectedCount = room.players.filter((p) => p.isConnected).length;
  const allReady = room.players
    .filter((p) => p.isConnected)
    .every((p) => p.isHost || p.isReady);

  const canStart = isHost && connectedCount >= GAME_DEFAULTS.MIN_PLAYERS && allReady;
  const customWords = room.settings.customWords ?? [];
  const useCustomOnly = Boolean(room.settings.useCustomWordsOnly);

  const updateHostSettings = (patch: UpdateSettingsInput) => {
    getSocket().emit('room:settings', patch, (ack) => {
      if (!ack.ok) addToast(ack.error, 'error');
    });
  };

  const handleAddCustomWords = () => {
    const incoming = wordDraft
      .split(/[\n,]+/)
      .map((w) => w.trim())
      .filter((w) => w.length > 0);
    if (incoming.length === 0) return;

    const merged = Array.from(
      new Map([...customWords, ...incoming].map((w) => [w.toLowerCase(), w])).values()
    ).slice(0, 200);

    setWordDraft('');
    updateHostSettings({
      customWords: merged,
      useCustomWordsOnly: customWords.length === 0 ? true : useCustomOnly,
    });
  };

  const handleRemoveWord = (wordToRemove: string) => {
    const next = customWords.filter((w) => w !== wordToRemove);
    updateHostSettings({
      customWords: next,
      useCustomWordsOnly: next.length > 0 ? useCustomOnly : false,
    });
  };

  const handleClearWords = () => {
    updateHostSettings({ customWords: [], useCustomWordsOnly: false });
  };

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
    <div className="max-w-[1440px] mx-auto px-3 sm:px-5 py-4 sm:py-6 space-y-4">
      {/* Compact Room Header */}
      <div className="rounded-panel border border-surface-border bg-surface-card p-4 sm:p-5 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-secondary">
            {room.settings.isPublic ? (
              <>
                <Globe className="w-3.5 h-3.5 text-brand-blue" /> Public
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-brand-green" /> Private
              </>
            )}
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-widest text-ink-main">
            {room.code}
          </h1>
          <button
            type="button"
            onClick={copyInviteLink}
            className="min-h-[38px] px-3.5 rounded-full bg-brand-blue-soft dark:bg-surface-elevated text-brand-blue-deep dark:text-brand-sky text-xs font-bold inline-flex items-center gap-1.5 hover:opacity-90 active:scale-95 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy Invite Link'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {isHost ? (
            <button
              type="button"
              onClick={handleStartGame}
              disabled={!canStart}
              className="min-h-[40px] px-5 rounded-input brand-gradient text-white font-bold text-sm shadow-soft hover:opacity-95 active:scale-[0.99] transition inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4" />
              Start Game
            </button>
          ) : (
            <button
              type="button"
              onClick={handleToggleReady}
              className={`min-h-[40px] px-4 rounded-input font-bold text-sm transition inline-flex items-center gap-2 ${
                me?.isReady
                  ? 'border border-surface-border bg-surface-bg text-ink-main hover:bg-surface-elevated'
                  : 'brand-gradient text-white shadow-soft hover:opacity-95'
              }`}
            >
              <Check className="w-4 h-4" />
              {me?.isReady ? 'Ready!' : 'Mark Ready'}
            </button>
          )}
          <button
            type="button"
            onClick={handleLeave}
            className="min-h-[40px] px-3.5 rounded-input border border-surface-border text-sm font-semibold text-ink-secondary hover:text-semantic-danger hover:border-semantic-danger/40 inline-flex items-center justify-center gap-1.5 transition"
          >
            <LogOut className="w-4 h-4" />
            Leave
          </button>
        </div>
      </div>

      {/* Main Grid: Free-Draw Warmup Canvas + Sidebar (Players, Settings, Custom Words) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4 items-start">
        {/* Direct Free-Draw Canvas */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-ink-secondary flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-green" />
              {isHost
                ? 'Free Draw Warmup — draw freely while players join!'
                : 'Host is warming up on the canvas while waiting to start...'}
            </span>
            {isHost && !canStart && (
              <span className="text-xs text-ink-muted">
                {connectedCount < GAME_DEFAULTS.MIN_PLAYERS
                  ? 'Need 1 more player to start'
                  : 'Waiting for players to ready up'}
              </span>
            )}
          </div>
          <DrawingCanvas
            canDraw={isHost}
            isFullscreen={fullscreenCanvas}
            onToggleFullscreen={() => setFullscreenCanvas((v) => !v)}
          />
        </section>

        {/* Right Sidebar: Players, Settings & Custom Words */}
        <div className="space-y-4">
          {/* Players List */}
          <section className="rounded-panel border border-surface-border bg-surface-card p-4 shadow-soft space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Users className="w-4 h-4 text-brand-green" />
                Players ({room.players.length}/{room.settings.maxPlayers})
              </h2>
              <button
                type="button"
                onClick={copyInviteLink}
                className="text-xs font-semibold text-brand-blue hover:underline inline-flex items-center gap-1"
              >
                <Share2 className="w-3.5 h-3.5" />
                Invite
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2">
              {room.players.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between gap-2 p-2.5 rounded-card border transition ${
                    p.id === playerId
                      ? 'border-brand-green/50 bg-brand-green-soft/60 dark:bg-surface-elevated'
                      : 'border-surface-border bg-surface-bg'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <AvatarBadge avatarId={p.avatar} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-xs truncate">{p.name}</span>
                        {p.isHost && (
                          <Crown
                            className="w-3.5 h-3.5 text-semantic-warning shrink-0"
                            aria-label="Room Host"
                          />
                        )}
                      </div>
                      <span className="text-[11px] text-ink-secondary">
                        {p.id === playerId ? 'You' : p.isConnected ? 'Online' : 'Reconnecting...'}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
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

          {/* Match Settings */}
          <section className="rounded-panel border border-surface-border bg-surface-card p-4 shadow-soft space-y-3">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-blue" />
              Match Settings
            </h2>

            {isHost ? (
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div>
                  <label className="block text-ink-secondary mb-1 font-semibold">Max Players</label>
                  <select
                    value={room.settings.maxPlayers}
                    onChange={(e) => updateHostSettings({ maxPlayers: Number(e.target.value) })}
                    className="w-full min-h-[38px] px-2.5 rounded-input border border-surface-border bg-surface-bg text-sm text-ink-main"
                  >
                    {[2, 4, 6, 8, 10, 12, 15].map((n) => (
                      <option key={n} value={n}>
                        {n} Players
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-ink-secondary mb-1 font-semibold">Draw Time</label>
                  <select
                    value={room.settings.drawTime}
                    onChange={(e) => updateHostSettings({ drawTime: Number(e.target.value) })}
                    className="w-full min-h-[38px] px-2.5 rounded-input border border-surface-border bg-surface-bg text-sm text-ink-main"
                  >
                    <option value={0}>No Timer (∞)</option>
                    {[15, 30, 45, 60, 80, 100, 120, 180].map((sec) => (
                      <option key={sec} value={sec}>
                        {sec}s
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-ink-secondary mb-1 font-semibold">Rounds</label>
                  <select
                    value={room.settings.rounds}
                    onChange={(e) => updateHostSettings({ rounds: Number(e.target.value) })}
                    className="w-full min-h-[38px] px-2.5 rounded-input border border-surface-border bg-surface-bg text-sm text-ink-main"
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                      <option key={n} value={n}>
                        {n} Rounds
                      </option>
                    ))}
                  </select>
                </div>
                <div className="p-2.5 rounded-input bg-surface-bg border border-surface-border">
                  <span className="block text-[11px] text-ink-secondary">Language</span>
                  <span className="font-bold text-sm">{langLabel}</span>
                </div>
                <div>
                  <label className="block text-ink-secondary mb-1 font-semibold">Hints</label>
                  <select
                    value={room.settings.hintsCount ?? 2}
                    onChange={(e) => updateHostSettings({ hintsCount: Number(e.target.value) })}
                    className="w-full min-h-[38px] px-2.5 rounded-input border border-surface-border bg-surface-bg text-sm text-ink-main"
                  >
                    <option value={0}>No Hints (0)</option>
                    {[1, 2, 3, 4, 5].map((h) => (
                      <option key={h} value={h}>
                        {h} {h === 1 ? 'Hint' : 'Hints'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="w-full min-h-[38px] px-2.5 rounded-input border border-surface-border bg-surface-bg flex items-center gap-2 text-xs font-semibold text-ink-main cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(room.settings.allowCustomPlayerWord)}
                      onChange={(e) =>
                        updateHostSettings({ allowCustomPlayerWord: e.target.checked })
                      }
                      className="rounded border-surface-border text-brand-green focus:ring-brand-green"
                    />
                    Own word mode
                  </label>
                </div>
              </div>
            ) : (
              <dl className="grid grid-cols-2 gap-2.5 text-sm">
                <div className="p-2.5 rounded-input bg-surface-bg border border-surface-border">
                  <dt className="text-xs text-ink-secondary">Rounds</dt>
                  <dd className="font-bold mt-0.5">{room.settings.rounds}</dd>
                </div>
                <div className="p-2.5 rounded-input bg-surface-bg border border-surface-border">
                  <dt className="text-xs text-ink-secondary flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Draw Time
                  </dt>
                  <dd className="font-bold mt-0.5">
                    {room.settings.drawTime === 0 ? 'No Timer (∞)' : `${room.settings.drawTime}s`}
                  </dd>
                </div>
                <div className="p-2.5 rounded-input bg-surface-bg border border-surface-border">
                  <dt className="text-xs text-ink-secondary">Language</dt>
                  <dd className="font-bold text-xs mt-0.5">{langLabel}</dd>
                </div>
                <div className="p-2.5 rounded-input bg-surface-bg border border-surface-border">
                  <dt className="text-xs text-ink-secondary">Words</dt>
                  <dd className="font-bold text-xs mt-0.5 truncate">
                    {room.settings.allowCustomPlayerWord
                      ? 'Players write own'
                      : useCustomOnly && customWords.length > 0
                        ? `Custom (${customWords.length})`
                        : room.settings.categories.join(', ')}
                  </dd>
                </div>
                <div className="p-2.5 rounded-input bg-surface-bg border border-surface-border col-span-2">
                  <dt className="text-xs text-ink-secondary">Hints per Turn</dt>
                  <dd className="font-bold text-xs mt-0.5">
                    {(room.settings.hintsCount ?? 2) === 0
                      ? 'No Hints'
                      : `${room.settings.hintsCount ?? 2} random letter(s)`}
                  </dd>
                </div>
              </dl>
            )}
          </section>

          {/* Custom Words Manager (Host can add lots of words before starting) */}
          <section className="rounded-panel border border-surface-border bg-surface-card p-4 shadow-soft space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">
                Custom Words ({customWords.length}/200)
              </h2>
              {isHost && customWords.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearWords}
                  className="text-xs font-semibold text-semantic-danger hover:underline inline-flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              )}
            </div>

            {isHost ? (
              <>
                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    value={wordDraft}
                    onChange={(e) => setWordDraft(e.target.value)}
                    placeholder="Paste or type words separated by commas or new lines..."
                    className="flex-1 p-2.5 rounded-input border border-surface-border bg-surface-bg text-xs text-ink-main placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand-green"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomWords}
                    className="px-3 rounded-input bg-brand-green text-white font-bold text-xs hover:opacity-95 inline-flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>

                {customWords.length > 0 && (
                  <label className="flex items-center gap-2 text-xs font-semibold text-ink-main cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useCustomOnly}
                      onChange={(e) => updateHostSettings({ useCustomWordsOnly: e.target.checked })}
                      className="rounded border-surface-border text-brand-green focus:ring-brand-green"
                    />
                    Only show these custom words during the game
                  </label>
                )}

                {customWords.length > 0 && (
                  <div className="max-h-32 overflow-y-auto flex flex-wrap gap-1.5 pt-1">
                    {customWords.map((w) => (
                      <span
                        key={w}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-bg border border-surface-border text-xs font-medium text-ink-main"
                      >
                        {w}
                        <button
                          type="button"
                          onClick={() => handleRemoveWord(w)}
                          aria-label={`Remove ${w}`}
                          className="text-ink-muted hover:text-semantic-danger"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-ink-secondary">
                {customWords.length > 0
                  ? `${customWords.length} custom words loaded${useCustomOnly ? ' (custom words only)' : ''}.`
                  : 'Using built-in word packs.'}
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
