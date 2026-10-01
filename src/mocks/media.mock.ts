/**
 * @file media.mock.ts
 * @description Starting contents of the shared media library.
 */
import type { MediaAsset } from '@/types';

export const MOCK_MEDIA: MediaAsset[] = [
  { id: 'med1', tenantId: 't1', kind: 'image', url: 'https://i.pravatar.cc/400?img=12', mimeType: 'image/jpeg', sizeBytes: 2_293_760, name: 'Baptism service 2024-06.jpg', uploadedByName: 'Grace Hill', createdAt: '2024-06-16T16:00:00Z' },
  { id: 'med2', tenantId: 't1', kind: 'image', url: 'https://i.pravatar.cc/400?img=23', mimeType: 'image/jpeg', sizeBytes: 3_256_320, name: 'Youth camp group photo.jpg', uploadedByName: 'Grace Hill', createdAt: '2024-08-12T11:20:00Z' },
  { id: 'med3', tenantId: 't1', kind: 'document', url: '#', mimeType: 'application/pdf', sizeBytes: 421_888, name: 'Safeguarding policy 2024.pdf', uploadedByName: 'Sarah Thompson', createdAt: '2024-10-18T10:00:00Z' },
];
