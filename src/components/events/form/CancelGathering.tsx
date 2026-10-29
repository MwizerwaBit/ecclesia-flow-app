/**
 * @file CancelGathering.tsx
 * @description "Cancel this gathering", behind a confirmation.
 *
 * Canceling keeps the record and its attendance, so the gathering still shows in
 * history and reports. It cancels the whole series, every date, which is why it
 * asks first. Needs the API: in demo mode the sheet explains that.
 */
import { useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Ban } from 'lucide-react';
import { eventsService } from '@/services/eventsService';
import { BottomSheet, Button } from '@/components/ui';
import { ErrorNotice } from '@/components/feedback/ErrorNotice';

interface CancelGatheringProps {
  eventId: string;
  title: string;
  /** A repeating gathering: say that every date goes. */
  isRecurring: boolean;
}

export function CancelGathering({ eventId, title, isRecurring }: CancelGatheringProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const cancel = useMutation({
    mutationFn: () => eventsService.cancel(eventId),
    meta: { inline: true },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['events'] }),
        queryClient.invalidateQueries({ queryKey: ['event', eventId] }),
      ]);
      navigate(`/staff/events/${eventId}`);
    },
  });

  const { isPending, reset } = cancel;
  const close = useCallback(() => {
    if (isPending) return;
    reset();
    setOpen(false);
  }, [isPending, reset]);

  return (
    <>
      <Button type="button" variant="ghost" fullWidth leftIcon={Ban} onClick={() => setOpen(true)}>
        Cancel this gathering
      </Button>

      <BottomSheet
        open={open}
        onClose={close}
        title="Cancel this gathering?"
        description={`“${title}” will be canceled${isRecurring ? ' for the whole series, every date' : ''}. It stays in your records and attendance history, but people can no longer see it. This can’t be undone.`}
        footer={
          <div className="flex flex-col-reverse gap-2 xl:flex-row xl:justify-end">
            <Button type="button" variant="secondary" onClick={close} disabled={cancel.isPending}>
              Keep it
            </Button>
            <Button type="button" variant="destructive" isLoading={cancel.isPending} onClick={() => cancel.mutate()}>
              Cancel the gathering
            </Button>
          </div>
        }
      >
        {cancel.isError ? <ErrorNotice error={cancel.error} /> : null}
      </BottomSheet>
    </>
  );
}
