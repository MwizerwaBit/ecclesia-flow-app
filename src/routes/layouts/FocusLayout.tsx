/**
 * @file FocusLayout.tsx
 * @description A header and then the screen, nothing else: for onboarding and
 * checkout, which have their own full-page content but must still show where
 * you are and offer a way home and the theme toggle.
 */
import { Outlet } from 'react-router-dom';
import { SiteHeader } from '@/components/layout';

export function FocusLayout() {
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <SiteHeader />
      <Outlet />
    </div>
  );
}
