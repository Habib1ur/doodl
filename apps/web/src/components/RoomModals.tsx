'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { Globe, Lock, Loader2, Sparkles, Users, X } from 'lucide-react';
import {
  createRoomSchema,
  joinRoomSchema,
  LANGUAGES,
  WORD_CATEGORIES,
  type CreateRoomInput,
  type JoinRoomInput,
  type WordCategory,
} from '@doodlio/shared';
import { getAuthToken } from '@/lib/auth';
import { getSocket } from '@/lib/socket';
import { useGameStore } from '@/stores/useGameStore';
import { AvatarPicker } from './AvatarPicker';

interface CreateRoomModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateRoomModal({ open, onClose }: CreateRoomModalProps) {
  const router = useRouter();
  const { setSession, addToast } = useGameStore();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateRoomInput>({
    resolver: zodResolver(createRoomSchema),
    defaultValues: {
      playerName: '',
      avatar: 'fox',
      settings: {
        isPublic: false,
        language: 'en',
        categories: ['random'],
        rounds: 3,
        drawTime: 80,
        maxPlayers: 8,
      },
    },
  });

  const avatar = watch('avatar');
  const isPublic = watch('settings.isPublic') ?? false;
  const selectedCategories = watch('settings.categories') ?? ['random'];

  const toggleCategory = (cat: WordCategory) => {
    if (cat === 'random') {
      setValue('settings.categories', ['random']);
      return;
    }
    const withoutRandom = selectedCategories.filter((c) => c !== 'random');
    const exists = withoutRandom.includes(cat);
    const next = exists
      ? withoutRandom.filter((c) => c !== cat)
      : [...withoutRandom, cat];
    setValue('settings.categories', next.length ? next : ['random']);
  };

  const onSubmit = (data: CreateRoomInput) => {
    setSubmitting(true);
    const socket = getSocket();
    const authToken = getAuthToken() ?? undefined;
    socket.emit('room:create', { ...data, authToken }, (ack) => {
      setSubmitting(false);
      if (!ack.ok) {
        addToast(ack.error, 'error');
        return;
      }
      setSession({
        playerId: ack.playerId,
        sessionToken: ack.sessionToken,
        room: ack.room,
        strokes: ack.strokes,
        chatHistory: ack.chatHistory,
      });
      onClose();
      router.push(`/room/${ack.room.code}`);
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-room-title"
            className="relative z-10 w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-panel sm:rounded-panel border border-surface-border bg-surface-card p-5 sm:p-6 shadow-elevated"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 id="create-room-title" className="text-xl font-bold text-ink-main">
                  Create a Room
                </h2>
                <p className="text-sm text-ink-secondary">
                  Customize your game and invite friends.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-control text-ink-secondary hover:text-ink-main hover:bg-surface-elevated"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label htmlFor="create-nickname" className="block text-sm font-semibold mb-1.5">
                  Nickname
                </label>
                <input
                  id="create-nickname"
                  type="text"
                  placeholder="e.g. SketchMaster"
                  {...register('playerName')}
                  className="w-full min-h-[44px] px-3.5 rounded-input border border-surface-border bg-surface-bg text-base text-ink-main placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand-green"
                />
                {errors.playerName && (
                  <p className="mt-1 text-xs text-semantic-danger font-medium">
                    {errors.playerName.message}
                  </p>
                )}
              </div>

              <div>
                <span className="block text-sm font-semibold mb-2">Choose Avatar</span>
                <AvatarPicker value={avatar} onChange={(val) => setValue('avatar', val)} />
              </div>

              {/* Room Visibility */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setValue('settings.isPublic', false)}
                  className={`min-h-[44px] px-3 py-2.5 rounded-input border flex items-center justify-center gap-2 text-sm font-semibold transition ${
                    !isPublic
                      ? 'border-brand-green bg-brand-green-soft text-brand-green-deep dark:bg-surface-elevated dark:text-brand-emerald'
                      : 'border-surface-border bg-surface-bg text-ink-secondary hover:text-ink-main'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  Private Room
                </button>
                <button
                  type="button"
                  onClick={() => setValue('settings.isPublic', true)}
                  className={`min-h-[44px] px-3 py-2.5 rounded-input border flex items-center justify-center gap-2 text-sm font-semibold transition ${
                    isPublic
                      ? 'border-brand-blue bg-brand-blue-soft text-brand-blue-deep dark:bg-surface-elevated dark:text-brand-sky'
                      : 'border-surface-border bg-surface-bg text-ink-secondary hover:text-ink-main'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  Public Room
                </button>
              </div>

              {/* Settings Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="create-lang" className="block text-xs font-semibold text-ink-secondary mb-1">
                    Language
                  </label>
                  <select
                    id="create-lang"
                    {...register('settings.language')}
                    className="w-full min-h-[44px] px-3 rounded-input border border-surface-border bg-surface-bg text-sm text-ink-main focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="create-players" className="block text-xs font-semibold text-ink-secondary mb-1">
                    Max Players
                  </label>
                  <select
                    id="create-players"
                    {...register('settings.maxPlayers', { valueAsNumber: true })}
                    className="w-full min-h-[44px] px-3 rounded-input border border-surface-border bg-surface-bg text-sm text-ink-main focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  >
                    {[2, 4, 6, 8].map((n) => (
                      <option key={n} value={n}>
                        {n} Players
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="create-rounds" className="block text-xs font-semibold text-ink-secondary mb-1">
                    Rounds
                  </label>
                  <select
                    id="create-rounds"
                    {...register('settings.rounds', { valueAsNumber: true })}
                    className="w-full min-h-[44px] px-3 rounded-input border border-surface-border bg-surface-bg text-sm text-ink-main focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  >
                    {[2, 3, 4, 5, 6, 8].map((n) => (
                      <option key={n} value={n}>
                        {n} Rounds
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="create-drawtime" className="block text-xs font-semibold text-ink-secondary mb-1">
                    Draw Time
                  </label>
                  <select
                    id="create-drawtime"
                    {...register('settings.drawTime', { valueAsNumber: true })}
                    className="w-full min-h-[44px] px-3 rounded-input border border-surface-border bg-surface-bg text-sm text-ink-main focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  >
                    {[45, 60, 80, 100, 120].map((sec) => (
                      <option key={sec} value={sec}>
                        {sec} seconds
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Categories */}
              <div>
                <span className="block text-xs font-semibold text-ink-secondary mb-2">
                  Word Categories
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {WORD_CATEGORIES.map((cat) => {
                    const active = selectedCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition ${
                          active
                            ? 'bg-brand-green text-white shadow-sm'
                            : 'bg-surface-bg border border-surface-border text-ink-secondary hover:text-ink-main'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full min-h-[48px] rounded-input brand-gradient text-white font-bold text-base shadow-soft hover:opacity-95 active:scale-[0.99] transition flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Sparkles className="w-5 h-5" />
                )}
                {submitting ? 'Creating Room...' : 'Create & Enter Lobby'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

interface JoinRoomModalProps {
  open: boolean;
  initialCode?: string;
  onClose: () => void;
}

export function JoinRoomModal({ open, initialCode = '', onClose }: JoinRoomModalProps) {
  const router = useRouter();
  const { setSession, addToast } = useGameStore();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<JoinRoomInput>({
    resolver: zodResolver(joinRoomSchema),
    defaultValues: {
      code: initialCode,
      playerName: '',
      avatar: 'octopus',
    },
  });

  const avatar = watch('avatar');

  const onSubmit = (data: JoinRoomInput) => {
    setSubmitting(true);
    const socket = getSocket();
    const authToken = getAuthToken() ?? undefined;
    socket.emit('room:join', { ...data, authToken }, (ack) => {
      setSubmitting(false);
      if (!ack.ok) {
        addToast(ack.error, 'error');
        return;
      }
      setSession({
        playerId: ack.playerId,
        sessionToken: ack.sessionToken,
        room: ack.room,
        strokes: ack.strokes,
        chatHistory: ack.chatHistory,
      });
      onClose();
      router.push(`/room/${ack.room.code}`);
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="join-room-title"
            className="relative z-10 w-full sm:max-w-md rounded-t-panel sm:rounded-panel border border-surface-border bg-surface-card p-5 sm:p-6 shadow-elevated"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 id="join-room-title" className="text-xl font-bold text-ink-main">
                  Join a Room
                </h2>
                <p className="text-sm text-ink-secondary">
                  Enter the 6-character code from your friend.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-control text-ink-secondary hover:text-ink-main hover:bg-surface-elevated"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="join-code" className="block text-sm font-semibold mb-1.5">
                  Room Code
                </label>
                <input
                  id="join-code"
                  type="text"
                  maxLength={6}
                  placeholder="ABCD12"
                  {...register('code')}
                  className="w-full min-h-[48px] px-3.5 rounded-input border border-surface-border bg-surface-bg text-lg font-extrabold tracking-widest uppercase text-center text-ink-main placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
                {errors.code && (
                  <p className="mt-1 text-xs text-semantic-danger font-medium">
                    {errors.code.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="join-nickname" className="block text-sm font-semibold mb-1.5">
                  Nickname
                </label>
                <input
                  id="join-nickname"
                  type="text"
                  placeholder="e.g. QuickGuesser"
                  {...register('playerName')}
                  className="w-full min-h-[44px] px-3.5 rounded-input border border-surface-border bg-surface-bg text-base text-ink-main placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
                {errors.playerName && (
                  <p className="mt-1 text-xs text-semantic-danger font-medium">
                    {errors.playerName.message}
                  </p>
                )}
              </div>

              <div>
                <span className="block text-sm font-semibold mb-2">Choose Avatar</span>
                <AvatarPicker value={avatar} onChange={(val) => setValue('avatar', val)} />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full min-h-[48px] rounded-input bg-brand-blue hover:bg-brand-blue-deep text-white font-bold text-base shadow-soft active:scale-[0.99] transition flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Users className="w-5 h-5" />
                )}
                {submitting ? 'Joining...' : 'Join Room'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
