// Lightweight, dependency-free charts drawn with SVG/CSS so the newsroom stays
// on-theme and the bundle stays small.

interface MonthlyDatum {
  label: string;
  posts: number;
  messages: number;
}

export function MonthlyBars({ data }: { data: MonthlyDatum[] }) {
  const width = 640;
  const height = 240;
  const padL = 30;
  const padR = 10;
  const padT = 14;
  const padB = 28;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const max = Math.max(1, ...data.flatMap((d) => [d.posts, d.messages]));
  const ticks = 4;
  const slot = plotW / Math.max(1, data.length);
  const barGap = 6;
  const barW = Math.max(6, (slot - barGap * 3) / 2);

  const y = (value: number) => padT + plotH - (value / max) * plotH;

  return (
    <div className="admin-chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="admin-chart-svg"
        role="img"
        aria-label="Published articles and messages received over the last six months"
        preserveAspectRatio="xMidYMid meet"
      >
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const value = Math.round((max / ticks) * i);
          const gy = y(value);
          return (
            <g key={i}>
              <line
                x1={padL}
                x2={width - padR}
                y1={gy}
                y2={gy}
                className="admin-chart-grid"
              />
              <text x={padL - 6} y={gy + 3} textAnchor="end" className="admin-chart-axis">
                {value}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const groupX = padL + slot * i;
          const postsX = groupX + barGap;
          const msgX = postsX + barW + barGap;
          return (
            <g key={d.label}>
              <rect
                x={postsX}
                y={y(d.posts)}
                width={barW}
                height={padT + plotH - y(d.posts)}
                rx={2}
                className="admin-chart-bar admin-chart-bar--posts"
              >
                <title>{`${d.label}: ${d.posts} article${d.posts === 1 ? "" : "s"}`}</title>
              </rect>
              <rect
                x={msgX}
                y={y(d.messages)}
                width={barW}
                height={padT + plotH - y(d.messages)}
                rx={2}
                className="admin-chart-bar admin-chart-bar--messages"
              >
                <title>{`${d.label}: ${d.messages} message${d.messages === 1 ? "" : "s"}`}</title>
              </rect>
              <text
                x={groupX + slot / 2}
                y={height - 9}
                textAnchor="middle"
                className="admin-chart-axis"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="admin-chart-legend">
        <span className="admin-chart-key admin-chart-key--posts">Articles published</span>
        <span className="admin-chart-key admin-chart-key--messages">Messages received</span>
      </div>
    </div>
  );
}

interface RankingItem {
  id: string;
  label: string;
  value: number;
  href?: string;
}

export function RankingBars({ items }: { items: RankingItem[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));

  if (items.length === 0) {
    return <p className="admin-hint">No published articles to rank yet.</p>;
  }

  return (
    <ul className="admin-ranking">
      {items.map((item, index) => (
        <li key={item.id} className="admin-ranking-row">
          <span className="admin-ranking-rank">{index + 1}</span>
          <div className="admin-ranking-main">
            <span className="admin-ranking-label" title={item.label}>
              {item.label}
            </span>
            <span className="admin-ranking-track" aria-hidden="true">
              <span
                className="admin-ranking-fill"
                style={{ width: `${Math.round((item.value / max) * 100)}%` }}
              />
            </span>
          </div>
          <span className="admin-ranking-value">{item.value.toLocaleString()}</span>
        </li>
      ))}
    </ul>
  );
}
