import { useState, type FormEvent } from "react";
import { ApiError, api } from "../../lib/api";

interface Props {
  intro: string;
}

type Status = "idle" | "sending" | "sent" | "error";

export default function ContactSection({ intro }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    setStatus("sending");
    setFieldErrors({});

    try {
      await api.post("/contact", {
        name: String(data.get("name") ?? ""),
        email: String(data.get("email") ?? ""),
        subject: String(data.get("subject") ?? ""),
        message: String(data.get("message") ?? ""),
        botField: String(data.get("bot-field") ?? ""),
      });

      form.reset();
      setStatus("sent");
      setMessage("Thank you — your message is on its way. I'll reply as soon as I can.");
    } catch (error) {
      setStatus("error");
      if (error instanceof ApiError) {
        setFieldErrors(error.fieldErrors);
        setMessage(error.message);
      } else {
        setMessage("The message could not be sent. Please try again in a moment.");
      }
    }
  }

  return (
    <section id="contact" className="contact-section">
      <div className="section-header">
        <hr className="section-divider-long" />
        <h2 className="section-title">Get In Touch</h2>
        <hr className="section-divider-long" />
      </div>

      <div className="contact-form-wrapper">
        <form className="contact-form" onSubmit={handleSubmit} noValidate>
          <p className="form-intro">{intro}</p>

          <p className="hidden-field" aria-hidden="true">
            <label>
              Don&apos;t fill this out if you&apos;re human:
              <input name="bot-field" tabIndex={-1} autoComplete="off" />
            </label>
          </p>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="full-name">Your Name</label>
              <input
                type="text"
                id="full-name"
                name="name"
                placeholder="e.g., Abebe Belachew..."
                required
                aria-invalid={Boolean(fieldErrors.name)}
              />
              {fieldErrors.name ? <span className="field-error">{fieldErrors.name}</span> : null}
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="e.g., abebe@gmail.com"
                required
                aria-invalid={Boolean(fieldErrors.email)}
              />
              {fieldErrors.email ? <span className="field-error">{fieldErrors.email}</span> : null}
            </div>

            <div className="form-group form-col-span-2">
              <label htmlFor="subject">Subject</label>
              <input
                type="text"
                id="subject"
                name="subject"
                placeholder="e.g., Project collaboration, Job opportunity, General inquiry..."
                required
                aria-invalid={Boolean(fieldErrors.subject)}
              />
              {fieldErrors.subject ? (
                <span className="field-error">{fieldErrors.subject}</span>
              ) : null}
            </div>

            <div className="form-group form-col-span-2">
              <label htmlFor="message">Message</label>
              <textarea
                id="message"
                name="message"
                rows={8}
                placeholder="Hi Yoni, I'd like to discuss..."
                required
                aria-invalid={Boolean(fieldErrors.message)}
              />
              {fieldErrors.message ? (
                <span className="field-error">{fieldErrors.message}</span>
              ) : null}
            </div>

            <div className="form-group form-col-span-2">
              <button type="submit" className="dispatch-button" disabled={status === "sending"}>
                <svg
                  className="dispatch-icon"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
                {status === "sending" ? "Dispatching…" : "Dispatch Message"}
              </button>
            </div>

            {message ? (
              <div className="form-group form-col-span-2">
                <p
                  className={status === "sent" ? "form-feedback is-success" : "form-feedback is-error"}
                  role="status"
                >
                  {message}
                </p>
              </div>
            ) : null}
          </div>
        </form>
      </div>
    </section>
  );
}
