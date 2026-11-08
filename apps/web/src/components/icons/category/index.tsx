import type { SVGProps } from 'react';

// Microcontrollers & Development Boards — chip with pins
export function ChipIcon({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 7h2M3 11h2M3 15h2M19 7h2M19 11h2M19 15h2M7 3v2M11 3v2M15 3v2M7 19v2M11 19v2M15 19v2" />
    </svg>
  );
}

// Sensors & Modules — sensor waves with a dot
export function SensorIcon({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M12 22c-4.714 0-7.639-3.223-8.354-7.688a8.003 8.003 0 0 1 15.708 0A8.01 8.01 0 0 1 20.639 18.777C19.924 18.777 16.714 22 12 22Z" />
      <circle cx="12" cy="7" r="3" />
    </svg>
  );
}

// Passive Components — resistor zigzag
export function ResistorIcon({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M4 12h3l2 4 2-4 2 4 2-4 2 4h3" />
    </svg>
  );
}

// LEDs & Displays — two LEDs, red and green
export function LedsIcon({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <circle cx="7" cy="12" r="2" fill="#EF4444" />
      <path d="M5 10V14" />
      <circle cx="17" cy="12" r="2" fill="#22C55E" />
      <path d="M19 10V14" />
    </svg>
  );
}

// Power Supplies — plug with cable
export function PlugIcon({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M10 22h2v-8l-2-4h0l-2 4v8zM4 16l2-2 2 2M20 16l-2-2-2 2" />
    </svg>
  );
}

// Motors & Actuators — simplified robotic arm
export function MotorIcon({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M6 12h6M6 12l-2 4M12 12l2 4M9 15v-6M12 15v-6" />
      <circle cx="6" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

// Cables & Connectors — curved wires with connector
export function CablesIcon({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M4 8c0-2.21 1.79-4 4-4s4 1.79 4 4M20 16c0-2.21-1.79-4-4-4s-4 1.79-4 4M12 20v-4" />
    </svg>
  );
}

// More Categories — grid
export function GridIcon({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

// Trust icons
export function ShieldCheckIcon({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function ReturnsIcon({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M7 7h.01M7 12h.01M7 17h.01M12 4v16M17 4v16M22 4v16M2 20h20" />
    </svg>
  );
}

export function SupportIcon({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M9 16v2a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-2M12 18v-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6" />
      <path d="M3 16l6.52 2.608a1 1 0 0 0 1.48-.608L18 16" />
    </svg>
  );
}

export function QualityIcon({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
