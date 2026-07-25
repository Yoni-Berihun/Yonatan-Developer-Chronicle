export type SectionType =
  | "PROJECTS"
  | "SKILLS"
  | "TIMELINE"
  | "ACCOLADES"
  | "BLOG_TEASER"
  | "CTA"
  | "CUSTOM";

export type BlockType =
  | "HEADING"
  | "PARAGRAPH"
  | "IMAGE"
  | "QUOTE"
  | "BUTTON"
  | "DIVIDER"
  | "LIST"
  | "HTML";

export interface SiteSettings {
  id: number;
  siteTitle: string;
  siteSubtitle: string;
  volumeLabel: string;
  editionLabel: string;
  datelineText: string;

  authorName: string;
  authorSubtitle: string;
  aboutParagraphs: string[];
  portraitUrl: string;
  portraitAlt: string;

  cvTitle: string;
  cvSubtitle: string;
  cvUrl: string;
  cvEnabled: boolean;

  contactIntro: string;

  footerAbout: string;
  copyright: string;

  metaTitle: string;
  metaDescription: string;
  ogImageUrl: string | null;
  canonicalUrl: string | null;
}

export interface SocialLink {
  id: string;
  platform: string;
  label: string;
  url: string;
  order: number;
  isActive: boolean;
}

export interface Project {
  id: string;
  sectionId: string;
  title: string;
  category: string;
  description: string;
  techTags: string[];
  imageUrl: string;
  imageAlt: string;
  imagePublicId: string | null;
  linkUrl: string | null;
  linkLabel: string;
  isArchived: boolean;
  featured: boolean;
  order: number;
  isPublished: boolean;
}

export interface SkillItem {
  id: string;
  categoryId: string;
  heading: string;
  description: string;
  order: number;
}

export interface SkillCategory {
  id: string;
  sectionId: string;
  title: string;
  order: number;
  items: SkillItem[];
}

export interface TimelineEntry {
  id: string;
  sectionId: string;
  dateLabel: string;
  title: string;
  description: string;
  logoUrl: string | null;
  logoAlt: string;
  order: number;
  isPublished: boolean;
}

export interface Stat {
  id: string;
  sectionId: string;
  value: string;
  label: string;
  order: number;
}

export interface Accolade {
  id: string;
  sectionId: string;
  dateLabel: string;
  title: string;
  issuer: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  imagePublicId: string | null;
  order: number;
  isPublished: boolean;
}

export interface ContentBlock {
  id: string;
  sectionId: string;
  type: BlockType;
  data: Record<string, unknown>;
  order: number;
}

export interface CallToAction {
  id: string;
  sectionId: string;
  heading: string;
  subheading: string | null;
  buttonLabel: string;
  buttonUrl: string;
  icon: string | null;
  decoration: string | null;
}

export interface Section {
  id: string;
  slug: string;
  type: SectionType;
  title: string;
  subtitle: string | null;
  order: number;
  isPublished: boolean;
  config: Record<string, unknown> | null;
  projects: Project[];
  skillCategories: SkillCategory[];
  timelineEntries: TimelineEntry[];
  stats: Stat[];
  accolades: Accolade[];
  blocks: ContentBlock[];
  cta: CallToAction | null;
}

export interface SitePayload {
  settings: SiteSettings;
  socialLinks: SocialLink[];
  sections: Section[];
}

// --- Blog -------------------------------------------------------------------

export interface TaxonomyRef {
  slug: string;
  name: string;
}

export interface PostSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImageUrl: string | null;
  coverImageAlt: string;
  readingMinutes: number;
  publishedAt: string | null;
  isFeatured: boolean;
  viewCount: number;
  category: TaxonomyRef | null;
  tags: TaxonomyRef[];
}

export interface PostDetail extends PostSummary {
  contentMarkdown: string;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImageUrl: string | null;
  updatedAt: string;
}

export interface RelatedPost {
  slug: string;
  title: string;
  excerpt: string;
  coverImageUrl: string | null;
  readingMinutes: number;
  publishedAt: string | null;
}

export interface Pagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface PostListResponse {
  posts: PostSummary[];
  pagination: Pagination;
}

export interface Taxonomy {
  categories: (TaxonomyRef & { description: string | null; postCount: number })[];
  tags: (TaxonomyRef & { postCount: number })[];
}

// --- Admin ------------------------------------------------------------------

export interface AdminProfile {
  id: string;
  email: string;
  name: string | null;
  lastLoginAt?: string | null;
}

export interface AdminPostSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  status: "DRAFT" | "PUBLISHED";
  publishedAt: string | null;
  isFeatured: boolean;
  readingMinutes: number;
  viewCount: number;
  coverImageUrl: string | null;
  updatedAt: string;
  category: { id: string; name: string; slug: string } | null;
  tags: { id: string; name: string; slug: string }[];
}

export interface AdminPostDetail extends Omit<AdminPostSummary, "category"> {
  contentMarkdown: string;
  coverImageAlt: string;
  coverPublicId: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImageUrl: string | null;
  categoryId: string | null;
  category: { id: string; name: string; slug: string } | null;
  relatedPostIds: string[];
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  order: number;
  _count?: { posts: number };
}

export interface Tag {
  id: string;
  slug: string;
  name: string;
  _count?: { posts: number };
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  isRead: boolean;
  isArchived: boolean;
  createdAt: string;
}

export interface MediaAsset {
  id: string;
  url: string;
  publicId: string;
  alt: string;
  width: number | null;
  height: number | null;
  format: string | null;
  bytes: number | null;
  folder: string;
  createdAt: string;
}

export interface AdminSectionSummary extends Omit<Section, "projects" | "skillCategories" | "timelineEntries" | "stats" | "accolades"> {
  _count: {
    projects: number;
    skillCategories: number;
    timelineEntries: number;
    accolades: number;
    stats: number;
  };
}
