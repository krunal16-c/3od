export function Card({ children, className = '', ariaLabel }: { children: React.ReactNode; className?: string; ariaLabel?: string }) {
  return <article className={`card ${className}`} aria-label={ariaLabel}>{children}</article>;
}
