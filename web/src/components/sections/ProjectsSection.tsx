import clsx from "clsx";
import type { Section } from "../../lib/types";
import SocialIcon from "../SocialIcon";

interface Props {
  section: Section;
}

export default function ProjectsSection({ section }: Props) {
  if (section.projects.length === 0) return null;

  return (
    <section id={section.slug} className="projects-section">
      <div className="section-header">
        <hr className="section-divider-long" />
        <h2 className="section-title">{section.title}</h2>
        {section.subtitle ? <p className="editorial-subtitle">{section.subtitle}</p> : null}
        <hr className="section-divider-long" />
      </div>

      <div className="projects-grid">
        {section.projects.map((project) => {
          const isLink = Boolean(project.linkUrl) && !project.isArchived;
          const Wrapper = isLink ? "a" : "div";

          return (
            <Wrapper
              key={project.id}
              className="project-item"
              {...(isLink
                ? { href: project.linkUrl!, target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              <div className="project-image-wrapper">
                <img
                  src={project.imageUrl}
                  alt={project.imageAlt || `${project.title} screenshot`}
                  loading="lazy"
                />
              </div>

              <div className="project-content">
                <div>
                  <p className="project-category">{project.category}</p>
                  <h3 className="project-title">{project.title}</h3>
                  <p className="project-description">{project.description}</p>
                </div>

                <div className="project-footer">
                  <div className="project-tech-list">
                    {project.techTags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>

                  <div className="project-links">
                    <span className={clsx("project-link", project.isArchived && "disabled-link")}>
                      {project.isArchived ? "Archived" : project.linkLabel} ›
                    </span>
                    <div className="project-link-icon">
                      <SocialIcon platform="github" size={20} />
                    </div>
                  </div>
                </div>
              </div>
            </Wrapper>
          );
        })}
      </div>
    </section>
  );
}
