import { Link } from "react-router-dom";
import Seo from "../components/Seo";

export default function NotFoundPage() {
  return (
    <>
      <Seo
        title="Page not found | The Yonatan Times"
        description="This page is not part of any edition."
        noIndex
      />
      <div className="boot-screen">
        <p className="boot-kicker">404</p>
        <p className="boot-title">This page never went to print</p>
        <p className="boot-note">
          The link may be out of date, or the story was pulled before the edition shipped.
        </p>
        <Link to="/" className="read-all-link">
          Return to the front page ›
        </Link>
      </div>
    </>
  );
}
