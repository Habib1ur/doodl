'use client';

import { AVATARS } from '@doodlio/shared';

interface AvatarPickerProps {
  value: string;
  onChange: (avatarId: string) => void;
}

export function AvatarPicker({ value, onChange }: AvatarPickerProps) {
  return (
    <div className="grid grid-cols-6 gap-2" role="radiogroup" aria-label="Choose your avatar">
      {AVATARS.map((avatar) => {
        const selected = value === avatar.id;
        return (
          <button
            key={avatar.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={avatar.label}
            onClick={() => onChange(avatar.id)}
            style={{ backgroundColor: avatar.bg }}
            className={`min-h-[44px] rounded-input flex items-center justify-center text-2xl transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue ${
              selected
                ? 'ring-2 ring-brand-green ring-offset-2 ring-offset-surface-card scale-105 shadow-soft'
                : 'opacity-80 hover:opacity-100 hover:scale-105'
            }`}
          >
            <span aria-hidden="true">{avatar.emoji}</span>
          </button>
        );
      })}
    </div>
  );
}

export function AvatarBadge({ avatarId, size = 'md' }: { avatarId: string; size?: 'sm' | 'md' | 'lg' }) {
  const found = AVATARS.find((a) => a.id === avatarId) ?? AVATARS[0];
  const dim =
    size === 'sm' ? 'w-8 h-8 text-base' : size === 'lg' ? 'w-12 h-12 text-2xl' : 'w-10 h-10 text-xl';

  return (
    <span
      style={{ backgroundColor: found.bg }}
      className={`${dim} rounded-full inline-flex items-center justify-center shrink-0 select-none border border-black/5`}
      aria-label={found.label}
    >
      {found.emoji}
    </span>
  );
}
