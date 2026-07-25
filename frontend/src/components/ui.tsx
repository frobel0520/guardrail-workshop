import type { ReactNode } from "react";

/* ---------------- Icons ---------------- */

const PATHS: Record<string, ReactNode> = {
  shield: <path d="M12 3l7 3v5.5c0 4.3-2.9 8.2-7 9.5-4.1-1.3-7-5.2-7-9.5V6l7-3z" />,
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.6 2.6L16 9.5" />
    </>
  ),
  cube: (
    <>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
      <path d="M4 7.5l8 4.5 8-4.5M12 12v9" />
    </>
  ),
  flag: (
    <>
      <path d="M6 21V4" />
      <path d="M6 5h11l-2 3.5L17 12H6" />
    </>
  ),
  rain: (
    <>
      <path d="M7 15a4 4 0 010-8 5.5 5.5 0 0110.4 1.5A3.5 3.5 0 0117 15" />
      <path d="M9 18l-1 2.5M13 18l-1 2.5M17 18l-1 2.5" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8.5 10V7.5a3.5 3.5 0 017 0V10" />
    </>
  ),
  bolt: <path d="M13 3L5.5 13H11l-1 8 7.5-10H12l1-8z" />,
  shuffle: (
    <>
      <path d="M4 6h4l8 12h4M4 18h4l3-4.5M16 6h4M18 4l2 2-2 2M18 16l2 2-2 2" />
    </>
  ),
  login: (
    <>
      <path d="M11 4h6a2 2 0 012 2v12a2 2 0 01-2 2h-6" />
      <path d="M4 12h9M10 8.5l3.5 3.5L10 15.5" />
    </>
  ),
  chat: <path d="M20 15a2 2 0 01-2 2H9l-4 3V6a2 2 0 012-2h11a2 2 0 012 2v9z" />,
  wrench: <path d="M20 6.5a4.5 4.5 0 01-6 4.3L6.8 18a2 2 0 11-2.8-2.8l7.2-7.2A4.5 4.5 0 0117.5 4l-3 3 2.5 2.5 3-3z" />,
  filter: <path d="M4 5h16l-6.2 7.4V19l-3.6-2v-4.6L4 5z" />,
  eyeOff: (
    <>
      <path d="M3 3l18 18" />
      <path d="M10.6 6.3A9 9 0 0121 12a13.6 13.6 0 01-3.3 3.9M6.6 8.2A13.9 13.9 0 003 12a9 9 0 0011.4 5.4" />
      <path d="M9.9 10.1a3 3 0 004.2 4.2" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4" />
    </>
  ),
  book: (
    <>
      <path d="M4 5.5A2.5 2.5 0 016.5 3H12v16H6.5A2.5 2.5 0 004 21.5v-16z" />
      <path d="M20 5.5A2.5 2.5 0 0017.5 3H12v16h5.5a2.5 2.5 0 012.5 2.5v-16z" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M15.2 8.8l-1.9 4.4-4.4 1.9 1.9-4.4 4.4-1.9z" />
    </>
  ),
  code: <path d="M9 7.5L4 12l5 4.5M15 7.5L20 12l-5 4.5M13.5 5l-3 14" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5.2l3.2 2" />
    </>
  ),
  layers: (
    <>
      <path d="M12 3l8.5 4.5L12 12 3.5 7.5 12 3z" />
      <path d="M3.5 12L12 16.5 20.5 12M3.5 16.5L12 21l8.5-4.5" />
    </>
  ),
  xCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </>
  ),
  sliders: <path d="M6 4v6M6 14v6M12 4v3M12 11v9M18 4v9M18 17v3M3.5 12h5M9.5 9h5M15.5 15h5" />,
  refresh: (
    <>
      <path d="M20 12a8 8 0 01-13.7 5.6M4 12a8 8 0 0113.7-5.6" />
      <path d="M17.7 3v3.6h-3.6M6.3 21v-3.6h3.6" />
    </>
  ),
  map: (
    <>
      <path d="M9 4L3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4z" />
      <path d="M9 4v14M15 6v14" />
    </>
  ),
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}

/* ---------------- 排版元件 ---------------- */

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header>
      <h2 className="page-title">{title}</h2>
      {subtitle ? <p className="page-sub">{subtitle}</p> : null}
    </header>
  );
}

export type Tone = "teal" | "red" | "steel" | "navy";

export function InfoCard({
  icon,
  tone = "teal",
  title,
  body,
  bullets,
  footer,
  plain,
}: {
  icon?: IconName;
  tone?: Tone;
  title: string;
  body?: ReactNode;
  bullets?: string[];
  footer?: ReactNode;
  plain?: boolean;
}) {
  return (
    <article className={plain ? "card plain" : "card"}>
      <div className="card-head">
        {icon ? (
          <span className={`icon-circle ${tone}`}>
            <Icon name={icon} />
          </span>
        ) : null}
        <h4 className="card-title">{title}</h4>
      </div>
      {body ? <p className="card-body">{body}</p> : null}
      {bullets ? (
        <ul>
          {bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      ) : null}
      {footer ? <div className="card-foot">{footer}</div> : null}
    </article>
  );
}

export function Grid({ cols = 2, children }: { cols?: 2 | 3; children: ReactNode }) {
  return <div className={`grid cols-${cols}`}>{children}</div>;
}

export function BlockTitle({ children }: { children: ReactNode }) {
  return <h3 className="block-title">{children}</h3>;
}
