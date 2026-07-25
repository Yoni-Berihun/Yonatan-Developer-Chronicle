import type { Section } from "./types";

/** Sections that never belong in the main nav or footer lists. */
export const NAV_EXCLUDED_TYPES = new Set(["CTA", "BLOG_TEASER"]);

/**
 * True when a published section will actually render something on the home page.
 * Empty published sections used to leave dead `#anchors` in the nav.
 */
export function sectionHasPublicContent(section: Section): boolean {
  switch (section.type) {
    case "PROJECTS":
      return section.projects.length > 0;
    case "SKILLS":
      return section.skillCategories.some((category) => category.items.length > 0);
    case "TIMELINE":
      return section.timelineEntries.length > 0 || section.stats.length > 0;
    case "ACCOLADES":
      return section.accolades.length > 0;
    case "IMPACT":
      return (section.impactStories?.length ?? 0) > 0 || (section.impactMetrics?.length ?? 0) > 0;
    case "CUSTOM":
      return section.blocks.length > 0;
    case "CTA":
      return Boolean(section.cta);
    case "BLOG_TEASER":
      return true;
    default:
      return false;
  }
}

export function toNavLabel(section: Section): string {
  const configured = section.config?.navLabel;
  if (typeof configured === "string" && configured.trim()) return configured.trim();
  return section.slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Sections that should appear in public nav / footer. */
export function navigableSections(sections: Section[]): Section[] {
  return sections.filter(
    (section) =>
      section.isPublished &&
      !NAV_EXCLUDED_TYPES.has(section.type) &&
      sectionHasPublicContent(section),
  );
}

/**
 * Place line for the living dateline. Admin may store a full legacy string
 * like "October 2025 | Ethiopia" — we keep the part after the last pipe.
 */
export function placeFromDateline(datelineText: string): string {
  const parts = datelineText
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts[parts.length - 1] || "Ethiopia";
}
