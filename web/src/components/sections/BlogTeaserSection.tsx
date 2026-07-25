import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import type { PostListResponse, Section } from "../../lib/types";
import { formatDate } from "../../lib/format";
import PostCard from "../PostCard";

interface Props {
  section: Section;
}

export default function BlogTeaserSection({ section }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["posts", { perPage: 3 }],
    queryFn: () => api.get<PostListResponse>("/public/posts?perPage=3"),
  });

  const posts = data?.posts ?? [];
  if (!isLoading && posts.length === 0) return null;

  const [lead, ...rest] = posts;

  return (
    <section id={section.slug} className="blog-teaser-section">
      <div className="section-header">
        <hr className="section-divider-long" />
        <h2 className="section-title">{section.title}</h2>
        {section.subtitle ? <p className="editorial-subtitle">{section.subtitle}</p> : null}
        <hr className="section-divider-long" />
      </div>

      {isLoading ? (
        <p className="loading-note">Setting the type…</p>
      ) : (
        <>
          {lead ? (
            <article className="edition-lead">
              <Link to={`/edition/${lead.slug}`} className="edition-lead-link">
                {lead.coverImageUrl ? (
                  <div className="edition-lead-media">
                    <img src={lead.coverImageUrl} alt="" loading="lazy" />
                  </div>
                ) : (
                  <div className="edition-lead-media edition-lead-media--plain" aria-hidden="true">
                    <span>THE LATEST</span>
                  </div>
                )}
                <div className="edition-lead-copy">
                  <p className="edition-lead-kicker">
                    {lead.isFeatured ? "Front page" : "Latest dispatch"}
                    <span>·</span>
                    <span>{formatDate(lead.publishedAt)}</span>
                    <span>·</span>
                    <span>{lead.readingMinutes} min</span>
                  </p>
                  <h3 className="edition-lead-title">{lead.title}</h3>
                  <p className="edition-lead-excerpt">{lead.excerpt}</p>
                  <span className="edition-lead-more">Continue reading ›</span>
                </div>
              </Link>
            </article>
          ) : null}

          {rest.length > 0 ? (
            <div className="post-grid post-grid--teaser">
              {rest.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : null}

          <p className="section-footer-link">
            <Link to="/edition" className="read-all-link">
              Browse the full edition ›
            </Link>
          </p>
        </>
      )}
    </section>
  );
}
