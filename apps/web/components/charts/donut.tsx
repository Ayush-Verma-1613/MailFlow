/** Donut ring with a centered total. Pure SVG. */
export interface DonutSegment {
  label: string;
  value: number;
  color: string; // any CSS color, e.g. rgb(var(--sage))
}

export function Donut({
  segments,
  total,
  caption,
  size = 160,
}: {
  segments: DonutSegment[];
  total: number;
  caption?: string;
  size?: number;
}) {
  const sum = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  let offset = 25; // start at 12 o'clock
  return (
    <div className="relative" style={{ width: size, height: size, flex: `0 0 ${size}px` }}>
      <svg viewBox="0 0 42 42" width={size} height={size}>
        <circle r="15.9" cx="21" cy="21" fill="transparent" stroke="rgb(var(--surface-2))" strokeWidth="6" />
        {segments.map((seg, i) => {
          const pct = (seg.value / sum) * 100;
          const el = (
            <circle
              key={i}
              r="15.9"
              cx="21"
              cy="21"
              fill="transparent"
              stroke={seg.color}
              strokeWidth="6"
              strokeDasharray={`${pct} ${100 - pct}`}
              strokeDashoffset={offset}
            />
          );
          offset = (((offset - pct) % 100) + 100) % 100;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="font-serif text-[30px] leading-none">{total}</div>
          {caption && <div className="mono text-muted-foreground mt-1 text-[10px]">{caption}</div>}
        </div>
      </div>
    </div>
  );
}
