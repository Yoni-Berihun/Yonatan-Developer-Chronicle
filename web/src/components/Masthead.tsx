interface Props {
  title: string;
  subtitle: string;
}

export default function Masthead({ title, subtitle }: Props) {
  return (
    <header className="masthead">
      <hr className="fancy-divider" />
      <h1 className="newspaper-title">{title}</h1>
      <p className="subtitle">{subtitle}</p>
      <hr className="fancy-divider" />
    </header>
  );
}
