interface Props {
  title: string;
  description: string;
  image?: string | null;
  canonical?: string | null;
  type?: "website" | "article";
  publishedAt?: string | null;
  noIndex?: boolean;
}

function absolute(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//.test(url)) return url;
  if (typeof window === "undefined") return url;
  return new URL(url, window.location.origin).toString();
}

/**
 * React 19 hoists these into <head> automatically, so no helmet library is
 * needed. The prerender step captures the rendered result at build time.
 */
export default function Seo({
  title,
  description,
  image,
  canonical,
  type = "website",
  publishedAt,
  noIndex = false,
}: Props) {
  const imageUrl = absolute(image);
  const canonicalUrl = absolute(canonical);

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      {noIndex ? <meta name="robots" content="noindex, nofollow" /> : (
        <meta name="robots" content="index, follow" />
      )}
      {canonicalUrl ? <link rel="canonical" href={canonicalUrl} /> : null}

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      {canonicalUrl ? <meta property="og:url" content={canonicalUrl} /> : null}
      {imageUrl ? <meta property="og:image" content={imageUrl} /> : null}
      {publishedAt ? <meta property="article:published_time" content={publishedAt} /> : null}

      <meta name="twitter:card" content={imageUrl ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {imageUrl ? <meta name="twitter:image" content={imageUrl} /> : null}
    </>
  );
}
