'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2,
  Clock,
  Crown,
  Flag,
  LogOut,
  Pencil,
  Send,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { RoomState } from '@doodlio/shared';
import { getAuthToken } from '@/lib/auth';
import { getApiUrl, getSocket } from '@/lib/socket';
import { soundManager } from '@/lib/sound';
import { useGameStore } from '@/stores/useGameStore';
import { AvatarBadge } from './AvatarPicker';
import { DrawingCanvas } from './DrawingCanvas';

interface GameViewProps {
  room: RoomState;
  playerId: string;
}

export function GameView({ room, playerId }: GameViewProps) {
  const router = useRouter();
  const {
    chatHistory,
    wordOptions,
    secretWord,
    roundEndData,
    connectionStatus,
    addToast,
    resetRoom,
  } = useGameStore();

  const [secondsLeft, setSecondsLeft] = useState(0);
  const [guessText, setGuessText] = useState('');
  const [muteTick, setMuteTick] = useState(0);
  const muted = useSyncExternalStore(
    (cb) => {
      window.addEventListener('storage', cb);
      return () => window.removeEventListener('storage', cb);
    },
    () => {
      void muteTick;
      return soundManager.isMuted();
    },
    () => false
  );
  const [fullscreenCanvas, setFullscreenCanvas] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState('');
  const [reportReason, setReportReason] = useState<
    'inappropriate_drawing' | 'abusive_chat' | 'cheating' | 'spam'
  >('abusive_chat');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const updateTimer = () => {
      if (!room.phaseEndsAt) {
        setSecondsLeft(0);
        return;
      }
      const diff = Math.max(0, Math.ceil((room.phaseEndsAt - Date.now()) / 1000));
      setSecondsLeft(diff);
      if (room.phase === 'DRAWING' && diff > 0 && diff <= 5) {
        soundManager.playTick();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [room.phaseEndsAt, room.phase]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory.length]);

  const isDrawer = room.currentDrawerId === playerId;
  const drawer = room.players.find((p) => p.id === room.currentDrawerId);
  const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);

  const toggleMute = () => {
    const next = !muted;
    soundManager.setMuted(next);
    setMuteTick((t) => t + 1);
  };

  const handleLeave = () => {
    getSocket().emit('room:leave', () => {
      sessionStorage.removeItem(`doodlio_session_${room.code}`);
      resetRoom();
      router.push('/');
    });
  };

  const handleSelectWord = (word: string) => {
    getSocket().emit('word:select', { word }, (ack) => {
      if (!ack.ok) addToast(ack.error, 'error');
    });
  };

  const handleSendGuess = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = guessText.trim();
    if (!trimmed) return;
    setGuessText('');
    getSocket().emit('guess:submit', { text: trimmed }, (ack) => {
      if (!ack.ok) addToast(ack.error, 'error');
    });
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetName = reportTarget || room.players.find((p) => p.id !== playerId)?.name;
    if (!targetName) {
      addToast('No other player to report.', 'info');
      return;
    }
    setSubmittingReport(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${getApiUrl()}/api/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          roomCode: room.code,
          reportedName: targetName,
          reason: reportReason,
          details: reportDetails.trim() || undefined,
        }),
      });
      if (res.ok) {
        addToast('Report submitted. Thank you for keeping Doodl friendly!', 'success');
        setReportOpen(false);
        setReportDetails('');
      } else {
        const err = (await res.json()) as { error?: string };
        addToast(err.error ?? 'Unable to submit report.', 'error');
      }
    } catch {
      addToast('Unable to submit report.', 'error');
    } finally {
      setSubmittingReport(false);
    }
  };

  const timerDanger = room.phase === 'DRAWING' && secondsLeft <= 10;

  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-5 py-3 sm:py-4 space-y-3">
      {/* Top Game Header */}
      <header className="rounded-card border border-surface-border bg-surface-card px-3.5 py-2.5 shadow-soft flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 rounded-control bg-brand-green-soft dark:bg-surface-elevated text-brand-green-deep dark:text-brand-emerald text-xs font-extrabold tracking-widest">
            {room.code}
          </span>
          <span className="text-sm font-bold text-ink-main">
            Round {room.currentRound} / {room.totalRounds}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium ${
              connectionStatus === 'connected' ? 'text-brand-green' : 'text-semantic-warning'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-brand-green' : 'bg-semantic-warning animate-pulse'
              }`}
            />
            <span className="hidden sm:inline">
              {connectionStatus === 'connected' ? 'Live' : 'Reconnecting'}
            </span>
          </span>
        </div>

        {/* Center Word Hint / Secret Word */}
        <div className="flex items-center gap-2 order-3 sm:order-2 w-full sm:w-auto justify-center py-1 sm:py-0">
          {room.phase === 'DRAWING' && (
            <>
              {isDrawer && secretWord ? (
                <div className="px-4 py-1.5 rounded-full bg-brand-green-soft dark:bg-surface-elevated border border-brand-green/30 text-sm sm:text-base font-extrabold text-brand-green-deep dark:text-brand-emerald tracking-wide">
                  Draw: <span className="uppercase">{secretWord}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg sm:text-xl font-extrabold tracking-[0.28em] text-ink-main">
                    {room.wordHint}
                  </span>
                  <span className="text-xs font-semibold text-ink-secondary">
                    ({room.wordLength})
                  </span>
                </div>
              )}
            </>
          )}
          {room.phase === 'WORD_SELECTION' && (
            <span className="text-sm font-semibold text-ink-secondary">
              {isDrawer ? 'Pick a word to draw!' : `${drawer?.name ?? 'Drawer'} is choosing a word...`}
            </span>
          )}
          {room.phase === 'ROUND_END' && (
            <span className="text-sm font-bold text-brand-blue">
              Round complete! Next turn starting...
            </span>
          )}
        </div>

        {/* Right Controls: Timer, Mute, Leave */}
        <div className="flex items-center gap-2 order-2 sm:order-3">
          <div
            className={`min-w-[68px] px-3 py-1.5 rounded-full font-extrabold text-base sm:text-lg flex items-center justify-center gap-1.5 border ${
              timerDanger
                ? 'bg-semantic-danger/10 border-semantic-danger/40 text-semantic-danger animate-pulse'
                : 'bg-surface-bg border-surface-border text-ink-main'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{secondsLeft}s</span>
          </div>

          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
            className="min-h-[40px] min-w-[40px] rounded-control border border-surface-border bg-surface-bg text-ink-secondary hover:text-ink-main inline-flex items-center justify-center"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => {
              const firstOther = room.players.find((p) => p.id !== playerId);
              if (firstOther) setReportTarget(firstOther.name);
              setReportOpen(true);
            }}
            aria-label="Report player"
            title="Report player"
            className="min-h-[40px] min-w-[40px] rounded-control border border-surface-border bg-surface-bg text-ink-secondary hover:text-semantic-warning inline-flex items-center justify-center"
          >
            <Flag className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleLeave}
            aria-label="Leave room"
            className="min-h-[40px] min-w-[40px] rounded-control border border-surface-border bg-surface-bg text-ink-secondary hover:text-semantic-danger inline-flex items-center justify-center"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Horizontal Player Strip */}
      <div className="lg:hidden flex gap-2 overflow-x-auto pb-1">
        {sortedPlayers.map((p, idx) => (
          <div
            key={p.id}
            className={`shrink-0 flex items-center gap-2 px-2.5 py-1.5 rounded-input border text-xs ${
              p.id === room.currentDrawerId
                ? 'border-brand-blue bg-brand-blue-soft dark:bg-surface-elevated'
                : p.hasGuessed
                  ? 'border-brand-green bg-brand-green-soft dark:bg-surface-elevated'
                  : 'border-surface-border bg-surface-card'
            }`}
          >
            <span className="font-bold text-ink-muted">#{idx + 1}</span>
            <AvatarBadge avatarId={p.avatar} size="sm" />
            <div>
              <div className="font-bold text-ink-main flex items-center gap-1">
                <span className="max-w-[80px] truncate">{p.name}</span>
                {p.id === room.currentDrawerId && <Pencil className="w-3 h-3 text-brand-blue" />}
                {p.hasGuessed && <CheckCircle2 className="w-3 h-3 text-brand-green" />}
              </div>
              <div className="text-[11px] font-semibold text-ink-secondary">{p.score} pts</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Responsive Grid: Mobile stacked / Desktop 3-column */}
      <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr_320px] gap-3 sm:gap-4 items-start">
        {/* Desktop Left Column: Players */}
        <aside className="hidden lg:flex flex-col gap-2 rounded-card border border-surface-border bg-surface-card p-3 shadow-soft">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-secondary px-1">
            Scoreboard
          </h2>
          <div className="space-y-2">
            {sortedPlayers.map((p, idx) => (
              <div
                key={p.id}
                className={`flex items-center justify-between gap-2 p-2.5 rounded-input border transition ${
                  p.id === room.currentDrawerId
                    ? 'border-brand-blue bg-brand-blue-soft/70 dark:bg-surface-elevated'
                    : p.hasGuessed
                      ? 'border-brand-green/60 bg-brand-green-soft/70 dark:bg-surface-elevated'
                      : 'border-surface-border bg-surface-bg'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xs font-extrabold text-ink-muted w-4">#{idx + 1}</span>
                  <AvatarBadge avatarId={p.avatar} size="sm" />
                  <div className="min-w-0">
                    <div className="text-sm font-bold truncate flex items-center gap-1">
                      <span>{p.name}</span>
                      {p.isHost && <Crown className="w-3.5 h-3.5 text-semantic-warning shrink-0" />}
                    </div>
                    <div className="text-xs text-ink-secondary font-medium">
                      {p.score} pts
                      {p.roundScore > 0 && (
                        <span className="text-brand-green ml-1">(+{p.roundScore})</span>
                      )}
                    </div>
                  </div>
                </div>
                {p.id === room.currentDrawerId && (
                  <Pencil className="w-4 h-4 text-brand-blue shrink-0" aria-label="Drawing" />
                )}
                {p.hasGuessed && (
                  <CheckCircle2 className="w-4 h-4 text-brand-green shrink-0" aria-label="Guessed" />
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* Center Column: Canvas + Overlays */}
        <div className="relative">
          <DrawingCanvas
            canDraw={isDrawer && room.phase === 'DRAWING'}
            isFullscreen={fullscreenCanvas}
            onToggleFullscreen={() => setFullscreenCanvas((v) => !v)}
          />

          {/* Word Selection Overlay (Drawer) */}
          <AnimatePresence>
            {room.phase === 'WORD_SELECTION' && isDrawer && wordOptions.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 rounded-card bg-surface-card/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center"
              >
                <h3 className="text-xl sm:text-2xl font-extrabold text-ink-main mb-1">
                  Choose a Word to Draw
                </h3>
                <p className="text-sm text-ink-secondary mb-5">
                  Pick fast! {secondsLeft}s remaining
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {wordOptions.map((word) => (
                    <button
                      key={word}
                      type="button"
                      onClick={() => handleSelectWord(word)}
                      className="min-h-[48px] px-6 py-3 rounded-input brand-gradient text-white font-bold text-base capitalize shadow-soft hover:scale-105 active:scale-95 transition"
                    >
                      {word}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Round End Overlay */}
          <AnimatePresence>
            {room.phase === 'ROUND_END' && roundEndData && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 rounded-card bg-surface-card/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center"
              >
                <span className="text-xs font-bold uppercase tracking-wider text-brand-blue mb-1">
                  {roundEndData.reason === 'all_guessed'
                    ? 'Everyone guessed it!'
                    : roundEndData.reason === 'drawer_left'
                      ? 'Drawer left the room'
                      : "Time's up!"}
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-ink-main mb-4">
                  The word was{' '}
                  <span className="brand-gradient-text uppercase">{roundEndData.word}</span>
                </h3>
                <div className="w-full max-w-xs space-y-1.5">
                  {roundEndData.players
                    .filter((p) => (roundEndData.roundScores[p.id] ?? 0) > 0)
                    .map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between px-3 py-1.5 rounded-control bg-surface-bg border border-surface-border text-sm"
                      >
                        <span className="font-semibold">{p.name}</span>
                        <span className="font-bold text-brand-green">
                          +{roundEndData.roundScores[p.id]}
                        </span>
                      </div>
                    ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: Live Chat & Guess Input */}
        <section className="rounded-card border border-surface-border bg-surface-card shadow-soft flex flex-col h-[300px] lg:h-[540px]">
          <div className="px-3.5 py-2.5 border-b border-surface-border flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-secondary">
              Guesses & Chat
            </h2>
            <span className="text-[11px] text-ink-muted">
              {isDrawer ? 'Drawing mode' : 'Type your guess'}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
            {chatHistory.map((msg) => (
              <div
                key={msg.id}
                className={`px-2.5 py-1.5 rounded-control break-words ${
                  msg.type === 'correct'
                    ? 'bg-brand-green-soft dark:bg-brand-green/20 text-brand-green-deep dark:text-brand-emerald font-bold'
                    : msg.type === 'guess-close'
                      ? 'bg-semantic-warning/15 text-semantic-warning font-semibold'
                      : msg.type === 'system'
                        ? 'bg-surface-bg text-ink-secondary text-xs italic'
                        : 'text-ink-main'
                }`}
              >
                {msg.type === 'chat' ? (
                  <>
                    <span className="font-bold mr-1.5">{msg.playerName}:</span>
                    <span>{msg.text}</span>
                  </>
                ) : (
                  <span>{msg.text}</span>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <form
            onSubmit={handleSendGuess}
            className="p-2.5 border-t border-surface-border flex items-center gap-2"
          >
            <input
              type="text"
              value={guessText}
              onChange={(e) => setGuessText(e.target.value)}
              maxLength={200}
              placeholder={
                isDrawer && room.phase === 'DRAWING'
                  ? 'Chat with players...'
                  : 'Type your guess here...'
              }
              aria-label="Type your guess or chat message"
              className="flex-1 min-h-[44px] px-3 rounded-input border border-surface-border bg-surface-bg text-base text-ink-main placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
            <button
              type="submit"
              aria-label="Send message"
              className="min-h-[44px] min-w-[44px] rounded-input bg-brand-green hover:bg-brand-green-deep text-white inline-flex items-center justify-center active:scale-95 transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </section>
      </div>

      {/* Report Modal */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-panel border border-surface-border bg-surface-card p-6 shadow-elevated space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-ink-main flex items-center gap-2">
                <Flag className="w-4 h-4 text-semantic-warning" />
                Report Player
              </h2>
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                aria-label="Close report modal"
                className="min-h-[36px] min-w-[36px] rounded-control text-ink-secondary hover:text-ink-main inline-flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReportSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink-secondary">Player</label>
                <select
                  value={reportTarget}
                  onChange={(e) => setReportTarget(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-input border border-surface-border bg-surface-bg text-sm text-ink-main"
                >
                  {room.players
                    .filter((p) => p.id !== playerId)
                    .map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink-secondary">Reason</label>
                <select
                  value={reportReason}
                  onChange={(e) =>
                    setReportReason(
                      e.target.value as
                        | 'inappropriate_drawing'
                        | 'abusive_chat'
                        | 'cheating'
                        | 'spam'
                    )
                  }
                  className="w-full min-h-[44px] px-3 rounded-input border border-surface-border bg-surface-bg text-sm text-ink-main"
                >
                  <option value="abusive_chat">Abusive or offensive chat</option>
                  <option value="inappropriate_drawing">Inappropriate drawing</option>
                  <option value="cheating">Cheating / spoiling word</option>
                  <option value="spam">Spam</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink-secondary">
                  Details (optional)
                </label>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  maxLength={300}
                  rows={2}
                  placeholder="Briefly describe what happened..."
                  className="w-full p-3 rounded-input border border-surface-border bg-surface-bg text-sm text-ink-main"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReportOpen(false)}
                  className="min-h-[40px] px-4 rounded-input border border-surface-border text-sm font-semibold text-ink-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReport || room.players.length < 2}
                  className="min-h-[40px] px-4 rounded-input bg-semantic-danger text-white text-sm font-bold disabled:opacity-50"
                >
                  {submittingReport ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
