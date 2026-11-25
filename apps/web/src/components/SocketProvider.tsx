'use client';

import { useEffect } from 'react';
import { getSocket } from '@/lib/socket';
import { soundManager } from '@/lib/sound';
import { useGameStore } from '@/stores/useGameStore';

export function SocketProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const socket = getSocket();
    const store = useGameStore.getState();

    const onConnect = () => {
      useGameStore.getState().setConnectionStatus('connected');
    };
    const onDisconnect = () => {
      useGameStore.getState().setConnectionStatus('disconnected');
    };
    const onConnectError = () => {
      useGameStore.getState().setConnectionStatus('disconnected');
    };

    if (socket.connected) {
      store.setConnectionStatus('connected');
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);

    socket.on('room:updated', (room) => {
      useGameStore.getState().setRoom(room);
    });

    socket.on('room:error', ({ message }) => {
      useGameStore.getState().addToast(message, 'error');
    });

    socket.on('game:started', (room) => {
      const s = useGameStore.getState();
      s.setRoom(room);
      s.setGameEndData(null);
      s.setRoundEndData(null);
      s.setSecretWord(null);
      s.clearStrokes();
    });

    socket.on('game:phase-changed', (payload) => {
      const s = useGameStore.getState();
      if (!s.room) return;
      s.setRoom({
        ...s.room,
        phase: payload.phase,
        currentRound: payload.currentRound,
        currentDrawerId: payload.currentDrawerId,
        wordHint: payload.wordHint,
        wordLength: payload.wordLength,
        phaseEndsAt: payload.phaseEndsAt,
        serverTime: payload.serverTime,
        players: payload.players,
      });
      if (payload.phase === 'WORD_SELECTION') {
        s.setSecretWord(null);
        s.setRoundEndData(null);
      }
      if (payload.phase === 'DRAWING') {
        s.setWordOptions([], 0);
      }
    });

    socket.on('game:word-options', ({ options, expiresAt }) => {
      useGameStore.getState().setWordOptions(options, expiresAt);
    });

    socket.on('game:word-assigned', ({ word }) => {
      useGameStore.getState().setSecretWord(word);
    });

    socket.on('game:hint-updated', ({ wordHint }) => {
      const s = useGameStore.getState();
      if (s.room) {
        s.setRoom({ ...s.room, wordHint });
      }
    });

    socket.on('game:round-ended', (payload) => {
      const s = useGameStore.getState();
      s.setRoundEndData(payload);
      soundManager.playRoundEnd();
      if (s.room) {
        s.setRoom({ ...s.room, players: payload.players });
      }
    });

    socket.on('game:ended', (payload) => {
      const s = useGameStore.getState();
      s.setGameEndData(payload);
      soundManager.playRoundEnd();
    });

    socket.on('drawing:start', (stroke) => {
      useGameStore.getState().startActiveStroke(stroke);
    });

    socket.on('drawing:move', ({ strokeId, points }) => {
      useGameStore.getState().appendActiveStrokePoints(strokeId, points);
    });

    socket.on('drawing:end', ({ strokeId }) => {
      useGameStore.getState().commitActiveStroke(strokeId);
    });

    socket.on('drawing:sync', ({ strokes }) => {
      useGameStore.getState().setStrokes(strokes);
    });

    socket.on('drawing:clear', () => {
      useGameStore.getState().clearStrokes();
    });

    socket.on('guess:correct', ({ players }) => {
      const s = useGameStore.getState();
      soundManager.playCorrectGuess();
      if (s.room) {
        s.setRoom({ ...s.room, players });
      }
    });

    socket.on('chat:message', (msg) => {
      useGameStore.getState().addChatMessage(msg);
    });

    socket.on('reaction:received', (reaction) => {
      const s = useGameStore.getState();
      s.addReaction(reaction);
      setTimeout(() => {
        useGameStore.getState().removeReaction(reaction.id);
      }, 2400);
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('room:updated');
      socket.off('room:error');
      socket.off('game:started');
      socket.off('game:phase-changed');
      socket.off('game:word-options');
      socket.off('game:word-assigned');
      socket.off('game:hint-updated');
      socket.off('game:round-ended');
      socket.off('game:ended');
      socket.off('drawing:start');
      socket.off('drawing:move');
      socket.off('drawing:end');
      socket.off('drawing:sync');
      socket.off('drawing:clear');
      socket.off('guess:correct');
      socket.off('chat:message');
      socket.off('reaction:received');
    };
  }, []);

  return <>{children}</>;
}
