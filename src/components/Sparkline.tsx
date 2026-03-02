import { useState, useCallback, useMemo } from "react";

interface SparklineProps {
  data: number[];
  dates?: string[];
  width?: number;
  height?: number;
  className?: string;
}

const Sparkline = ({ data, dates, width = 80, height = 24, className = "" }: SparklineProps) => {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; value: number; date?: string } | null>(null);

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const coords = useMemo(() => data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - ((v - min) / range) * (height - 2) - 1,
    value: v,
    date: dates?.[i],
  })), [data, dates, width, height, min, range]);

  const trending = data[data.length - 1] >= data[0];
  const strokeColor = trending ? "hsl(var(--primary))" : "hsl(var(--destructive))";

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * width;
      let nearest = coords[0];
      let minDist = Math.abs(mouseX - nearest.x);
      for (let i = 1; i < coords.length; i++) {
        const dist = Math.abs(mouseX - coords[i].x);
        if (dist < minDist) {
          minDist = dist;
          nearest = coords[i];
        }
      }
      setTooltip({ x: nearest.x, y: nearest.y, value: nearest.value, date: nearest.date });
    },
    [coords, width]
  );

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  if (data.length < 2) return null;

  return (
    <div className="relative inline-block">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={`${className} cursor-crosshair`}
        aria-label={`Price trend: ${trending ? "up" : "down"}`}
        role="img"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <polyline
          points={coords.map((c) => `${c.x},${c.y}`).join(" ")}
          fill="none"
          stroke={strokeColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {tooltip && (
          <circle cx={tooltip.x} cy={tooltip.y} r={2.5} fill={strokeColor} />
        )}
      </svg>
      {tooltip && (
        <div
          className="absolute z-50 px-2 py-1 rounded bg-popover border border-border shadow-lg text-[9px] text-foreground whitespace-nowrap pointer-events-none"
          style={{
            left: `${tooltip.x}px`,
            bottom: `${height + 4}px`,
            transform: "translateX(-50%)",
          }}
        >
          <span className="font-mono font-bold">${tooltip.value.toFixed(2)}</span>
          {tooltip.date && (
            <span className="text-muted-foreground ml-1">{tooltip.date}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default Sparkline;
