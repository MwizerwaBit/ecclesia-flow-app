/**
 * @file CertificateTemplates.tsx
 * @description The template library, as a grid of what each certificate looks like.
 *
 * Templates are shown rendered rather than as names in a list — nobody recognises
 * "Certificate of Confirmation v2" from its title, but everybody recognises the
 * document. Archived templates stay visible under their own tab because previously
 * issued certificates still reference them.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Award, Plus, Send } from 'lucide-react';
import type { CertificateTemplate } from '@/types';
import { certificatesService } from '@/services/certificatesService';
import { CertificateCanvas } from '@/components/certificates/CertificateCanvas';
import { Badge, Button, Card, EmptyState, Fab, FilterChips, Text } from '@/components/ui';

type Category = 'all' | CertificateTemplate['category'];

const CATEGORIES: Array<{ value: Category; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'sacramental', label: 'Sacramental' },
  { value: 'membership', label: 'Membership' },
  { value: 'recognition', label: 'Recognition' },
  { value: 'education', label: 'Education' },
];

const STATUS_BADGE: Record<
  CertificateTemplate['status'],
  { variant: 'success' | 'neutral' | 'warning'; label: string }
> = {
  active: { variant: 'success', label: 'Active' },
  draft: { variant: 'warning', label: 'Draft' },
  archived: { variant: 'neutral', label: 'Archived' },
};

export function CertificateTemplates() {
  const [category, setCategory] = useState<Category>('all');

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['certificate-templates', category],
    queryFn: () => certificatesService.listTemplates(category === 'all' ? undefined : category),
  });

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 animate-fade-in">
      <header className="mb-5">
        <Text variant="h1" className="mb-1">
          Certificates
        </Text>
        <Text variant="body" color="muted">
          Templates your church can issue, verify and reprint.
        </Text>
      </header>

      <FilterChips
        label="Template category"
        value={category}
        onChange={setCategory}
        options={CATEGORIES}
        className="mb-5"
      />

      <div className="flex gap-2 mb-6">
        <Link to="/staff/certificates/issue" className="flex-1">
          <Button variant="primary" fullWidth leftIcon={Send}>
            Issue a certificate
          </Button>
        </Link>
        <Link to="/staff/certificates/bulk-issue">
          <Button variant="secondary">Bulk issue</Button>
        </Link>
      </div>

      {isLoading && (
        <Text variant="body" color="muted" className="text-center py-10">
          Loading templates…
        </Text>
      )}

      {!isLoading && templates.length === 0 && (
        <EmptyState
          icon={Award}
          title="No templates in this category"
          description="A template defines the artwork and where each detail is printed."
          action={
            <Link to="/staff/certificates/templates/ct1/design">
              <Button variant="primary" leftIcon={Plus}>
                Create a template
              </Button>
            </Link>
          }
        />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {templates.map((template) => {
          const badge = STATUS_BADGE[template.status];

          return (
            <Card key={template.id} padding="none" variant="elevated">
              <Link
                to={`/staff/certificates/templates/${template.id}/design`}
                className="block p-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <CertificateCanvas template={template} className="mb-3" />

                <div className="flex items-start justify-between gap-2 px-1 pb-1">
                  <div className="min-w-0">
                    <Text variant="h3" className="truncate">
                      {template.name}
                    </Text>
                    <Text variant="caption" color="muted" className="capitalize">
                      {template.category} · {template.tokens.length} fields
                    </Text>
                  </div>
                  <Badge variant={badge.variant} size="sm" className="shrink-0">
                    {badge.label}
                  </Badge>
                </div>
              </Link>
            </Card>
          );
        })}
      </div>

      <Fab icon={Plus} label="New template" />
    </div>
  );
}
