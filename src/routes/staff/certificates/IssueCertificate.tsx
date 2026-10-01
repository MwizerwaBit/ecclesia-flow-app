/**
 * @file IssueCertificate.tsx
 * @description Pick a template, pick a person, see it, issue it.
 *
 * The preview is rendered with the real values before issuing because a
 * certificate is a printed artefact — a misspelled name is discovered at the
 * ceremony, not in a database.
 */
import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Award, Check, Search, Send } from 'lucide-react';
import { certificatesService } from '@/services/certificatesService';
import { membersService } from '@/services/membersService';
import { CertificateCanvas } from '@/components/certificates/CertificateCanvas';
import { Avatar, Button, Card, Input, Select, Text } from '@/components/ui';
import { formatDate } from '@/lib/formatters';

export function IssueCertificate() {
  const navigate = useNavigate();

  const [templateId, setTemplateId] = useState('');
  const [memberQuery, setMemberQuery] = useState('');
  const [memberId, setMemberId] = useState<string | null>(null);
  const [officiant, setOfficiant] = useState('');

  const { data: templates = [] } = useQuery({
    queryKey: ['certificate-templates', 'active'],
    queryFn: () => certificatesService.listTemplates(),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members', 'roster'],
    queryFn: () => membersService.list(),
  });

  const issuable = templates.filter((t) => t.status === 'active');
  const activeTemplateId = templateId || issuable[0]?.id || '';
  const template = issuable.find((t) => t.id === activeTemplateId);
  const member = members.find((m) => m.id === memberId);

  const matches = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    if (!q || memberId) return [];
    return members
      .filter((m) => `${m.firstName} ${m.lastName}`.toLowerCase().includes(q))
      .slice(0, 5);
  }, [memberQuery, members, memberId]);

  // What the certificate will actually print.
  const values = useMemo(
    () => ({
      member_name: member ? `${member.firstName} ${member.lastName}` : '',
      date: formatDate(new Date()),
      officiant,
      org_name: "St. Jude's Parish",
      serial: 'Assigned on issue',
    }),
    [member, officiant],
  );

  const issue = useMutation({
    mutationFn: () =>
      certificatesService.issue({
        templateId: activeTemplateId,
        memberId: member!.id,
        memberName: `${member!.firstName} ${member!.lastName}`,
        customValues: { officiant },
      }),
    onSuccess: (certificate) => navigate(`/staff/certificates/issued/${certificate.id}`),
  });

  const needsOfficiant = template?.tokens.some((t) => t.key === 'officiant') ?? false;
  const canIssue = Boolean(member && template) && (!needsOfficiant || officiant.trim().length > 0);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in space-y-5">
      <header>
        <Text variant="h1" className="mb-1">
          Issue a certificate
        </Text>
        <Text variant="body" color="muted">
          Check the spelling before you issue — this one gets framed.
        </Text>
      </header>

      <Select
        label="Template"
        value={activeTemplateId}
        onChange={(e) => setTemplateId(e.target.value)}
        options={issuable.map((t) => ({ value: t.id, label: t.name }))}
      />

      {/* Recipient */}
      <div className="relative">
        <Input
          label="Recipient"
          leftIcon={Search}
          placeholder="Search members by name"
          value={member ? `${member.firstName} ${member.lastName}` : memberQuery}
          onChange={(e) => {
            setMemberId(null);
            setMemberQuery(e.target.value);
          }}
        />

        {matches.length > 0 && (
          <Card
            padding="none"
            className="absolute z-dropdown mt-1 w-full divide-y divide-slate-100 dark:divide-slate-800"
          >
            {matches.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setMemberId(m.id);
                  setMemberQuery('');
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
              >
                <Avatar
                  src={m.photoUrl}
                  name={`${m.firstName} ${m.lastName}`}
                  size="sm"
                  className="shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-member-name text-body-lg truncate text-slate-900 dark:text-slate-100">
                    {m.firstName} {m.lastName}
                  </p>
                  <Text variant="caption" color="muted">
                    {m.unitName ?? 'No group'}
                  </Text>
                </div>
              </button>
            ))}
          </Card>
        )}
      </div>

      {needsOfficiant && (
        <Input
          label="Officiant"
          placeholder="Rev. David Morrison"
          value={officiant}
          onChange={(e) => setOfficiant(e.target.value)}
        />
      )}

      {/* Preview */}
      {template && (
        <div>
          <Text variant="label" color="muted" className="mb-2 block">
            Preview
          </Text>
          <CertificateCanvas template={template} values={values} />
          {!member && (
            <Text variant="caption" color="muted" className="block mt-2 text-center">
              Choose a recipient to see their name in place.
            </Text>
          )}
        </div>
      )}

      {member && (
        <div className="flex items-center gap-2">
          <Check size={16} className="text-success" aria-hidden />
          <Text variant="body-sm" className="text-success">
            Will be issued to {member.firstName} {member.lastName} and added to their record.
          </Text>
        </div>
      )}

      <Button
        variant="primary"
        size="lg"
        fullWidth
        leftIcon={Send}
        disabled={!canIssue}
        isLoading={issue.isPending}
        onClick={() => issue.mutate()}
      >
        Issue certificate
      </Button>

      <Button
        variant="ghost"
        fullWidth
        leftIcon={Award}
        onClick={() => navigate('/staff/certificates/bulk-issue')}
      >
        Issue to several people instead
      </Button>
    </div>
  );
}
