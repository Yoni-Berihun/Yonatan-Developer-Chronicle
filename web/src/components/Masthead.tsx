interface Props {
  title: string;
  subtitle: string;
  /** Short vision line under the strap — home page only. */
  tagline?: string;
}

export default function Masthead({ title, subtitle, tagline }: Props) {
  return (
    <header className="masthead masthead-live">
      <hr className="fancy-divider" />
      <h1 className="newspaper-title">{title}</h1>
      <p className="subtitle">{subtitle}</p>
      {tagline ? <p className="masthead-tagline">{tagline}</p> : null}
      <hr className="fancy-divider" />
    </header>
  );
}
