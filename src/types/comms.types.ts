/**
 * @file comms.types.ts
 * @description Domain types for Communications and Notifications.
 */

export type AnnouncementStatus = 'draft' | 'scheduled' | 'sent' | 'archived';
export type NotificationChannel = 'email' | 'push' | 'in_app' | 'sms';
export type NotificationType = 'pastoral_alert' | 'finance_alert' | 'system' | 'announcement';

export interface Announcement {
  id: string;
  tenantId: string;
  title: string;
  body: string; // HTML string from rich text editor
  isPinned: boolean;
  status: AnnouncementStatus;
  channels: NotificationChannel[];
  audienceFilter?: AudienceFilter;
  scheduledAt?: string;
  sentAt?: string;
  authorId: string;
  authorName: string;
  // Delivery stats (staff view only)
  sentCount?: number;
  deliveredCount?: number;
  openedCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AudienceFilter {
  unitIds?: string[];
  statuses?: string[];
  tags?: string[];
  estimatedCount?: number;
}

export interface MessageTemplate {
  id: string;
  tenantId: string;
  name: string;
  subject?: string;
  body: string;
  category: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
}

export interface NotificationPreferences {
  userId: string;
  preferences: Record<NotificationType, Record<NotificationChannel, boolean>>;
}

export interface Certificate {
  id: string;
  tenantId: string;
  templateId: string;
  templateName: string;
  memberId: string;
  memberName: string;
  issuedById: string;
  issuedByName: string;
  issuedAt: string;
  serialNumber: string;
  qrHash: string;
  customValues: Record<string, string>;
  isRevoked: boolean;
  revokedAt?: string;
  revokedReason?: string;
  pdfUrl?: string;
}

export interface CertificateTemplate {
  id: string;
  tenantId: string;
  name: string;
  category: 'sacramental' | 'membership' | 'recognition' | 'education';
  status: 'active' | 'draft' | 'archived';
  backgroundImageUrl?: string;
  tokens: Array<{
    key: string;
    label: string;
    x: number; // Canvas position percentage
    y: number;
    fontSize: number;
    fontFamily: string;
    color: string;
  }>;
  qrCodePosition?: { x: number; y: number };
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  tenantId: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  photoUrl?: string;
  roleId: string;
  roleName: string;
  roleColor?: string;
  unitScope?: string; // Unit ID or "all"
  unitScopeName?: string;
  mfaEnabled: boolean;
  lastActiveAt?: string;
  invitedAt: string;
  acceptedAt?: string;
}

export interface CustomRole {
  id: string;
  tenantId: string;
  name: string;
  color?: string;
  permissions: string[]; // "resource:action" strings
  isSystem: boolean; // System roles can't be deleted
  memberCount: number;
  createdAt: string;
}

export interface InviteStaffPayload {
  email: string;
  roleId: string;
  unitScope?: string;
  expiresAt?: string;
  message?: string;
}
