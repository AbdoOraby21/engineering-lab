import type { ReactNode } from 'react';

interface CardProps {
  title: string;
  children: ReactNode;
  isLoading?: boolean;
  className?: string;
}

export default function Card({ title, children, isLoading, className }: CardProps) {
  return (
    <div className={`rounded-2xl border border-line p-5 ${className ?? ''}`}>
      <h2 className="text-lg font-bold text-content mb-4">{title}</h2>
      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-muted">
          <span className="animate-pulse">Loading…</span>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
