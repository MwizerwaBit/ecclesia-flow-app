/**
 * @file DocumentLibrary.tsx
 * @description Files attached to the organisation — photos, documents, exports.
 *
 * Exports are listed alongside uploads because a generated statement pack is a
 * file someone will come looking for, and hiding it in a different screen is how
 * it gets regenerated three times.
 */
import { useMemo, useState } from 'react';
import { FileSpreadsheet, FileText, Image as ImageIcon, Search, Upload } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Fab, Input, SegmentedControl, Text } from '@/components/ui';
import { formatRelative } from '@/lib/formatters';

type FileKind = 'document' | 'photo' | 'export';
type Filter = 'all' | FileKind;

interface StoredFile {
  id: string;
  name: string;
  kind: FileKind;
  sizeKb: number;
  uploadedBy: string;
  uploadedAt: string;
}

const MOCK_FILES: StoredFile[] = [
  { id: 'f1', name: 'Safeguarding policy 2024.pdf', kind: 'document', sizeKb: 412, uploadedBy: 'Sarah Thompson', uploadedAt: '2024-10-18T10:00:00Z' },
  { id: 'f2', name: 'Harvest service programme.pdf', kind: 'document', sizeKb: 188, uploadedBy: 'James King', uploadedAt: '2024-10-20T14:30:00Z' },
  { id: 'f3', name: 'Contribution statements 2023.zip', kind: 'export', sizeKb: 8420, uploadedBy: 'Katherine Lee', uploadedAt: '2024-01-08T09:15:00Z' },
  { id: 'f4', name: 'Directory export Oct 2024.csv', kind: 'export', sizeKb: 46, uploadedBy: 'Sarah Thompson', uploadedAt: '2024-10-21T18:02:00Z' },
  { id: 'f5', name: 'Baptism service 2024-06.jpg', kind: 'photo', sizeKb: 2240, uploadedBy: 'Grace Hill', uploadedAt: '2024-06-16T16:00:00Z' },
  { id: 'f6', name: 'Youth camp group photo.jpg', kind: 'photo', sizeKb: 3180, uploadedBy: 'Grace Hill', uploadedAt: '2024-08-12T11:20:00Z' },
  { id: 'f7', name: 'Annual accounts 2023.pdf', kind: 'document', sizeKb: 964, uploadedBy: 'Katherine Lee', uploadedAt: '2024-03-02T13:40:00Z' },
];

const KIND_META: Record<FileKind, { icon: typeof FileText; label: string; variant: 'info' | 'primary' | 'neutral' }> = {
  document: { icon: FileText, label: 'Document', variant: 'info' },
  photo: { icon: ImageIcon, label: 'Photo', variant: 'primary' },
  export: { icon: FileSpreadsheet, label: 'Export', variant: 'neutral' },
};

function formatSize(sizeKb: number): string {
  return sizeKb >= 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;
}

export function DocumentLibrary() {
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MOCK_FILES.filter((file) => (filter === 'all' ? true : file.kind === filter)).filter(
      (file) => (q ? file.name.toLowerCase().includes(q) : true),
    ).sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  }, [filter, query]);

  const totalMb = MOCK_FILES.reduce((sum, f) => sum + f.sizeKb, 0) / 1024;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 animate-fade-in">
      <header className="mb-5">
        <Text variant="h1" className="mb-1">
          Documents
        </Text>
        <Text variant="body" color="muted">
          {MOCK_FILES.length} files · {totalMb.toFixed(1)} MB used
        </Text>
      </header>

      <Input
        type="search"
        placeholder="Search files"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        leftIcon={Search}
        className="mb-4"
      />

      <SegmentedControl
        label="File type"
        value={filter}
        onChange={setFilter}
        size="sm"
        className="mb-5"
        options={[
          { value: 'all', label: 'All' },
          { value: 'document', label: 'Documents' },
          { value: 'photo', label: 'Photos' },
          { value: 'export', label: 'Exports' },
        ]}
      />

      {visible.length === 0 && (
        <EmptyState
          icon={Upload}
          title={query ? 'Nothing matches that' : 'No files here yet'}
          description={
            query
              ? 'Try part of the file name.'
              : 'Policies, programmes, photos and generated exports all live here.'
          }
        />
      )}

      <Card padding="none" className="divide-y divide-slate-100 dark:divide-slate-800">
        {visible.map((file) => {
          const meta = KIND_META[file.kind];
          const Icon = meta.icon;

          return (
            <button
              key={file.id}
              type="button"
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                <Icon size={18} className="text-slate-500" aria-hidden />
              </div>

              <div className="min-w-0 flex-1">
                <Text variant="body" className="truncate">
                  {file.name}
                </Text>
                <Text variant="caption" color="muted">
                  {formatSize(file.sizeKb)} · {file.uploadedBy} · {formatRelative(file.uploadedAt)}
                </Text>
              </div>

              <Badge variant={meta.variant} size="sm" className="shrink-0">
                {meta.label}
              </Badge>
            </button>
          );
        })}
      </Card>

      <Button variant="secondary" fullWidth leftIcon={Upload} className="mt-5">
        Upload a file
      </Button>

      <Fab icon={Upload} label="Upload" />
    </div>
  );
}
