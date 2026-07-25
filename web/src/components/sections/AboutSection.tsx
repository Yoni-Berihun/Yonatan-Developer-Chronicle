import type { SiteSettings } from "../../lib/types";

interface Props {
  settings: SiteSettings;
}

export default function AboutSection({ settings }: Props) {
  const [lead, ...rest] = settings.aboutParagraphs;

  return (
    <section id="main-content" className="main-content" aria-label="About the author">
      <article className="about-me">
        <h2 className="author-name">{settings.authorName}</h2>
        <h3 className="author-subtitle">{settings.authorSubtitle}</h3>

        {lead ? (
          <p>
            <span className="drop-cap">{lead.charAt(0)}</span>
            {lead.slice(1)}
          </p>
        ) : null}

        {rest.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </article>

      <aside className="portrait">
        <img
          className="portrait-float"
          src={settings.portraitUrl}
          alt={settings.portraitAlt}
          width={400}
          height={400}
        />
      </aside>
    </section>
  );
}
