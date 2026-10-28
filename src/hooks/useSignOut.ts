/**
 * @file useSignOut.ts
 * @description Ends the session, then goes to the right sign-in screen.
 * Used by the account menu, the phone drawer and the account page, so signing
 * out behaves the same from all of them.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/hooks/useAuthStore';

export function useSignOut(loginPath = '/login') {
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);

  const signOut = async () => {
    setPending(true);
    try {
      await logout();
    } finally {
      setPending(false);
      navigate(loginPath, { replace: true });
    }
  };
  return { signOut, pending };
}
