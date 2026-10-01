/**
 * @file DevRoleSwitcher.tsx
 * @description Floating UI for developers to easily swap between user roles.
 * Only renders in development mode.
 */
import { useState } from 'react';
import { useAuthStore } from '@/hooks/useAuthStore';
import { authService } from '@/services/authService';

export function DevRoleSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const { session, setSession, logout } = useAuthStore();
  
  if (import.meta.env.PROD) return null;

  const currentRole = session?.user?.role || 'Logged out';

  const switchRole = async (roleKey: 'member' | 'staff' | 'board' | 'platform_admin') => {
    const newSession = await authService.loginWithRole(roleKey);
    setSession(newSession);
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-20 right-4 z-[100] font-sans">
      {isOpen ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl p-3 w-48 text-sm">
          <div className="font-bold mb-2 text-slate-800 dark:text-slate-200 px-2 flex justify-between">
            <span>Dev Tools</span>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
          </div>
          <div className="space-y-1">
            <button onClick={() => switchRole('member')} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">Member</button>
            <button onClick={() => switchRole('staff')} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">Staff</button>
            <button onClick={() => switchRole('board')} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">Board Admin</button>
            <button onClick={() => switchRole('platform_admin')} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">Platform Admin</button>
            <hr className="my-1 border-slate-200 dark:border-slate-700" />
            <button onClick={() => { logout(); setIsOpen(false); }} className="w-full text-left px-2 py-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 rounded">Logout</button>
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-indigo-600 text-white rounded-full px-4 py-2 shadow-lg text-xs font-bold uppercase tracking-wider opacity-80 hover:opacity-100 transition-opacity"
        >
          Dev: {currentRole}
        </button>
      )}
    </div>
  );
}
