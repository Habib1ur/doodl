import Link from 'next/link';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  href?: string;
}

export function BrandLogo({ size = 'md', href = '/' }: BrandLogoProps) {
  const iconDim = size === 'sm' ? 32 : size === 'lg' ? 44 : 38;
  const textClass =
    size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl';

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green rounded-control"
    >
      <svg
        width={iconDim}
        height={iconDim}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0 drop-shadow-sm"
      >
        <defs>
          <linearGradient id="doodlioGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#16A36A" />
            <stop offset="100%" stopColor="#3478F6" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="12" fill="url(#doodlioGrad)" />
        <path
          d="M11 26.5C11 26.5 14 21 19.5 19.5C25 18 27.5 13 27.5 13M27.5 13L29.5 11M27.5 13L25.5 15"
          stroke="white"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="14.5" cy="14" r="2.2" fill="#DDF8EC" />
        <circle cx="25.5" cy="26" r="2.5" fill="#EAF3FF" />
      </svg>
      <span className={`font-extrabold tracking-tight text-ink-main ${textClass}`}>
        Dood<span className="brand-gradient-text">l</span>
      </span>
    </Link>
  );
}
