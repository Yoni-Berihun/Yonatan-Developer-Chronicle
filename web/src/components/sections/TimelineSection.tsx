import type { Section } from "../../lib/types";

interface Props {
  section: Section;
}

export default function TimelineSection({ section }: Props) {
  if (section.timelineEntries.length === 0 && section.stats.length === 0) return null;

  return (
    <section id={section.slug} className="journey-section">
      <div className="section-header">
        <hr className="section-divider-long" />
        <h2 className="section-title">{section.title}</h2>
        {section.subtitle ? <p className="editorial-subtitle">{section.subtitle}</p> : null}
        <hr className="section-divider-long" />
      </div>

      <div className="journey-grid">
        <div className="timeline">
          {section.timelineEntries.map((entry) => (
            <div key={entry.id} className="timeline-item">
              <div className="timeline-content">
                {entry.logoUrl ? (
                  <div className="timeline-logo">
                    <img src={entry.logoUrl} alt={entry.logoAlt || entry.title} loading="lazy" />
                  </div>
                ) : null}
                <div className="timeline-text">
                  <p className="timeline-date">{entry.dateLabel}</p>
                  <h3 className="timeline-title">{entry.title}</h3>
                  <hr className="timeline-divider" />
                  <p className="timeline-description">{entry.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {section.stats.length > 0 ? (
          <aside className="career-stats-column">
            <h3 className="stats-title">By the Numbers</h3>
            {section.stats.map((stat) => (
              <div key={stat.id} className="stat-card">
                <span className="stat-number">{stat.value}</span>
                <p className="stat-label">{stat.label}</p>
              </div>
            ))}
          </aside>
        ) : null}
      </div>
    </section>
  );
}
