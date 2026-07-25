/**
 * Bakes real <head> metadata into static HTML files after `vite build`.
 *
 * Why this exists: React 19 puts the correct <title> and OG tags in the
 * document, but only once JavaScript has run. Google executes JavaScript;
 * the crawlers behind LinkedIn, X, Telegram and Facebook link previews do not.
 * Without this step every shared link would show the same generic title.
 *
 * How it works: for each public route we write dist/<route>/index.html with the
 * metadata already in place. A static host can serve a matching file before it
 * applies the SPA rewrite, so crawlers get real tags and browsers still get the
 * same single-page app.
 *
 * This step is best-effort by design. If the API is asleep or unreachable the
 * build still succeeds with the default metadata rather than failing a deploy.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const distDir = join(here, "..", "dist");

const API_URL = (
  process.env.PRERENDER_API_URL ??
  process.env.VITE_API_TARGET ??
  "http://localhost:4000"
).replace(/\/$/, "");

const SITE_URL = (process.env.PUBLIC_SITE_URL ?? "").replace(/\/$/, "");

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const absolute = (url) => {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url;
  return SITE_URL ? `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}` : null;
};

async function fetchJson(path) {
  const response = await fetch(`${API_URL}/api${path}`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`${path} responded ${response.status}`);
  return response.json();
}

function buildHead({ title, description, image, canonical, type = "website", publishedAt, jsonLd }) {
  const imageUrl = absolute(image);
  const canonicalUrl = absolute(canonical);

  const tags = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    canonicalUrl ? `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />` : "",
    `<meta property="og:site_name" content="The Yonatan Times" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:type" content="${type}" />`,
    canonicalUrl ? `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />` : "",
    imageUrl ? `<meta property="og:image" content="${escapeHtml(imageUrl)}" />` : "",
    publishedAt
      ? `<meta property="article:published_time" content="${escapeHtml(publishedAt)}" />`
      : "",
    `<meta name="twitter:card" content="${imageUrl ? "summary_large_image" : "summary"}" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    imageUrl ? `<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />` : "",
    jsonLd
      ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>`
      : "",
  ];

  return tags.filter(Boolean).join("\n    ");
}

/** Swaps the placeholder <title> for the real metadata block. */
function inject(template, head) {
  const withoutTitle = template.replace(/<title>[\s\S]*?<\/title>\s*/i, "");
  return withoutTitle.replace("</head>", `  ${head}\n  </head>`);
}

async function writeRoute(routePath, html) {
  const target =
    routePath === "/" ? join(distDir, "index.html") : join(distDir, routePath, "index.html");
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, html, "utf8");
  return routePath;
}

async function main() {
  const template = await readFile(join(distDir, "index.html"), "utf8");

  const [site, postList] = await Promise.all([
    fetchJson("/public/site"),
    fetchJson("/public/posts?perPage=50"),
  ]);

  const { settings } = site;
  const written = [];

  written.push(
    await writeRoute(
      "/",
      inject(
        template,
        buildHead({
          title: settings.metaTitle,
          description: settings.metaDescription,
          image: settings.ogImageUrl,
          canonical: "/",
          jsonLd: {
            "@context": "https://schema.org",
            "@type": "Person",
            name: settings.authorName,
            description: settings.authorSubtitle,
            image: absolute(settings.portraitUrl),
            url: SITE_URL || undefined,
            sameAs: (site.socialLinks ?? []).map((link) => link.url),
          },
        }),
      ),
    ),
  );

  written.push(
    await writeRoute(
      "/edition",
      inject(
        template,
        buildHead({
          title: `The Latest Edition | ${settings.siteTitle}`,
          description:
            "Dispatches from the desk — notes on building, learning and shipping software.",
          image: settings.ogImageUrl,
          canonical: "/edition",
          jsonLd: {
            "@context": "https://schema.org",
            "@type": "Blog",
            name: "The Latest Edition",
            url: SITE_URL ? `${SITE_URL}/edition` : undefined,
          },
        }),
      ),
    ),
  );

  for (const post of postList.posts ?? []) {
    written.push(
      await writeRoute(
        `/edition/${post.slug}`,
        inject(
          template,
          buildHead({
            title: `${post.title} | ${settings.siteTitle}`,
            description: post.excerpt,
            image: post.coverImageUrl ?? settings.ogImageUrl,
            canonical: `/edition/${post.slug}`,
            type: "article",
            publishedAt: post.publishedAt,
            jsonLd: {
              "@context": "https://schema.org",
              "@type": "BlogPosting",
              headline: post.title,
              description: post.excerpt,
              image: absolute(post.coverImageUrl) ?? undefined,
              datePublished: post.publishedAt ?? undefined,
              author: { "@type": "Person", name: settings.authorName },
              mainEntityOfPage: SITE_URL ? `${SITE_URL}/edition/${post.slug}` : undefined,
            },
          }),
        ),
      ),
    );
  }

  console.log(`Prerendered ${written.length} routes with static metadata.`);
}

main().catch((error) => {
  console.warn(
    `\nPrerender skipped: ${error instanceof Error ? error.message : error}\n` +
      "The site still works; shared links will fall back to the default title.\n" +
      "Set PRERENDER_API_URL to your API origin to enable it.\n",
  );
  process.exit(0);
});
