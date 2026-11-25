'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2, Users } from 'lucide-react';
import { joinRoomSchema, type JoinRoomInput } from '@doodlio/shared';
import { AvatarPicker } from '@/components/AvatarPicker';
import { BrandLogo } from '@/components/BrandLogo';
import { GameView } from '@/components/GameView';
import { LobbyView } from '@/components/LobbyView';
import { ResultsView } from '@/components/ResultsView';
import { ThemeToggle } from '@/components/ThemeToggle';
import { getAuthToken } from '@/lib/auth';
import { getSocket } from '@/lib/socket';
import { useGameStore } from '@/stores/useGameStore';

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const roomCode = (params.code ?? '').toUpperCase();

  const { room, playerId, gameEndData, setSession, addToast } = useGameStore();
  const [reconnecting, setReconnecting] = useState(true);
  const [joining, setJoining] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<JoinRoomInput>({
    resolver: zodResolver(joinRoomSchema),
    defaultValues: {
      code: roomCode,
      playerName: '',
      avatar: 'fox',
    },
  });

  const avatar = watch('avatar');

  useEffect(() => {
    if (room && room.code === roomCode && playerId) {
      setReconnecting(false);
      return;
    }

    const savedRaw = sessionStorage.getItem(`doodlio_session_${roomCode}`);
    if (!savedRaw) {
      setReconnecting(false);
      return;
    }

    try {
      const saved = JSON.parse(savedRaw) as { token: string; playerId: string };
      const socket = getSocket();
      socket.emit(
        'player:reconnect',
        { token: saved.token, roomCode },
        (ack) => {
          setReconnecting(false);
          if (ack.ok) {
            setSession({
              playerId: ack.playerId,
              sessionToken: ack.sessionToken,
              room: ack.room,
              strokes: ack.strokes,
              chatHistory: ack.chatHistory,
            });
          } else {
            sessionStorage.removeItem(`doodlio_session_${roomCode}`);
          }
        }
      );
    } catch {
      setReconnecting(false);
    }
  }, [room, roomCode, playerId, setSession]);

  const handleJoinViaLink = (data: JoinRoomInput) => {
    setJoining(true);
    const authToken = getAuthToken() ?? undefined;
    getSocket().emit('room:join', { ...data, code: roomCode, authToken }, (ack) => {
      setJoining(false);
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
    });
  };

  if (reconnecting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6">
        <Loader2 className="w-8 h-8 animate-spin text-brand-green" />
        <p className="text-sm font-semibold text-ink-secondary">
          Connecting to room {roomCode}...
        </p>
      </div>
    );
  }

  // User opened an invite link directly without an active session
  if (!room || room.code !== roomCode || !playerId) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="border-b border-surface-border bg-surface-card px-4 sm:px-6 h-16 flex items-center justify-between">
          <BrandLogo />
          <ThemeToggle />
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-panel border border-surface-border bg-surface-card p-6 shadow-elevated space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-brand-blue">
                  Room Invitation
                </span>
                <h1 className="text-2xl font-extrabold tracking-widest text-ink-main">
                  {roomCode}
                </h1>
              </div>
              <button
                type="button"
                onClick={() => router.push('/')}
                className="min-h-[40px] px-3 rounded-control border border-surface-border text-xs font-semibold text-ink-secondary hover:text-ink-main inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Home
              </button>
            </div>

            <form onSubmit={handleSubmit(handleJoinViaLink)} className="space-y-4">
              <input type="hidden" {...register('code')} value={roomCode} />
              <div>
                <label htmlFor="invite-nickname" className="block text-sm font-semibold mb-1.5">
                  Your Nickname
                </label>
                <input
                  id="invite-nickname"
                  type="text"
                  placeholder="e.g. DoodlePro"
                  {...register('playerName')}
                  className="w-full min-h-[44px] px-3.5 rounded-input border border-surface-border bg-surface-bg text-base text-ink-main focus:outline-none focus:ring-2 focus:ring-brand-green"
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
                disabled={joining}
                className="w-full min-h-[48px] rounded-input brand-gradient text-white font-bold text-base shadow-soft hover:opacity-95 active:scale-[0.99] transition flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {joining ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Users className="w-5 h-5" />
                )}
                {joining ? 'Joining...' : `Join Room ${roomCode}`}
              </button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {room.phase === 'WAITING' && (
        <>
          <header className="border-b border-surface-border bg-surface-card px-4 sm:px-6 h-16 flex items-center justify-between">
            <BrandLogo />
            <ThemeToggle />
          </header>
          <LobbyView room={room} playerId={playerId} />
        </>
      )}

      {room.phase === 'GAME_END' && gameEndData && (
        <>
          <header className="border-b border-surface-border bg-surface-card px-4 sm:px-6 h-16 flex items-center justify-between">
            <BrandLogo />
            <ThemeToggle />
          </header>
          <ResultsView room={room} playerId={playerId} results={gameEndData} />
        </>
      )}

      {room.phase !== 'WAITING' && room.phase !== 'GAME_END' && (
        <GameView room={room} playerId={playerId} />
      )}
    </div>
  );
}
