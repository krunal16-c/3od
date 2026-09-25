import Link from 'next/link';

type ButtonProps = { href: string; children: React.ReactNode; secondary?: boolean };

export function Button({ href, children, secondary = false }: ButtonProps) {
  return (
    <Link className={`button ${secondary ? 'button-secondary' : ''}`} href={href}>
      {children}<span aria-hidden="true">↗</span>
    </Link>
  );
}
