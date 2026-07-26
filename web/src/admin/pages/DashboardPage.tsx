import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import type { AdminAnalytics } from "../../lib/types";
import { Card, PageHeader, Spinner } from "../components/ui";
import { MonthlyBars, RankingBars } from "../components/charts";
import { Icon, type IconName } from "../components/icons";
import { useAdminAuth } from "../useAdminAuth";

const quickActions: { to: string; label: string; icon: IconName }[] = [
  { to: "/admin/blog/new", label: "New article", icon: "plus" },
  { to: "/admin/sections", label: "New section", icon: "sections" },
  { to: "/admin/media", label: "Upload media", icon: "upload" },
  { to: "/admin/inbox", label: "Open inbox", icon: "inbox" },
];

function Delta({ current, previous }: { current: number; previous: number }) {
  const diff = current - previous;
  if (diff === 0) {
    return <span className="admin-delta admin-delta--flat">No change vs last month</span>;
  }
  const up = diff > 0;
  return (
    <span className={`admin-delta ${up ? "admin-delta--up" : "admin-delta--down"}`}>
      <Icon name={up ? "rise" : "fall"} size={14} />
      {up ? "+" : ""}
      {diff} vs last month
    </span>
  );
}

function StatCard({
  icon,
  value,
  label,
  children,
}: {
  icon: IconName;
  value: string | number;
  label: string;
  children?: ReactNode;
}) {
  return (
    <div className="admin-metric">
      <span className="admin-metric-icon">
        <Icon name={icon} size={20} />
      </span>
      <span className="admin-metric-value">{value}</span>
      <span className="admin-metric-label">{label}</span>
      {children ? <div className="admin-metric-foot">{children}</div> : null}
    </div>
  );
}

export default function DashboardPage() {
  const { admin } = useAdminAuth();

  const analytics = useQuery({
    queryKey: ["admin", "analytics"],
    queryFn: () => api.get<AdminAnalytics>("/admin/analytics"),
    staleTime: 30_000,
  });

  const data = analytics.data;

  return (
    <>
      <PageHeader
        title={`Good to see you, ${admin?.name?.split(" ")[0] ?? "editor"}`}
        description="Everything on the site is editable from here. Nothing needs a code change."
      />

      <div className="admin-quick-actions">
        {quickActions.map((action) => (
          <Link key={action.to} to={action.to} className="admin-quick-action">
            <Icon name={action.icon} size={18} />
            {action.label}
          </Link>
        ))}
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="admin-quick-action admin-quick-action--ghost"
        >
          <Icon name="external" size={18} />
          View site
        </a>
      </div>

      {analytics.isLoading ? (
        <Spinner label="Gathering the latest figures…" />
      ) : data ? (
        <>
          <div className="admin-metric-grid">
            <StatCard icon="views" value={data.totals.totalViews.toLocaleString()} label="Total article views" />
            <StatCard icon="published" value={data.totals.published} label="Published articles">
              <Delta current={data.deltas.postsThisMonth} previous={data.deltas.postsLastMonth} />
            </StatCard>
            <StatCard icon="draft" value={data.totals.drafts} label="Drafts in progress" />
            <StatCard icon="sections" value={data.totals.sections} label="Live sections" />
            <StatCard icon="inbox" value={data.totals.unread} label="Unread messages">
              <Delta
                current={data.deltas.messagesThisMonth}
                previous={data.deltas.messagesLastMonth}
              />
            </StatCard>
            <StatCard icon="folder" value={data.totals.media} label="Media assets" />
          </div>

          <div className="admin-analytics-grid">
            <Card title="Activity over the last 6 months">
              <MonthlyBars data={data.monthly} />
            </Card>

            <Card title="Most-read articles">
              <RankingBars
                items={data.topPosts.map((p) => ({
                  id: p.id,
                  label: p.title,
                  value: p.viewCount,
                }))}
              />
              <Link to="/admin/blog" className="admin-inline-link">
                Manage the edition →
              </Link>
            </Card>
          </div>

          <div className="admin-columns">
            <Card title="Recently edited">
              {data.recentPosts.length > 0 ? (
                <ul className="admin-list">
                  {data.recentPosts.map((post) => (
                    <li key={post.id}>
                      <Link to={`/admin/blog/${post.id}`}>{post.title}</Link>
                      <span className={`admin-pill admin-pill--${post.status.toLowerCase()}`}>
                        {post.status === "PUBLISHED" ? "Published" : "Draft"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="admin-hint">No articles yet.</p>
              )}
              <Link to="/admin/blog" className="admin-inline-link">
                Manage the edition →
              </Link>
            </Card>

            <Card title="Latest messages">
              {data.recentMessages.length > 0 ? (
                <ul className="admin-list">
                  {data.recentMessages.map((message) => (
                    <li key={message.id}>
                      <span>
                        <strong>{message.name}</strong> — {message.subject}
                      </span>
                      <span className="admin-hint">{formatDateTime(message.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="admin-hint">The inbox is empty.</p>
              )}
              <Link to="/admin/inbox" className="admin-inline-link">
                Open the inbox →
              </Link>
            </Card>
          </div>
        </>
      ) : (
        <p className="admin-error">Could not load the dashboard. Please refresh.</p>
      )}
    </>
  );
}
