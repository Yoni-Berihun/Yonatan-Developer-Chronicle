import { Link } from "react-router-dom";
import { navigableSections, toNavLabel } from "../lib/sections";
import type { Section, SiteSettings, SocialLink } from "../lib/types";
import SocialIcon from "./SocialIcon";

interface Props {
  settings: SiteSettings;
  socialLinks: SocialLink[];
  sections: Section[];
  anchorsAreLocal?: boolean;
}

export default function SiteFooter({
  settings,
  socialLinks,
  sections,
  anchorsAreLocal = true,
}: Props) {
  const prefix = anchorsAreLocal ? "" : "/";
  const navigable = navigableSections(sections);

  return (
    <footer className="site-footer">
      <div className="footer-content">
        <div className="footer-column about">
          <h4 className="footer-title">About The Publication</h4>
          <p>{settings.footerAbout}</p>
        </div>

        <div className="footer-column navigation">
          <h4 className="footer-title">Navigate Sections</h4>
          <ul className="footer-links">
            <li>
              <Link to="/" className="footer-nav-link">
                Home
              </Link>
            </li>
            {navigable.map((section) => (
              <li key={section.id}>
                <a href={`${prefix}#${section.slug}`} className="footer-nav-link">
                  {toNavLabel(section)}
                </a>
              </li>
            ))}
            <li>
              <Link to="/edition" className="footer-nav-link">
                The Latest Edition
              </Link>
            </li>
            <li>
              <a href={`${prefix}#contact`} className="footer-nav-link">
                Contact
              </a>
            </li>
          </ul>
        </div>

        <div className="footer-column social">
          <h4 className="footer-title">Follow The Story</h4>
          <div className="social-links">
            {socialLinks.map((link) => (
              <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer">
                <SocialIcon platform={link.platform} />
                <span>{link.label}</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="footer-bottom-bar">
        <p>{settings.copyright}</p>
      </div>
    </footer>
  );
}
