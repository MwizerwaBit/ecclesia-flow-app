/**
 * @file ChooseChurch.tsx
 * @description The front door before the front door — find your church, then
 * land on its own page.
 *
 * Visitor → choose church → church-specific landing page. Search is a plain
 * substring match today because that's what the data supports; a real
 * directory would add location-based ranking without this screen changing.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChevronRight, MapPin, Search } from 'lucide-react';
import { churchDirectoryService } from '@/services/churchDirectoryService';
import { Card, EmptyState, Input, Skeleton, Text } from '@/components/ui';

export function ChooseChurch() {
  const [query, setQuery] = useState('');

  const { data: churches = [], isLoading } = useQuery({
    queryKey: ['public', 'churches', query],
    queryFn: () => churchDirectoryService.search(query),
  });

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-12 animate-fade-in">
      <header className="text-center mb-8">
        <Text variant="h1" className="mb-2">
          Find your church
        </Text>
        <Text variant="body-lg" color="muted">
          Search by name or country to see what&rsquo;s happening there.
        </Text>
      </header>

      <Input
        type="search"
        placeholder="Search churches"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        leftIcon={Search}
        className="mb-6 [&_input]:h-12"
        autoFocus
      />

      {isLoading && (
        <div className="space-y-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && churches.length === 0 && (
        <EmptyState
          icon={MapPin}
          title="No churches match that search"
          description="Try a different name, or check the spelling."
        />
      )}

      <div className="space-y-2.5">
        {churches.map((church) => (
          <Link key={church.slug} to={`/c/${church.slug}`}>
            <Card padding="md" variant="elevated" className="flex items-center gap-3 hover:shadow-md transition-shadow">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-light dark:bg-primary/15 font-display text-h3 text-primary">
                {church.displayName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <Text variant="body" className="font-medium truncate">
                  {church.displayName}
                </Text>
                <Text variant="caption" color="muted" className="flex items-center gap-1">
                  <MapPin size={11} aria-hidden /> {church.country}
                </Text>
              </div>
              <ChevronRight size={18} className="text-slate-300 shrink-0" aria-hidden />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
