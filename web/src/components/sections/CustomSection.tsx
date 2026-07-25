import type { ContentBlock, Section } from "../../lib/types";

interface Props {
  section: Section;
}

const str = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

function Block({ block }: { block: ContentBlock }) {
  const { data } = block;

  switch (block.type) {
    case "HEADING":
      return <h3 className="custom-heading">{str(data.text)}</h3>;

    case "PARAGRAPH":
      return <p className="custom-paragraph">{str(data.text)}</p>;

    case "IMAGE":
      return (
        <figure className="custom-figure">
          <img src={str(data.url)} alt={str(data.alt)} loading="lazy" />
          {str(data.caption) ? <figcaption>{str(data.caption)}</figcaption> : null}
        </figure>
      );

    case "QUOTE":
      return (
        <blockquote className="custom-quote">
          <p>{str(data.text)}</p>
          {str(data.attribution) ? <cite>— {str(data.attribution)}</cite> : null}
        </blockquote>
      );

    case "BUTTON":
      return (
        <p className="custom-button-row">
          <a
            className="cv-download-button"
            href={str(data.url, "#")}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="cv-button-text">{str(data.label, "Read more")}</span>
          </a>
        </p>
      );

    case "DIVIDER":
      return <hr className="section-divider-long" />;

    case "LIST": {
      const items = Array.isArray(data.items) ? data.items.map((item) => str(item)) : [];
      return (
        <ul className="custom-list">
          {items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      );
    }

    case "HTML":
      // Only an authenticated admin can create these, so the content is
      // first-party rather than user-generated.
      return (
        <div className="custom-html" dangerouslySetInnerHTML={{ __html: str(data.html) }} />
      );

    default:
      return null;
  }
}

export default function CustomSection({ section }: Props) {
  if (section.blocks.length === 0) return null;

  return (
    <section id={section.slug} className="custom-section">
      <div className="section-header">
        <hr className="section-divider-long" />
        <h2 className="section-title">{section.title}</h2>
        {section.subtitle ? <p className="editorial-subtitle">{section.subtitle}</p> : null}
        <hr className="section-divider-long" />
      </div>

      <div className="custom-section-body">
        {section.blocks.map((block) => (
          <Block key={block.id} block={block} />
        ))}
      </div>
    </section>
  );
}
