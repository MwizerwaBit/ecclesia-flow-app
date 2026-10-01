/**
 * @file Avatar.tsx
 * @description Member/user avatar — displays photo or falls back to initials.
 * Member names always use the display (serif) font when shown alongside.
 *
 * @prop src - Image URL (optional — shows initials if absent or on error)
 * @prop name - Full name used to compute initials and as alt text
 * @prop size - 'xs' | 'sm' | 'md' | 'lg' | 'xl'
 * @prop status - Optional presence dot: 'online' | 'away' | 'offline'
 * @prop shape - 'circle' | 'square' (default circle)
 *
 * @example
 * <Avatar src={member.photoUrl} name="Aaron Smith" size="md" status="online" />
 * <Avatar name="Benjamin Carter" size="lg" />
 */
import { useState } from 'react';
import { cn } from '@/lib/cn';
import { getInitials } from '@/lib/formatters';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type StatusDot = 'online' | 'away' | 'offline';

interface AvatarProps {
  src?: string;
  name: string;
  size?: AvatarSize;
  status?: StatusDot;
  shape?: 'circle' | 'square';
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'size-6 text-[10px]',
  sm: 'size-8 text-xs',
  md: 'size-11 text-sm',
  lg: 'size-14 text-base',
  xl: 'size-20 text-lg',
};

const dotSizeClasses: Record<AvatarSize, string> = {
  xs: 'size-1.5 border',
  sm: 'size-2 border',
  md: 'size-3 border-2',
  lg: 'size-3.5 border-2',
  xl: 'size-4 border-2',
};

const statusColors: Record<StatusDot, string> = {
  online: 'bg-success',
  away:   'bg-warning',
  offline: 'bg-slate-400',
};

// Deterministic color from name for consistent avatar backgrounds
const BG_COLORS = [
  'bg-indigo-100 text-indigo-700',
  'bg-violet-100 text-violet-700',
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-sky-100 text-sky-700',
  'bg-teal-100 text-teal-700',
];

function getAvatarColor(name: string): string {
  const index = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % BG_COLORS.length;
  return BG_COLORS[index];
}

export function Avatar({
  src,
  name,
  size = 'md',
  status,
  shape = 'circle',
  className,
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const showImage = src && !imgError;
  const initials = getInitials(name);
  const colorClass = getAvatarColor(name);
  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-xl';

  return (
    <div className={cn('relative shrink-0 inline-flex', sizeClasses[size], className)}>
      {showImage ? (
        <img
          src={src}
          alt={name}
          className={cn('size-full object-cover', shapeClass)}
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className={cn(
            'size-full flex items-center justify-center font-sans font-bold',
            shapeClass,
            colorClass,
          )}
          aria-label={name}
          role="img"
        >
          {initials}
        </div>
      )}

      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-white dark:border-background-dark',
            dotSizeClasses[size],
            statusColors[status],
          )}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  );
}
