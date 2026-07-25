import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import type { PostListResponse, Section } from "../../lib/types";
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
          <div className="post-grid">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>

          <p className="section-footer-link">
            <Link to="/edition" className="read-all-link">
              Read every edition ›
            </Link>
          </p>
        </>
      )}
    </section>
  );
}
