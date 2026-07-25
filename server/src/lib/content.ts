import slugify from "slugify";
import { prisma } from "./prisma.js";

const WORDS_PER_MINUTE = 200;

export function toSlug(input: string): string {
  return slugify(input, { lower: true, strict: true, trim: true });
}

/**
 * Appends -2, -3, ... until the slug is free. `currentId` lets a record keep
 * its own slug while being edited.
 */
export async function uniquePostSlug(title: string, currentId?: string): Promise<string> {
  const base = toSlug(title) || "post";
  let candidate = base;
  let suffix = 2;

  for (;;) {
    const existing = await prisma.post.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === currentId) return candidate;
    candidate = `${base}-${suffix++}`;
  }
}

export async function uniqueSectionSlug(title: string, currentId?: string): Promise<string> {
  const base = toSlug(title) || "section";
  let candidate = base;
  let suffix = 2;

  for (;;) {
    const existing = await prisma.section.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === currentId) return candidate;
    candidate = `${base}-${suffix++}`;
  }
}

/** Strips common markdown syntax so the text can be counted or excerpted. */
export function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/[*_~]{1,3}/g, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function estimateReadingMinutes(markdown: string): number {
  const words = markdownToPlainText(markdown).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

export function buildExcerpt(markdown: string, maxLength = 200): string {
  const text = markdownToPlainText(markdown);
  if (text.length <= maxLength) return text;
  const clipped = text.slice(0, maxLength);
  const lastSpace = clipped.lastIndexOf(" ");
  return `${clipped.slice(0, lastSpace > 0 ? lastSpace : maxLength).trimEnd()}…`;
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
