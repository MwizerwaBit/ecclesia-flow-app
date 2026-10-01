/**
 * @file TopHeader.tsx
 * @description Standard mobile top header / desktop sticky header.
 *
 * @prop title - Screen title
 * @prop leftAction - 'back' | 'menu' | null
 * @prop rightActions - Array of React nodes (e.g. icon buttons)
 */
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Menu } from 'lucide-react';
import { Text } from '@/components/ui';

interface TopHeaderProps {
  title: string;
  leftAction?: 'back' | 'menu' | null;
  onMenuClick?: () => void;
  rightActions?: React.ReactNode[];
}

export function TopHeader({ title, leftAction, onMenuClick, rightActions }: TopHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-sticky h-14 bg-surface/80 dark:bg-surface-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between safe-top">
      <div className="flex items-center flex-1">
        {leftAction === 'back' && (
          <button 
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            aria-label="Go back"
          >
            <ChevronLeft size={24} />
          </button>
        )}
        {leftAction === 'menu' && (
          <button 
            onClick={onMenuClick}
            className="p-2 -ml-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
        )}
        <Text variant="h3" className="ml-2 truncate">{title}</Text>
      </div>

      {rightActions && rightActions.length > 0 && (
        <div className="flex items-center gap-2">
          {rightActions.map((action, i) => (
            <div key={i}>{action}</div>
          ))}
        </div>
      )}
    </header>
  );
}
