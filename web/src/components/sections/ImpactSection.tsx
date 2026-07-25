import { useCallback, useEffect, useRef, useState, type TouchEvent } from "react";
import type { Section } from "../../lib/types";

interface Props {
  section: Section;
}

export default function ImpactSection({ section }: Props) {
  const stories = section.impactStories ?? [];
  const metrics = section.impactMetrics ?? [];
  const total = stories.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const metricsRef = useRef<HTMLUListElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const [metricsVisible, setMetricsVisible] = useState(false);

  useEffect(() => {
    if (index > total - 1) setIndex(0);
  }, [index, total]);

  const go = useCallback(
    (delta: number) => {
      if (total < 2) return;
      setDirection(delta >= 0 ? "next" : "prev");
      setIndex((current) => (current + delta + total) % total);
    },
    [total],
  );

  useEffect(() => {
    if (total < 2 || paused) return;
    const id = window.setInterval(() => go(1), 6500);
    return () => window.clearInterval(id);
  }, [total, paused, go]);

  useEffect(() => {
    const node = metricsRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setMetricsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const node = stageRef.current;
    if (!node || total < 2) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        go(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        go(-1);
      } else if (event.key === " ") {
        event.preventDefault();
        setPaused((value) => !value);
      }
    };

    node.addEventListener("keydown", onKeyDown);
    return () => node.removeEventListener("keydown", onKeyDown);
  }, [go, total]);

  if (total === 0 && metrics.length === 0) return null;

  const safeIndex = total === 0 ? 0 : Math.min(index, total - 1);
  const active = stories[safeIndex];

  const onTouchStart = (event: TouchEvent) => {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
    setPaused(true);
  };

  const onTouchEnd = (event: TouchEvent) => {
    const start = touchStartX.current;
    const end = event.changedTouches[0]?.clientX;
    touchStartX.current = null;
    setPaused(false);
    if (start == null || end == null) return;
    const delta = end - start;
    if (Math.abs(delta) < 48) return;
    go(delta < 0 ? 1 : -1);
  };

  return (
    <section id={section.slug} className="impact-section" aria-label={section.title}>
      <div className="section-header">
        <hr className="section-divider-long" />
        <h2 className="section-title">{section.title}</h2>
        {section.subtitle ? <p className="editorial-subtitle">{section.subtitle}</p> : null}
        <hr className="section-divider-long" />
      </div>

      <p className="impact-manifesto">
        Code is the craft. <em>Impact is the point.</em> Relentless in the editor — and in the room
        where people learn.
      </p>

      {metrics.length > 0 ? (
        <ul
          ref={metricsRef}
          className={`impact-metrics${metricsVisible ? " is-visible" : ""}`}
          aria-label="Impact at a glance"
        >
          {metrics.map((metric, metricIndex) => (
            <li
              key={metric.id}
              className="impact-metric"
              style={{ transitionDelay: `${metricIndex * 90}ms` }}
            >
              <span className="impact-metric-value">{metric.value}</span>
              <span className="impact-metric-label">{metric.label}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {active ? (
        <div
          className="impact-carousel"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div
            ref={stageRef}
            className="impact-stage"
            tabIndex={0}
            role="region"
            aria-roledescription="carousel"
            aria-label="Impact stories"
            aria-live="polite"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {stories.map((story, storyIndex) => (
              <figure
                key={story.id}
                className={[
                  "impact-slide",
                  storyIndex === safeIndex ? "is-active" : "",
                  storyIndex === safeIndex ? `from-${direction}` : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-hidden={storyIndex !== safeIndex}
              >
                <img
                  src={story.imageUrl}
                  alt={story.imageAlt || story.title}
                  loading={storyIndex === 0 ? "eager" : "lazy"}
                  draggable={false}
                />
                <figcaption className="impact-caption">
                  <p className="impact-kicker">
                    {story.dateLabel}
                    <span className="impact-count">
                      {safeIndex + 1} / {total}
                    </span>
                  </p>
                  <h3 className="impact-slide-title">{story.title}</h3>
                  <p className="impact-summary">{story.summary}</p>
                </figcaption>
              </figure>
            ))}

            {total > 1 ? (
              <>
                <button
                  type="button"
                  className="impact-hotzone prev"
                  aria-label="Previous impact story"
                  onClick={() => go(-1)}
                />
                <button
                  type="button"
                  className="impact-hotzone next"
                  aria-label="Next impact story"
                  onClick={() => go(1)}
                />
              </>
            ) : null}

            <div className="impact-progress" aria-hidden="true">
              <span
                key={`${safeIndex}-${paused}`}
                className={`impact-progress-bar${paused ? " is-paused" : ""}`}
              />
            </div>
          </div>

          {total > 1 ? (
            <div className="impact-controls">
              <button
                type="button"
                className="impact-nav prev"
                onClick={() => go(-1)}
                aria-label="Previous impact story"
              >
                ‹
              </button>

              <button
                type="button"
                className="impact-pause"
                onClick={() => setPaused((value) => !value)}
                aria-pressed={paused}
                aria-label={paused ? "Play carousel" : "Pause carousel"}
              >
                {paused ? "Play" : "Pause"}
              </button>

              <div className="impact-thumbs" role="tablist" aria-label="Impact stories">
                {stories.map((story, thumbIndex) => (
                  <button
                    key={story.id}
                    type="button"
                    role="tab"
                    aria-selected={thumbIndex === safeIndex}
                    aria-label={`Show ${story.title}`}
                    className={`impact-thumb${thumbIndex === safeIndex ? " is-active" : ""}`}
                    onClick={() => {
                      setDirection(thumbIndex > safeIndex ? "next" : "prev");
                      setIndex(thumbIndex);
                    }}
                  >
                    <img src={story.imageUrl} alt="" />
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="impact-nav next"
                onClick={() => go(1)}
                aria-label="Next impact story"
              >
                ›
              </button>
            </div>
          ) : null}

          <p className="impact-hint">Swipe, use arrow keys, or click the sides of the frame</p>
        </div>
      ) : null}
    </section>
  );
}
