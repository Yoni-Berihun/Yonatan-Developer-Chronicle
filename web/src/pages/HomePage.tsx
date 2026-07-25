import Masthead from "../components/Masthead";
import Seo from "../components/Seo";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import AboutSection from "../components/sections/AboutSection";
import AccoladesSection from "../components/sections/AccoladesSection";
import BlogTeaserSection from "../components/sections/BlogTeaserSection";
import ContactSection from "../components/sections/ContactSection";
import CtaSection from "../components/sections/CtaSection";
import CustomSection from "../components/sections/CustomSection";
import ProjectsSection from "../components/sections/ProjectsSection";
import SkillsSection from "../components/sections/SkillsSection";
import TimelineSection from "../components/sections/TimelineSection";
import { useSite } from "../lib/useSite";
import type { Section } from "../lib/types";

function renderSection(section: Section) {
  switch (section.type) {
    case "PROJECTS":
      return <ProjectsSection key={section.id} section={section} />;
    case "SKILLS":
      return <SkillsSection key={section.id} section={section} />;
    case "TIMELINE":
      return <TimelineSection key={section.id} section={section} />;
    case "ACCOLADES":
      return <AccoladesSection key={section.id} section={section} />;
    case "BLOG_TEASER":
      return <BlogTeaserSection key={section.id} section={section} />;
    case "CTA":
      return <CtaSection key={section.id} section={section} />;
    case "CUSTOM":
      return <CustomSection key={section.id} section={section} />;
    default:
      return null;
  }
}

export default function HomePage() {
  const { data, isLoading, isError, error, refetch } = useSite();

  if (isLoading) {
    return (
      <div className="boot-screen">
        <p className="boot-title">THE YONATAN TIMES</p>
        <p className="boot-note">The presses are warming up…</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="boot-screen">
        <p className="boot-title">Stop the press</p>
        <p className="boot-note">
          {error instanceof Error ? error.message : "The edition could not be loaded."}
        </p>
        <button type="button" className="dispatch-button" onClick={() => void refetch()}>
          Try again
        </button>
      </div>
    );
  }

  const { settings, sections, socialLinks } = data;

  return (
    <>
      <Seo
        title={settings.metaTitle}
        description={settings.metaDescription}
        image={settings.ogImageUrl}
        canonical={settings.canonicalUrl ?? "/"}
      />

      <div className="super-header" />

      <div className="container">
        <SiteHeader settings={settings} sections={sections} />
        <Masthead title={settings.siteTitle} subtitle={settings.siteSubtitle} />
        <AboutSection settings={settings} />
        {sections.map(renderSection)}
        <ContactSection intro={settings.contactIntro} />
        <SiteFooter settings={settings} socialLinks={socialLinks} sections={sections} />
      </div>
    </>
  );
}
