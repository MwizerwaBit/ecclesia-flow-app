/**
 * @file media.types.ts
 * @description Domain types for the reusable media library.
 *
 * One asset, used in different places (member photo, org logo, event
 * banner, certificate background) — see media_assets / media_attachments
 * in docs/database-design.md for the backing shape this mirrors.
 */

export type MediaKind = 'image' | 'video' | 'document';

export interface MediaAsset {
  id: string;
  tenantId: string;
  kind: MediaKind;
  url: string;
  mimeType: string;
  sizeBytes: number;
  name: string;
  altText?: string;
  uploadedByName: string;
  createdAt: string;
}
