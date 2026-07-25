import { Link } from "react-router-dom";
import type { PostSummary, RelatedPost } from "../lib/types";
import { formatDate } from "../lib/format";

interface Props {
  post: PostSummary | RelatedPost;
  compact?: boolean;
}

export default function PostCard({ post, compact = false }: Props) {
  const category = "category" in post ? post.category : null;
  const featured = "isFeatured" in post ? post.isFeatured : false;

  return (
    <article className={compact ? "post-card post-card--compact" : "post-card"}>
      <Link to={`/edition/${post.slug}`} className="post-card-link">
        {post.coverImageUrl ? (
          <div className="post-card-image">
            <img src={post.coverImageUrl} alt="" loading="lazy" />
          </div>
        ) : null}

        <div className="post-card-body">
          <p className="post-card-meta">
            {category ? <span className="post-card-category">{category.name}</span> : null}
            <span>{formatDate(post.publishedAt)}</span>
            <span>·</span>
            <span>{post.readingMinutes} min read</span>
            {featured ? <span className="post-card-badge">Front page</span> : null}
          </p>

          <h3 className="post-card-title">{post.title}</h3>
          <p className="post-card-excerpt">{post.excerpt}</p>
          <span className="post-card-more">Read the article ›</span>
        </div>
      </Link>
    </article>
  );
}
