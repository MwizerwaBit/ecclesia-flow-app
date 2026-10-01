/**
 * @file MediaPicker.tsx
 * @description The one reusable way to attach media anywhere in the app —
 * upload a new file, or reuse one already in the library. Every screen that
 * needs an image or document uses this instead of its own file input, so
 * "upload a logo" / "upload background artwork" / "add a member photo" are
 * one implementation, not four. For a compact custom trigger (e.g. a
 * circular camera icon over an avatar) that doesn't fit this component's own
 * button pair, use the useMediaUpload hook directly instead — same upload
 * mechanics, the caller's own ref and button.
 */
import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FolderOpen, Upload } from 'lucide-react';
import type { MediaAsset, MediaKind } from '@/types';
import { mediaService } from '@/services/mediaService';
import { useMediaUpload } from './useMediaUpload';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Typography';
import { EmptyState } from '@/components/ui/EmptyState';

interface MediaPickerProps {
  kind?: MediaKind;
  label?: string;
  onSelect: (asset: MediaAsset) => void;
  /** Set false for a one-off upload where reusing a past file makes no sense. */
  allowLibrary?: boolean;
  className?: string;
}

export function MediaPicker({ kind = 'image', label = 'Upload', onSelect, allowLibrary = true, className }: MediaPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLibraryOpen, setLibraryOpen] = useState(false);
  const { accept, isUploading, onFileChange } = useMediaUpload(kind, onSelect);

  const { data: library = [], isLoading: isLoadingLibrary } = useQuery({
    queryKey: ['media', kind],
    queryFn: () => mediaService.list(kind),
    enabled: isLibraryOpen,
  });

  return (
    <div className={className}>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={onFileChange} />
      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          leftIcon={Upload}
          isLoading={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          {label}
        </Button>
        {allowLibrary && (
          <Button type="button" variant="ghost" size="sm" leftIcon={FolderOpen} onClick={() => setLibraryOpen(true)}>
            Choose existing
          </Button>
        )}
      </div>

      <BottomSheet open={isLibraryOpen} onClose={() => setLibraryOpen(false)} title="Media library">
        {isLoadingLibrary && (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        )}

        {!isLoadingLibrary && library.length === 0 && (
          <EmptyState icon={FolderOpen} title="Nothing here yet" description="Upload a file to start the library." />
        )}

        <div className="grid grid-cols-3 gap-2">
          {library.map((asset) => (
            <button
              key={asset.id}
              type="button"
              onClick={() => {
                onSelect(asset);
                setLibraryOpen(false);
              }}
              className="aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 hover:ring-2 hover:ring-primary transition-all"
            >
              {asset.kind === 'image' ? (
                <img src={asset.url} alt={asset.altText ?? asset.name} className="size-full object-cover" />
              ) : (
                <div className="size-full flex items-center justify-center bg-slate-50 dark:bg-slate-800 p-2">
                  <Text variant="caption" color="muted" className="text-center line-clamp-3">
                    {asset.name}
                  </Text>
                </div>
              )}
            </button>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
}
