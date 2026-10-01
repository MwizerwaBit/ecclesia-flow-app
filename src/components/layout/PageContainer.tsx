/**
 * @file PageContainer.tsx
 * @description Constrains main content width and manages safe-area padding.
 */
import { type ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/cn';

interface PageContainerProps extends ComponentPropsWithoutRef<'main'> {
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  withBottomTab?: boolean;
}

const maxWidthClasses = {
  sm: 'max-w-md mx-auto',
  md: 'max-w-2xl mx-auto',
  lg: 'max-w-5xl mx-auto',
  xl: 'max-w-7xl mx-auto',
  full: 'w-full',
};

export function PageContainer({
  maxWidth = 'md', // Default to md (max-w-2xl) which fits forms and detail views well
  withBottomTab = false,
  className,
  children,
  ...props
}: PageContainerProps) {
  return (
    <main 
      className={cn(
        'w-full px-4 py-6 md:px-8',
        maxWidthClasses[maxWidth],
        withBottomTab ? 'pb-tab-content-pb lg:pb-8' : 'pb-8',
        className
      )}
      {...props}
    >
      {children}
    </main>
  );
}
