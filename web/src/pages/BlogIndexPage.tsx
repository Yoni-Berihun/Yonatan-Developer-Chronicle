import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router-dom";
import Masthead from "../components/Masthead";
import PostCard from "../components/PostCard";
import Seo from "../components/Seo";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { api } from "../lib/api";
import type { PostListResponse, Taxonomy } from "../lib/types";
import { useSite } from "../lib/useSite";

export default function BlogIndexPage() {
  const { categorySlug, tagSlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Number(searchParams.get("page") ?? "1");
  const search = searchParams.get("q") ?? "";

  const site = useSite();

  const query = new URLSearchParams({ page: String(page), perPage: "9" });
  if (categorySlug) query.set("category", categorySlug);
  if (tagSlug) query.set("tag", tagSlug);
  if (search) query.set("q", search);

  const posts = useQuery({
    queryKey: ["posts", query.toString()],
    queryFn: () => api.get<PostListResponse>(`/public/posts?${query.toString()}`),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const taxonomy = useQuery({
    queryKey: ["taxonomy"],
    queryFn: () => api.get<Taxonomy>("/public/taxonomy"),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const activeCategory = taxonomy.data?.categories.find((c) => c.slug === categorySlug);
  const activeTag = taxonomy.data?.tags.find((t) => t.slug === tagSlug);

  const heading = activeCategory?.name ?? (activeTag ? `#${activeTag.name}` : "The Latest Edition");
  const description =
    activeCategory?.description ??
    "Dispatches from the desk — notes on building, learning and shipping software.";

  const setPage = (next: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(next));
    setSearchParams(params);
  };

  if (!site.data) {
    return (
      <div className="boot-screen">
        <p className="boot-title">THE YONATAN TIMES</p>
        <p className="boot-note">The presses are warming up…</p>
      </div>
    );
  }

  const { settings, sections, socialLinks } = site.data;
  const pagination = posts.data?.pagination;

  return (
    <>
      <Seo
        title={`${heading} | ${settings.siteTitle}`}
        description={description}
        canonical={categorySlug ? `/edition/category/${categorySlug}` : "/edition"}
      />

      <div className="super-header" />

      <div className="container">
        <SiteHeader settings={settings} sections={sections} anchorsAreLocal={false} />
        <Masthead
          title={settings.siteTitle}
          subtitle={settings.editionLabel || settings.siteSubtitle}
        />

        <section className="edition-page">
          <div className="section-header">
            <hr className="section-divider-long" />
            <h1 className="section-title">{heading}</h1>
            <p className="editorial-subtitle">{description}</p>
            <hr className="section-divider-long" />
          </div>

          <div className="edition-toolbar">
            <form
              className="edition-search"
              onSubmit={(event) => {
                event.preventDefault();
                const value = new FormData(event.currentTarget).get("q");
                const params = new URLSearchParams(searchParams);
                if (value) params.set("q", String(value));
                else params.delete("q");
                params.delete("page");
                setSearchParams(params);
              }}
            >
              <label htmlFor="edition-search-input" className="visually-hidden">
                Search articles
              </label>
              <input
                id="edition-search-input"
                type="search"
                name="q"
                defaultValue={search}
                placeholder="Search the archives…"
              />
              <button type="submit">Search</button>
            </form>

            {taxonomy.data && taxonomy.data.categories.length > 0 ? (
              <nav className="edition-categories" aria-label="Categories">
                <Link to="/edition" className={!categorySlug && !tagSlug ? "is-active" : undefined}>
                  All
                </Link>
                {taxonomy.data.categories
                  .filter((category) => category.postCount > 0)
                  .map((category) => (
                    <Link
                      key={category.slug}
                      to={`/edition/category/${category.slug}`}
                      className={category.slug === categorySlug ? "is-active" : undefined}
                    >
                      {category.name}
                    </Link>
                  ))}
              </nav>
            ) : null}
          </div>

          {posts.isLoading ? (
            <p className="loading-note">Setting the type…</p>
          ) : posts.data && posts.data.posts.length > 0 ? (
            <>
              <div className="post-grid">
                {posts.data.posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>

              {pagination && pagination.totalPages > 1 ? (
                <div className="pagination">
                  <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    ‹ Previous
                  </button>
                  <span>
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    Next ›
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <p className="empty-note">
              No articles here yet. The next edition is still being written.
            </p>
          )}
        </section>

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
