/**
 * @file IssuedCertificateDetail.tsx
 * @description One issued certificate: the artefact, its serial, and how to revoke it.
 *
 * Revocation asks for a reason and cannot be undone, so it sits behind a
 * confirmation rather than a single tap. A revoked certificate keeps its record —
 * the public verification page must be able to say "this was revoked" rather than
 * "this never existed".
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Ban, Download, QrCode, Share2 } from 'lucide-react';
import { certificatesService } from '@/services/certificatesService';
import { CertificateCanvas } from '@/components/certificates/CertificateCanvas';
import { Badge, BottomSheet, Button, Card, Input, Text } from '@/components/ui';
import { formatDate } from '@/lib/formatters';

export function IssuedCertificateDetail() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();

  const [isRevokeOpen, setRevokeOpen] = useState(false);
  const [reason, setReason] = useState('');

  const { data: certificate, isLoading } = useQuery({
    queryKey: ['certificate', id],
    queryFn: () => certificatesService.getIssued(id),
    enabled: Boolean(id),
  });

  const { data: template } = useQuery({
    queryKey: ['certificate-template', certificate?.templateId],
    queryFn: () => certificatesService.getTemplate(certificate!.templateId),
    enabled: Boolean(certificate?.templateId),
  });

  const revoke = useMutation({
    mutationFn: () => certificatesService.revoke(id, reason.trim()),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['certificate', id] });
      setRevokeOpen(false);
    },
  });

  if (isLoading || !certificate) {
    return (
      <Text variant="body" color="muted" className="text-center py-16">
        Loading certificate…
      </Text>
    );
  }

  const verifyUrl = `${window.location.origin}/verify/${certificate.qrHash}`;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in space-y-5">
      <header>
        <div className="flex items-start justify-between gap-3 mb-1">
          <Text variant="h1" className="min-w-0">
            {certificate.templateName}
          </Text>
          <Badge variant={certificate.isRevoked ? 'danger' : 'success'} dot className="shrink-0">
            {certificate.isRevoked ? 'Revoked' : 'Valid'}
          </Badge>
        </div>
        <Text variant="body" color="muted">
          Issued to{' '}
          <Link
            to={`/staff/members/${certificate.memberId}`}
            className="font-member-name text-primary hover:underline"
          >
            {certificate.memberName}
          </Link>
        </Text>
      </header>

      {template && (
        <CertificateCanvas
          template={template}
          values={{
            member_name: certificate.memberName,
            date: formatDate(certificate.issuedAt),
            org_name: "St. Jude's Parish",
            serial: certificate.serialNumber,
            ...certificate.customValues,
          }}
          className={certificate.isRevoked ? 'opacity-50 grayscale' : undefined}
        />
      )}

      {certificate.isRevoked && (
        <Card variant="outline" padding="md" className="border-danger/40 bg-danger-light/40">
          <div className="flex items-start gap-3">
            <Ban size={20} className="text-danger shrink-0 mt-0.5" aria-hidden />
            <div>
              <Text variant="h3" className="mb-0.5">
                Revoked{certificate.revokedAt ? ` on ${formatDate(certificate.revokedAt)}` : ''}
              </Text>
              <Text variant="body-sm" color="muted">
                {certificate.revokedReason}
              </Text>
              <Text variant="caption" color="muted" className="block mt-2">
                Anyone scanning the QR code will now be told this certificate is not valid.
              </Text>
            </div>
          </div>
        </Card>
      )}

      {/* Provenance */}
      <Card variant="outline" padding="md" className="space-y-2.5">
        <div className="flex justify-between gap-3">
          <Text variant="body-sm" color="muted">
            Serial number
          </Text>
          <Text variant="body-sm" className="font-medium tabular-nums">
            {certificate.serialNumber}
          </Text>
        </div>
        <div className="flex justify-between gap-3">
          <Text variant="body-sm" color="muted">
            Issued
          </Text>
          <Text variant="body-sm" className="font-medium">
            {formatDate(certificate.issuedAt)}
          </Text>
        </div>
        <div className="flex justify-between gap-3">
          <Text variant="body-sm" color="muted">
            Issued by
          </Text>
          <Text variant="body-sm" className="font-medium">
            {certificate.issuedByName}
          </Text>
        </div>
      </Card>

      {/* Verification */}
      <Card padding="md">
        <div className="flex items-start gap-3">
          <QrCode size={20} className="text-primary shrink-0 mt-0.5" aria-hidden />
          <div className="min-w-0 flex-1">
            <Text variant="h3" className="mb-0.5">
              Public verification
            </Text>
            <Text variant="body-sm" color="muted" className="mb-2">
              Anyone can scan the printed code to confirm this is genuine — no account needed.
            </Text>
            <code className="block truncate rounded bg-slate-100 dark:bg-slate-800 px-2 py-1.5 text-body-sm text-slate-600 dark:text-slate-300">
              {verifyUrl}
            </code>
          </div>
        </div>
      </Card>

      <div className="flex gap-2">
        <Button variant="primary" fullWidth leftIcon={Download}>
          Download PDF
        </Button>
        <Button variant="secondary" leftIcon={Share2}>
          Share
        </Button>
      </div>

      {!certificate.isRevoked && (
        <Button variant="ghost" fullWidth leftIcon={Ban} onClick={() => setRevokeOpen(true)}>
          Revoke this certificate
        </Button>
      )}

      {isRevokeOpen && (
        <BottomSheet
          open
          onClose={() => setRevokeOpen(false)}
          title="Revoke certificate"
          description="This cannot be undone. The record is kept so verification can report it as revoked."
          footer={
            <Button
              variant="destructive"
              size="lg"
              fullWidth
              disabled={reason.trim().length === 0}
              isLoading={revoke.isPending}
              onClick={() => revoke.mutate()}
            >
              Revoke permanently
            </Button>
          }
        >
          <Input
            label="Reason"
            autoFocus
            placeholder="Issued against the wrong template"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Text variant="caption" color="muted" className="block mt-3">
            The reason is recorded in the audit log and shown to staff, never to the public.
          </Text>
        </BottomSheet>
      )}
    </div>
  );
}
