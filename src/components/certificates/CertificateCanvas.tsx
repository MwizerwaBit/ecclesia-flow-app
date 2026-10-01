/**
 * @file CertificateCanvas.tsx
 * @description Renders a certificate template at any size, from designer to preview.
 *
 * Token positions are stored as percentages so one component serves the designer
 * canvas, the issue preview and the public verification page without three
 * separate layout implementations drifting apart.
 */
import { type CSSProperties } from 'react';
import type { CertificateTemplate } from '@/types';
import { cn } from '@/lib/cn';

interface CertificateCanvasProps {
  template: CertificateTemplate;
  /** Values substituted for each token key; the token label shows when absent. */
  values?: Record<string, string>;
  /** Token currently being edited in the designer. */
  selectedTokenKey?: string;
  onSelectToken?: (key: string) => void;
  className?: string;
}

export function CertificateCanvas({
  template,
  values = {},
  selectedTokenKey,
  onSelectToken,
  className,
}: CertificateCanvasProps) {
  const isInteractive = Boolean(onSelectToken);

  return (
    <div
      className={cn(
        'relative aspect-[1.414/1] w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-[#FFFDF7]',
        className,
      )}
      style={{
        // Token font sizes are expressed in cqw, so this element must be the
        // query container. That is what lets one component serve the small
        // template card and the full-page preview from the same coordinates.
        containerType: 'inline-size',
        ...(template.backgroundImageUrl
          ? {
              backgroundImage: `url(${template.backgroundImageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : {}),
      }}
    >
      {/* Default ornamental border when no artwork has been uploaded */}
      {!template.backgroundImageUrl && (
        <div className="absolute inset-3 rounded-lg border-2 border-double border-accent-gold/40" />
      )}

      {template.tokens.map((token) => {
        // Font sizes are authored against a 1000px-wide certificate and scale with it.
        const style: CSSProperties = {
          left: `${token.x}%`,
          top: `${token.y}%`,
          fontSize: `${token.fontSize / 10}cqw`,
          fontFamily: token.fontFamily,
          color: token.color,
        };

        const content = values[token.key] ?? `{${token.label}}`;
        const isPlaceholder = !values[token.key];

        return isInteractive ? (
          <button
            key={token.key}
            type="button"
            onClick={() => onSelectToken?.(token.key)}
            style={style}
            className={cn(
              'absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded px-1 transition-all',
              'hover:ring-1 hover:ring-primary/50',
              selectedTokenKey === token.key && 'ring-2 ring-primary bg-primary/5',
              isPlaceholder && 'opacity-60',
            )}
          >
            {content}
          </button>
        ) : (
          <span
            key={token.key}
            style={style}
            className={cn(
              'absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap',
              isPlaceholder && 'opacity-40',
            )}
          >
            {content}
          </span>
        );
      })}

      {/* QR code placeholder — the real code is rendered server-side into the PDF */}
      {template.qrCodePosition && (
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 grid place-items-center rounded bg-slate-900/90"
          style={{
            left: `${template.qrCodePosition.x}%`,
            top: `${template.qrCodePosition.y}%`,
            width: '9%',
            aspectRatio: '1',
          }}
        >
          <div className="grid grid-cols-3 gap-[2px] p-[15%]">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className={cn('aspect-square', i % 3 === 1 ? 'bg-slate-900' : 'bg-white')}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
