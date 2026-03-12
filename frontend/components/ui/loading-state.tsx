import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  /** Loading message to display */
  message?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show as overlay (absolute positioning) */
  overlay?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Loading state component with spinner and optional message
 * Implements WCAG 2.1 AA with aria-busy and screen reader announcements
 */
export function LoadingState({
  message = 'Loading...',
  size = 'md',
  overlay = false,
  className,
}: LoadingStateProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3',
        overlay && 'absolute inset-0 bg-background/80 backdrop-blur-sm z-10',
        !overlay && 'p-8',
        className
      )}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <Loader2 
        className={cn('animate-spin text-primary', sizeClasses[size])} 
        aria-hidden="true"
      />
      <p className={cn('text-muted-foreground', textSizeClasses[size])}>
        {message}
      </p>
      {/* Screen reader only announcement */}
      <span className="sr-only">{message}</span>
    </div>
  );
}

/**
 * Skeleton loading placeholder for content
 */
export function LoadingSkeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      aria-hidden="true"
      {...props}
    />
  );
}

/**
 * Card skeleton for loading competition cards or athlete cards
 */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div 
      className={cn('rounded-lg border bg-card p-4 space-y-3', className)}
      aria-hidden="true"
    >
      <div className="flex justify-between items-start">
        <LoadingSkeleton className="h-6 w-3/4" />
        <LoadingSkeleton className="h-5 w-16" />
      </div>
      <LoadingSkeleton className="h-4 w-1/2" />
      <div className="space-y-2 pt-2">
        <LoadingSkeleton className="h-4 w-full" />
        <LoadingSkeleton className="h-4 w-5/6" />
      </div>
      <LoadingSkeleton className="h-9 w-full mt-4" />
    </div>
  );
}

/**
 * Table row skeleton for loading dive tables
 */
export function TableRowSkeleton({ columns = 8 }: { columns?: number }) {
  return (
    <tr className="border-b" aria-hidden="true">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-2">
          <LoadingSkeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export default LoadingState;
