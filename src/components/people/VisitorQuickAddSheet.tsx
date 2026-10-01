/**
 * @file VisitorQuickAddSheet.tsx
 * @description US-025 — thirty seconds, one hand, during a service.
 *
 * Three fields, and only the first name is required. Anything more is a reason
 * to put the phone away and not capture the visitor at all. The rest of the
 * record gets filled in from the follow-up list later in the week.
 */
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import type { MemberListItem } from '@/types';
import { membersService } from '@/services/membersService';
import { BottomSheet, Button, Input, Text } from '@/components/ui';

interface VisitorQuickAddSheetProps {
  open: boolean;
  onClose: () => void;
  /** Fired with the created record so the calling list can show it immediately. */
  onAdded?: (visitor: MemberListItem) => void;
}

export function VisitorQuickAddSheet({ open, onClose, onAdded }: VisitorQuickAddSheetProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [addedName, setAddedName] = useState<string | null>(null);

  function reset() {
    setFirstName('');
    setLastName('');
    setPhone('');
    setAddedName(null);
  }

  const quickAdd = useMutation({
    mutationFn: () =>
      membersService.quickAddVisitor({
        firstName: firstName.trim(),
        lastName: lastName.trim() || '—',
        phone: phone.trim() || undefined,
      }),
    onSuccess: (visitor) => {
      onAdded?.(visitor);
      setAddedName(firstName.trim());
      setFirstName('');
      setLastName('');
      setPhone('');
    },
  });

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <BottomSheet
      open={open}
      onClose={handleClose}
      title="Add a visitor"
      description="Just a name is enough. Details can wait until the week."
      footer={
        <div className="space-y-2">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={!firstName.trim()}
            isLoading={quickAdd.isPending}
            onClick={() => quickAdd.mutate()}
          >
            Add to follow-up queue
          </Button>
          <Button variant="ghost" fullWidth size="sm" onClick={handleClose}>
            Done
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {addedName && (
          <div className="flex items-center gap-2 rounded-lg bg-success-light px-3 py-2.5 animate-fade-in">
            <Check size={18} className="text-success shrink-0" aria-hidden />
            <Text variant="body-sm" className="text-success">
              {addedName} is in the queue — add another if you need to.
            </Text>
          </div>
        )}

        <Input
          label="First name"
          autoFocus
          autoComplete="given-name"
          placeholder="Required"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
        <Input
          label="Last name"
          autoComplete="family-name"
          placeholder="Optional"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
        <Input
          label="Phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="Optional"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
    </BottomSheet>
  );
}
