import type { Section } from "../../lib/types";
import SocialIcon from "../SocialIcon";

interface Props {
  section: Section;
}

export default function CtaSection({ section }: Props) {
  const cta = section.cta;
  if (!cta) return null;

  return (
    <section id={section.slug} className="cv-download-section">
      <div className="cv-download-wrapper" data-decoration={cta.decoration ?? undefined}>
        <div className="cv-download-content">
          <div className="cv-download-text">
            <h3 className="cv-download-title">{cta.heading}</h3>
            {cta.subheading ? <p className="cv-download-subtitle">{cta.subheading}</p> : null}
          </div>
          <div className="cv-download-button-container">
            <a
              href={cta.buttonUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="cv-download-button"
            >
              <span className="cv-button-text">{cta.buttonLabel}</span>
              <div className="cv-button-icon">
                <SocialIcon platform={cta.icon ?? "link"} size={20} />
              </div>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
