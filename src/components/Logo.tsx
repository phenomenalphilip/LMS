import React from 'react';

export function Logo({ className = "w-8 h-8 text-[#0084FF]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19 5v14h-4V11.828L5.828 21 3 18.172 12.172 9H5V5h14z" />
    </svg>
  );
}
