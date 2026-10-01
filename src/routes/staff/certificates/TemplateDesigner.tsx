/**
 * @file TemplateDesigner.tsx
 * @description Place each printed field on the certificate and style it.
 *
 * Positioning uses nudge controls rather than drag-and-drop: this is a desktop-
 * class task being done on a 390px phone, and a two-pixel drag on a touch screen
 * is not a precision instrument. Arrow buttons move by one percent, which is both
 * predictable and undoable.
 */
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Minus,
  Plus,
  Save,
} from 'lucide-react';
import type { CertificateTemplate } from '@/types';
import { certificatesService } from '@/services/certificatesService';
import { CertificateCanvas } from '@/components/certificates/CertificateCanvas';
import { MediaPicker } from '@/components/media/MediaPicker';
import { Button, Card, Input, Select, Text } from '@/components/ui';
import { cn } from '@/lib/cn';

const FONT_OPTIONS = [
  { value: 'Crimson Pro', label: 'Crimson Pro (serif)' },
  { value: 'DM Sans', label: 'DM Sans' },
];

const COLOR_OPTIONS = ['#1E293B', '#475569', '#4338CA', '#B45309', '#9F1239'];

/** Fields a certificate can print, beyond whatever the template already uses. */
const AVAILABLE_TOKENS = [
  { key: 'member_name', label: 'Recipient' },
  { key: 'date', label: 'Date' },
  { key: 'officiant', label: 'Officiant' },
  { key: 'org_name', label: 'Church' },
  { key: 'serial', label: 'Serial number' },
];

export function TemplateDesigner() {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const [draft, setDraft] = useState<CertificateTemplate | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const { isLoading } = useQuery({
    queryKey: ['certificate-template', id],
    queryFn: async () => {
      const template = await certificatesService.getTemplate(id);
      // Seeding on fetch keeps the editable copy separate from the cached one.
      setDraft(template);
      setSelectedKey(template.tokens[0]?.key ?? null);
      return template;
    },
    enabled: Boolean(id),
  });

  const save = useMutation({
    mutationFn: () => certificatesService.saveTemplate(draft!),
    onSuccess: () => navigate('/staff/certificates'),
  });

  if (isLoading || !draft) {
    return (
      <Text variant="body" color="muted" className="text-center py-16">
        Loading template…
      </Text>
    );
  }

  const selected = draft.tokens.find((t) => t.key === selectedKey);

  function updateToken(key: string, changes: Partial<CertificateTemplate['tokens'][number]>) {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            tokens: prev.tokens.map((t) => (t.key === key ? { ...t, ...changes } : t)),
          }
        : prev,
    );
  }

  function nudge(axis: 'x' | 'y', delta: number) {
    if (!selected) return;
    updateToken(selected.key, {
      [axis]: Math.min(98, Math.max(2, selected[axis] + delta)),
    });
  }

  function addToken(key: string, label: string) {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            tokens: [
              ...prev.tokens,
              { key, label, x: 50, y: 50, fontSize: 18, fontFamily: 'DM Sans', color: '#1E293B' },
            ],
          }
        : prev,
    );
    setSelectedKey(key);
  }

  const unusedTokens = AVAILABLE_TOKENS.filter(
    (t) => !draft.tokens.some((existing) => existing.key === t.key),
  );

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 animate-fade-in space-y-5">
      <header>
        <Text variant="h1" className="mb-1">
          Design template
        </Text>
        <Text variant="body" color="muted">
          Tap a field on the certificate to move or restyle it.
        </Text>
      </header>

      <Input
        label="Template name"
        value={draft.name}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
      />

      <CertificateCanvas
        template={draft}
        selectedTokenKey={selectedKey ?? undefined}
        onSelectToken={setSelectedKey}
      />

      <MediaPicker
        kind="image"
        label="Upload background artwork"
        onSelect={(asset) => setDraft({ ...draft, backgroundImageUrl: asset.url })}
      />

      {/* Field editor */}
      {selected ? (
        <Card padding="md" className="space-y-4">
          <div className="flex items-center justify-between">
            <Text variant="h3">{selected.label}</Text>
            <Text variant="caption" color="muted" className="tabular-nums">
              {Math.round(selected.x)}% · {Math.round(selected.y)}%
            </Text>
          </div>

          {/* Nudge pad */}
          <div>
            <Text variant="label" color="muted" className="mb-2 block">
              Position
            </Text>
            <div className="grid grid-cols-3 gap-2 max-w-[180px] mx-auto">
              <span />
              <Button variant="secondary" onClick={() => nudge('y', -1)} aria-label="Move up">
                <ChevronUp size={18} />
              </Button>
              <span />
              <Button variant="secondary" onClick={() => nudge('x', -1)} aria-label="Move left">
                <ChevronLeft size={18} />
              </Button>
              <Button
                variant="ghost"
                onClick={() => updateToken(selected.key, { x: 50, y: selected.y })}
                aria-label="Centre horizontally"
              >
                <span className="text-caption">Centre</span>
              </Button>
              <Button variant="secondary" onClick={() => nudge('x', 1)} aria-label="Move right">
                <ChevronRight size={18} />
              </Button>
              <span />
              <Button variant="secondary" onClick={() => nudge('y', 1)} aria-label="Move down">
                <ChevronDown size={18} />
              </Button>
              <span />
            </div>
          </div>

          {/* Size */}
          <div>
            <Text variant="label" color="muted" className="mb-2 block">
              Size
            </Text>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  updateToken(selected.key, { fontSize: Math.max(8, selected.fontSize - 2) })
                }
                aria-label="Smaller"
              >
                <Minus size={16} />
              </Button>
              <span className="flex-1 text-center text-body tabular-nums">
                {selected.fontSize}px
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  updateToken(selected.key, { fontSize: Math.min(64, selected.fontSize + 2) })
                }
                aria-label="Larger"
              >
                <Plus size={16} />
              </Button>
            </div>
          </div>

          <Select
            label="Font"
            value={selected.fontFamily}
            onChange={(e) => updateToken(selected.key, { fontFamily: e.target.value })}
            options={FONT_OPTIONS}
          />

          <div>
            <Text variant="label" color="muted" className="mb-2 block">
              Colour
            </Text>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => updateToken(selected.key, { color })}
                  aria-label={`Colour ${color}`}
                  aria-pressed={selected.color === color}
                  className={cn(
                    'size-9 rounded-full transition-transform',
                    selected.color === color
                      ? 'scale-110 ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-background-dark'
                      : 'hover:scale-105',
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </Card>
      ) : (
        <Card variant="flat" padding="md">
          <Text variant="body" color="muted">
            Add a field below, then tap it on the certificate to position it.
          </Text>
        </Card>
      )}

      {/* Add fields */}
      {unusedTokens.length > 0 && (
        <div>
          <Text variant="label" color="muted" className="mb-2 block">
            Add a field
          </Text>
          <div className="flex flex-wrap gap-2">
            {unusedTokens.map((token) => (
              <Button
                key={token.key}
                variant="secondary"
                size="sm"
                leftIcon={Plus}
                onClick={() => addToken(token.key, token.label)}
              >
                {token.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      <Button
        variant="primary"
        size="lg"
        fullWidth
        leftIcon={Save}
        isLoading={save.isPending}
        onClick={() => save.mutate()}
      >
        Save template
      </Button>
    </div>
  );
}
