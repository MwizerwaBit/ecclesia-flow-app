/**
 * @file CertificateVerification.tsx
 * @description /verify/:hash — what someone sees after scanning a printed QR code.
 *
 * No login, no branding of ours competing with the church's, and a verdict
 * legible at arm's length. A revoked certificate says so plainly rather than
 * pretending not to exist — a registrar checking a baptism record needs the
 * difference between "forged" and "withdrawn".
 */
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { BadgeCheck, Printer, ShieldAlert, ShieldX } from 'lucide-react';
import { certificatesService } from '@/services/certificatesService';
import { printPage } from '@/lib/download';
import { Button, Card, Text } from '@/components/ui';
import { formatDate } from '@/lib/formatters';

export function CertificateVerification() {
  const { hash = '' } = useParams();

  const { data: certificate, isLoading } = useQuery({
    queryKey: ['verify', hash],
    queryFn: () => certificatesService.verify(hash),
    enabled: Boolean(hash),
  });

  if (isLoading) {
    return (
      <Text variant="body" color="muted" className="text-center py-20">
        Checking this certificate…
      </Text>
    );
  }

  // Not found — most likely a mistyped code, but possibly a forgery.
  if (!certificate) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center animate-fade-in">
        <div className="mb-5 flex size-20 items-center justify-center rounded-full bg-danger-light">
          <ShieldX size={40} className="text-danger" aria-hidden />
        </div>
        <Text variant="h2" className="mb-2">
          No record of this certificate
        </Text>
        <Text variant="body" color="muted" className="max-w-sm">
          Nothing on EcclesiaFlow matches this code. Check it was scanned or typed correctly — if it
          was, this document was not issued through us.
        </Text>
        <code className="mt-4 rounded bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-body-sm text-slate-500">
          {hash}
        </code>
      </div>
    );
  }

  const isValid = !certificate.isRevoked;

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-12 animate-fade-in">
      {/* The verdict, unmissable */}
      <div className="flex flex-col items-center text-center mb-8">
        <div
          className={`mb-5 flex size-20 items-center justify-center rounded-full ${
            isValid ? 'bg-success-light' : 'bg-warning-light'
          }`}
        >
          {isValid ? (
            <BadgeCheck size={40} className="text-success" aria-hidden />
          ) : (
            <ShieldAlert size={40} className="text-warning" aria-hidden />
          )}
        </div>

        <Text variant="h1" className="mb-2">
          {isValid ? 'Genuine' : 'Withdrawn'}
        </Text>

        <Text variant="body" color="muted" className="max-w-sm">
          {isValid
            ? 'This certificate was issued by the church named below and has not been withdrawn.'
            : 'This certificate was genuinely issued, but the issuing church has since withdrawn it.'}
        </Text>
      </div>

      {/* The record */}
      <Card padding="lg" className="space-y-4">
        <div>
          <Text variant="label" color="muted" className="mb-1 block">
            Issued to
          </Text>
          <p className="font-member-name text-h2 text-slate-900 dark:text-slate-100">
            {certificate.memberName}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div>
            <Text variant="label" color="muted" className="mb-1 block">
              Certificate
            </Text>
            <Text variant="body">{certificate.templateName}</Text>
          </div>
          <div>
            <Text variant="label" color="muted" className="mb-1 block">
              Issued
            </Text>
            <Text variant="body">{formatDate(certificate.issuedAt)}</Text>
          </div>
          <div>
            <Text variant="label" color="muted" className="mb-1 block">
              By
            </Text>
            <Text variant="body">St. Jude&rsquo;s Parish</Text>
          </div>
          <div>
            <Text variant="label" color="muted" className="mb-1 block">
              Serial
            </Text>
            <Text variant="body" className="tabular-nums">
              {certificate.serialNumber}
            </Text>
          </div>
        </div>

        {!isValid && certificate.revokedAt && (
          <div className="rounded-lg bg-warning-light px-3 py-2.5">
            <Text variant="body-sm" className="text-warning font-medium">
              Withdrawn on {formatDate(certificate.revokedAt)}
            </Text>
            <Text variant="caption" className="text-warning/90">
              Contact the issuing church if you need to know why.
            </Text>
          </div>
        )}
      </Card>

      <Button variant="secondary" fullWidth leftIcon={Printer} className="mt-5" onClick={printPage}>
        Print this confirmation
      </Button>

      <Text variant="caption" color="muted" className="block text-center mt-6">
        Verified through EcclesiaFlow. No personal data beyond what is printed on the certificate is
        shown here.
      </Text>
    </div>
  );
}
