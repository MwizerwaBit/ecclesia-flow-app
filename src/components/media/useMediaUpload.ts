/**
 * @file useMediaUpload.ts
 * @description Shared upload mechanics behind MediaPicker, exposed directly
 * for the rare screen that needs its own compact trigger (a circular camera
 * icon over an avatar) instead of the standard button pair. The ref for the
 * hidden input stays local to whichever component renders it either way —
 * this hook only owns the mutation, never a ref it would have to hand back.
 */
import type { ChangeEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { MediaAsset, MediaKind } from '@/types';
import { mediaService } from '@/services/mediaService';

export const ACCEPT_BY_KIND: Record<MediaKind, string> = {
  image: 'image/*',
  video: 'video/*',
  document: '.pdf,.doc,.docx,.csv,.zip,.xlsx',
};

export function useMediaUpload(kind: MediaKind, onSelect: (asset: MediaAsset) => void) {
  const upload = useMutation({
    mutationFn: (file: File) => mediaService.upload(file),
    onSuccess: onSelect,
  });

  return {
    accept: ACCEPT_BY_KIND[kind],
    isUploading: upload.isPending,
    onFileChange: (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) upload.mutate(file);
      e.target.value = '';
    },
  };
}
