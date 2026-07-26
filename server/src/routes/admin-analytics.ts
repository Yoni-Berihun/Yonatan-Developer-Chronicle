import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../middleware/validate.js";

export const adminAnalyticsRouter = Router();

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
}

// Everything the dashboard needs in one round trip. All figures are derived
// from existing rows (posts, messages, media) — there is no separate traffic
// table, so "views" reflects the cumulative Post.viewCount, and the monthly
// series bucket content and messages by their own timestamps.
adminAnalyticsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const startOfThisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const startOfLastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));

    const [
      sectionsCount,
      publishedCount,
      draftCount,
      totalPosts,
      viewAgg,
      unreadCount,
      totalMessages,
      mediaCount,
      publishedPosts,
      recentPosts,
      recentMessages,
      windowMessages,
    ] = await Promise.all([
      prisma.section.count(),
      prisma.post.count({ where: { status: "PUBLISHED" } }),
      prisma.post.count({ where: { status: "DRAFT" } }),
      prisma.post.count(),
      prisma.post.aggregate({ _sum: { viewCount: true } }),
      prisma.contactMessage.count({ where: { isRead: false, isArchived: false } }),
      prisma.contactMessage.count(),
      prisma.mediaAsset.count(),
      prisma.post.findMany({
        where: { status: "PUBLISHED", publishedAt: { not: null } },
        select: { id: true, title: true, slug: true, viewCount: true, publishedAt: true },
      }),
      prisma.post.findMany({
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { id: true, title: true, status: true, updatedAt: true },
      }),
      prisma.contactMessage.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, name: true, subject: true, createdAt: true, isRead: true },
      }),
      prisma.contactMessage.findMany({
        where: { createdAt: { gte: windowStart } },
        select: { createdAt: true },
      }),
    ]);

    // Build the six-month skeleton so months with zero activity still render.
    const months: { key: string; label: string; posts: number; messages: number }[] = [];
    for (let offset = 5; offset >= 0; offset -= 1) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
      months.push({
        key: monthKey(d),
        label: MONTH_LABELS[d.getUTCMonth()] ?? "",
        posts: 0,
        messages: 0,
      });
    }
    const bucketByKey = new Map(months.map((m) => [m.key, m]));

    for (const post of publishedPosts) {
      if (!post.publishedAt) continue;
      const bucket = bucketByKey.get(monthKey(post.publishedAt));
      if (bucket) bucket.posts += 1;
    }
    for (const message of windowMessages) {
      const bucket = bucketByKey.get(monthKey(message.createdAt));
      if (bucket) bucket.messages += 1;
    }

    const inRange = (date: Date | null, start: Date, end?: Date) =>
      date !== null && date >= start && (end === undefined || date < end);

    const postsThisMonth = publishedPosts.filter((p) =>
      inRange(p.publishedAt, startOfThisMonth),
    ).length;
    const postsLastMonth = publishedPosts.filter((p) =>
      inRange(p.publishedAt, startOfLastMonth, startOfThisMonth),
    ).length;
    const messagesThisMonth = windowMessages.filter((m) =>
      inRange(m.createdAt, startOfThisMonth),
    ).length;
    const messagesLastMonth = windowMessages.filter((m) =>
      inRange(m.createdAt, startOfLastMonth, startOfThisMonth),
    ).length;

    const topPosts = [...publishedPosts]
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 5)
      .map((p) => ({ id: p.id, title: p.title, slug: p.slug, viewCount: p.viewCount }));

    res.json({
      totals: {
        totalViews: viewAgg._sum.viewCount ?? 0,
        published: publishedCount,
        drafts: draftCount,
        totalPosts,
        sections: sectionsCount,
        unread: unreadCount,
        totalMessages,
        media: mediaCount,
      },
      deltas: {
        postsThisMonth,
        postsLastMonth,
        messagesThisMonth,
        messagesLastMonth,
      },
      monthly: months.map(({ label, posts, messages }) => ({ label, posts, messages })),
      topPosts,
      recentPosts,
      recentMessages,
    });
  }),
);
