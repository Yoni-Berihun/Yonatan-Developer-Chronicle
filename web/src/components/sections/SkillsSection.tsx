import type { Section } from "../../lib/types";

interface Props {
  section: Section;
}

export default function SkillsSection({ section }: Props) {
  if (section.skillCategories.length === 0) return null;

  return (
    <section id={section.slug} className="skills-section">
      <div className="editorial-header">
        <hr className="header-line" />
        <h2 className="editorial-title">{section.title}</h2>
        {section.subtitle ? <p className="editorial-subtitle">{section.subtitle}</p> : null}
        <hr className="header-line" />
      </div>

      <div className="skills-wrapper">
        <div className="skills-grid-three-col">
          {section.skillCategories.map((category) => (
            <div key={category.id} className="skills-block">
              <h3 className="skills-category-title">{category.title}</h3>
              <div className="skills-list">
                {category.items.map((item) => (
                  <div key={item.id} className="skill-item">
                    <div className="skill-content">
                      <p className="skill-description">
                        <strong>{item.heading}</strong> {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
