import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Masthead from "../components/Masthead";
import PostCard from "../components/PostCard";
import Seo from "../components/Seo";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { api } from "../lib/api";
import { formatDate } from "../lib/format";
import type { PostDetail, RelatedPost } from "../lib/types";
import { useSite } from "../lib/useSite";

interface PostResponse {
  post: PostDetail;
  related: RelatedPost[];
}

export default function PostPage() {
  const { slug } = useParams();
  const site = useSite();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["post", slug],
    queryFn: () => api.get<PostResponse>(`/public/posts/${slug}`),
    enabled: Boolean(slug),
  });

  if (!site.data) {
    return (
      <div className="boot-screen">
        <p className="boot-title">THE YONATAN TIMES</p>
        <p className="boot-note">The presses are warming up…</p>
      </div>
    );
  }

  const { settings, sections, socialLinks } = site.data;

  return (
    <>
      <div className="super-header" />

      <div className="container">
        <SiteHeader settings={settings} sections={sections} anchorsAreLocal={false} />
        <Masthead title={settings.siteTitle} subtitle="THE LATEST EDITION" />

        {isLoading ? (
          <p className="loading-note">Setting the type…</p>
        ) : isError || !data ? (
          <div className="empty-note">
            <p>That article could not be found.</p>
            <Link to="/edition" className="read-all-link">
              Back to the edition ›
            </Link>
          </div>
        ) : (
          <>
            <Seo
              title={data.post.metaTitle ?? `${data.post.title} | ${settings.siteTitle}`}
              description={data.post.metaDescription ?? data.post.excerpt}
              image={data.post.ogImageUrl ?? data.post.coverImageUrl}
              canonical={`/edition/${data.post.slug}`}
              type="article"
              publishedAt={data.post.publishedAt}
            />

            <article className="article-page">
              <header className="article-header">
                {data.post.category ? (
                  <Link
                    to={`/edition/category/${data.post.category.slug}`}
                    className="article-category"
                  >
                    {data.post.category.name}
                  </Link>
                ) : null}

                <h1 className="article-title">{data.post.title}</h1>
                <p className="article-standfirst">{data.post.excerpt}</p>

                <p className="article-byline">
                  By {settings.authorName} · {formatDate(data.post.publishedAt)} ·{" "}
                  {data.post.readingMinutes} min read
                </p>
                <hr className="fancy-divider" />
              </header>

              {data.post.coverImageUrl ? (
                <figure className="article-cover">
                  <img src={data.post.coverImageUrl} alt={data.post.coverImageAlt} />
                </figure>
              ) : null}

              <div className="article-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {data.post.contentMarkdown}
                </ReactMarkdown>
              </div>

              {data.post.tags.length > 0 ? (
                <footer className="article-tags">
                  {data.post.tags.map((tag) => (
                    <Link key={tag.slug} to={`/edition/tag/${tag.slug}`} className="article-tag">
                      #{tag.name}
                    </Link>
                  ))}
                </footer>
              ) : null}
            </article>

            {data.related.length > 0 ? (
              <section className="related-section">
                <div className="section-header">
                  <hr className="section-divider-long" />
                  <h2 className="section-title">Related Reading</h2>
                  <hr className="section-divider-long" />
                </div>
                <div className="post-grid">
                  {data.related.map((post) => (
                    <PostCard key={post.slug} post={post} compact />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}

        <SiteFooter
          settings={settings}
          socialLinks={socialLinks}
          sections={sections}
          anchorsAreLocal={false}
        />
      </div>
    </>
  );
}
