/**
 * Rendimiento — a small line chart in plain SVG (no chart library): one or two series over the
 * same time axis, with the highest value marked and the first and last times below.
 */
export type ChartSeries = { name: string; color: string; values: Array<number | null> };

export function LineChart({
  series,
  labels,
  format,
  height = 140,
  title,
}: Readonly<{
  series: ChartSeries[];
  labels: string[];
  format: (value: number) => string;
  height?: number;
  title: string;
}>) {
  const width = 600;
  const pad = { top: 12, right: 8, bottom: 4, left: 8 };
  const all = series.flatMap((s) => s.values.filter((v): v is number => v != null));
  const max = Math.max(1, ...all);
  const count = Math.max(1, labels.length - 1);
  const x = (i: number) => pad.left + (i / count) * (width - pad.left - pad.right);
  const y = (v: number) => pad.top + (1 - v / max) * (height - pad.top - pad.bottom);
  const pathOf = (values: Array<number | null>) =>
    values
      .map((v, i) => (v == null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`))
      .reduce<string[]>((parts, point, i, list) => {
        if (point == null) return parts;
        parts.push(`${i === 0 || list[i - 1] == null ? 'M' : 'L'}${point}`);
        return parts;
      }, [])
      .join(' ');
  if (labels.length === 0) {
    return (
      <figure className="rounded-2xl border border-[#e8e4dc] bg-white p-5">
        <figcaption className="text-sm font-medium text-[#77736d]">{title}</figcaption>
        <p className="mt-6 text-sm text-[#99938b]">Todavía no hay minutos guardados en este rango.</p>
      </figure>
    );
  }
  return (
    <figure className="rounded-2xl border border-[#e8e4dc] bg-white p-5">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-[#77736d]">{title}</span>
        <span className="flex flex-wrap gap-3 text-xs text-[#77736d]">
          {series.map((s) => (
            <span key={s.name} className="inline-flex items-center gap-1">
              <i className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} /> {s.name}
            </span>
          ))}
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-3 h-36 w-full"
        role="img"
        aria-label={`${title}: máximo ${format(max)}`}
        preserveAspectRatio="none"
      >
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={pad.left} x2={width - pad.right} y1={y(max * f)} y2={y(max * f)} stroke="#efece6" strokeWidth="1" />
        ))}
        {series.map((s) => (
          <path key={s.name} d={pathOf(s.values)} fill="none" stroke={s.color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-[#99938b]">
        <span>{labels[0]}</span>
        <span>máx. {format(max)}</span>
        <span>{labels.at(-1)}</span>
      </div>
    </figure>
  );
}
