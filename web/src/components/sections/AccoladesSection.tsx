import { useEffect, useState } from "react";
import type { Section } from "../../lib/types";

interface Props {
  section: Section;
}

export default function AccoladesSection({ section }: Props) {
  const total = section.accolades.length;
  const [index, setIndex] = useState(0);

  // Deleting an accolade in the admin can leave the index past the end.
  useEffect(() => {
    if (index > total - 1) setIndex(0);
  }, [index, total]);

  if (total === 0) return null;

  const go = (delta: number) => setIndex((current) => (current + delta + total) % total);
  const safeIndex = Math.min(index, total - 1);

  return (
    <section id={section.slug} className="accolades-section">
      <div className="section-header">
        <hr className="section-divider-long" />
        <h2 className="section-title">{section.title}</h2>
        {section.subtitle ? <p className="editorial-subtitle">{section.subtitle}</p> : null}
        <hr className="section-divider-long" />
      </div>

      <div className="accolades-gallery">
        <div
          className="accolades-wrapper"
          style={{
            width: `${total * 100}%`,
            transform: `translateX(-${(safeIndex * 100) / total}%)`,
          }}
        >
          {section.accolades.map((accolade) => (
            <div
              key={accolade.id}
              className="accolade-item"
              style={{ width: `${100 / total}%` }}
              aria-hidden={accolade.id !== section.accolades[safeIndex]?.id}
            >
              <div className="accolade-image">
                <img
                  src={accolade.imageUrl}
                  alt={accolade.imageAlt || accolade.title}
                  loading="lazy"
                />
              </div>
              <div className="accolade-content">
                <p className="accolade-date">{accolade.dateLabel}</p>
                <h3 className="accolade-title">{accolade.title}</h3>
                <p className="accolade-publication">{accolade.issuer}</p>
                <p className="accolade-description">{accolade.description}</p>
              </div>
            </div>
          ))}
        </div>

        {total > 1 ? (
          <>
            <div className="gallery-navigation">
              <button
                type="button"
                className="gallery-nav-button prev"
                onClick={() => go(-1)}
                aria-label="Previous award"
              >
                ‹
              </button>
              <button
                type="button"
                className="gallery-nav-button next"
                onClick={() => go(1)}
                aria-label="Next award"
              >
                ›
              </button>
            </div>

            <div className="gallery-dots" role="tablist" aria-label="Awards">
              {section.accolades.map((accolade, dotIndex) => (
                <button
                  key={accolade.id}
                  type="button"
                  role="tab"
                  aria-selected={dotIndex === safeIndex}
                  aria-label={`Show ${accolade.title}`}
                  className={dotIndex === safeIndex ? "is-active" : undefined}
                  onClick={() => setIndex(dotIndex)}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
