import { Resend } from "resend";
import { env, mailerConfigured } from "../env.js";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

interface ContactNotification {
  name: string;
  email: string;
  subject: string;
  message: string;
}

/**
 * Best-effort notification. The message is already persisted before this runs,
 * so a mail failure must never fail the visitor's request.
 */
export async function sendContactNotification(payload: ContactNotification): Promise<void> {
  if (!resend || !mailerConfigured || !env.CONTACT_NOTIFY_EMAIL) {
    console.info("Mailer not configured; contact message saved without notification.");
    return;
  }

  try {
    await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: env.CONTACT_NOTIFY_EMAIL,
      replyTo: payload.email,
      subject: `New dispatch: ${payload.subject}`,
      text: [
        `From: ${payload.name} <${payload.email}>`,
        `Subject: ${payload.subject}`,
        "",
        payload.message,
      ].join("\n"),
    });
  } catch (error) {
    console.error("Failed to send contact notification:", error);
  }
}
