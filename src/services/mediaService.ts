/**
 * @file mediaService.ts
 * @description The reusable media library — one upload path and one browse
 * path, used everywhere something needs an image or a document instead of
 * every screen wiring its own file input.
 *
 * Mutable in-memory list rather than a stateless mock response: an upload
 * has to actually show up in the Document Library and stay there for the
 * rest of the session, the same category of exception as the leadership
 * transfer record in teamService.
 */
import type { MediaAsset, MediaKind } from '@/types';
import { mockResponse, API_MODE, apiRequest } from './adapter';
import { MOCK_MEDIA } from '@/mocks/media.mock';

function kindFromMimeType(mimeType: string): MediaKind {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  return 'document';
}

export const mediaService = {
  async list(kind?: MediaKind): Promise<MediaAsset[]> {
    if (API_MODE === 'mock') {
      const items = kind ? MOCK_MEDIA.filter((m) => m.kind === kind) : MOCK_MEDIA;
      return mockResponse([...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }
    return apiRequest<MediaAsset[]>(`/media${kind ? `?kind=${kind}` : ''}`);
  },

  /**
   * Genuinely renders — `URL.createObjectURL` gives back a real, previewable
   * URL for the chosen file, no server required to see it work. A real
   * backend swaps this for an upload to object storage without the caller
   * (MediaPicker) changing.
   */
  async upload(file: File, uploadedByName = 'You'): Promise<MediaAsset> {
    if (API_MODE === 'mock') {
      const asset: MediaAsset = {
        id: `med-${Date.now()}`,
        tenantId: 't1',
        kind: kindFromMimeType(file.type),
        url: URL.createObjectURL(file),
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        name: file.name,
        uploadedByName,
        createdAt: new Date().toISOString(),
      };
      MOCK_MEDIA.unshift(asset);
      return mockResponse(asset);
    }
    const form = new FormData();
    form.append('file', file);
    return apiRequest<MediaAsset>('/media', { method: 'POST', body: form as unknown as string });
  },

  async remove(id: string): Promise<void> {
    if (API_MODE === 'mock') {
      const index = MOCK_MEDIA.findIndex((m) => m.id === id);
      if (index !== -1) MOCK_MEDIA.splice(index, 1);
      return mockResponse(undefined as void);
    }
    return apiRequest(`/media/${id}`, { method: 'DELETE' });
  },
};
