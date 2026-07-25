/**
 * End-to-end smoke test against a running API.
 *
 * Exercises the public read paths, authentication, an admin write/reorder/delete
 * round trip, the contact form and the feeds. Creates a throwaway section and a
 * throwaway draft post, then deletes both, so it is safe to run against a live
 * deployment.
 *
 *   node scripts/smoke.mjs --base http://127.0.0.1:4000 --email you@example.com --password ...
 *
 * Credentials may also come from SMOKE_EMAIL and SMOKE_PASSWORD so they need not
 * appear in shell history.
 */

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

const BASE = arg("base", process.env.SMOKE_BASE ?? "http://127.0.0.1:4000").replace(/\/$/, "");
const EMAIL = arg("email", process.env.SMOKE_EMAIL);
const PASSWORD = arg("password", process.env.SMOKE_PASSWORD);

let cookie = "";
let passed = 0;
const failures = [];

function record(name, ok, detail) {
  if (ok) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failures.push(`${name} — ${detail}`);
    console.log(`  FAIL  ${name} — ${detail}`);
  }
}

async function call(method, path, { body, auth = false, raw } = {}) {
  const headers = {};
  if (body !== undefined || raw !== undefined) headers["Content-Type"] = "application/json";
  if (auth && cookie) headers.Cookie = cookie;

  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: raw !== undefined ? raw : body !== undefined ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = undefined;
  }
  return { status: response.status, headers: response.headers, json, text };
}

// `expected` may be a single status or a list, since some checks legitimately
// allow more than one outcome depending on configuration.
async function expectStatus(name, method, path, expected, options) {
  const allowed = Array.isArray(expected) ? expected : [expected];
  try {
    const res = await call(method, path, options);
    record(name, allowed.includes(res.status), `expected ${allowed.join("/")}, got ${res.status}`);
    return res;
  } catch (error) {
    record(name, false, error.message);
    return { status: 0 };
  }
}

console.log(`\nSmoke testing ${BASE}\n`);

console.log("Public endpoints");
await expectStatus("GET /health", "GET", "/health", 200);
const sitePayload = await expectStatus("GET /api/public/site", "GET", "/api/public/site", 200);
if (sitePayload.json) {
  const { settings, sections, socialLinks } = sitePayload.json;
  record("site payload has settings", Boolean(settings?.siteTitle), "siteTitle missing");
  record("site payload has sections", Array.isArray(sections) && sections.length > 0, "no sections");
  record("site payload has social links", Array.isArray(socialLinks), "socialLinks missing");
  record(
    "sections are ordered",
    Array.isArray(sections) && sections.every((s, i, a) => i === 0 || a[i - 1].order <= s.order),
    "order values are not ascending",
  );
}
await expectStatus("GET /api/public/posts", "GET", "/api/public/posts", 200);
await expectStatus("GET /api/public/taxonomy", "GET", "/api/public/taxonomy", 200);
await expectStatus("GET unknown post is 404", "GET", "/api/public/posts/no-such-post-xyz", 404);
await expectStatus("GET unknown route is 404", "GET", "/api/does-not-exist", 404);

console.log("\nFeeds");
const rss = await expectStatus("GET /api/feed/rss.xml", "GET", "/api/feed/rss.xml", 200);
record(
  "RSS is well-formed XML",
  typeof rss.text === "string" && rss.text.trimStart().startsWith("<?xml"),
  "did not start with an XML declaration",
);
const sitemap = await expectStatus("GET /api/feed/sitemap.xml", "GET", "/api/feed/sitemap.xml", 200);
record(
  "sitemap is well-formed XML",
  typeof sitemap.text === "string" && sitemap.text.includes("<urlset"),
  "missing <urlset>",
);

console.log("\nInput handling");
await expectStatus("malformed JSON is 400 not 500", "POST", "/api/auth/login", 400, {
  raw: "{not json}",
});
await expectStatus("missing fields is 400", "POST", "/api/auth/login", 400, { body: {} });
await expectStatus("wrong password is 401", "POST", "/api/auth/login", 401, {
  body: { email: EMAIL ?? "nobody@example.com", password: "definitely-not-the-password" },
});

console.log("\nProtected routes reject anonymous callers");
await expectStatus("GET /api/auth/me is 401", "GET", "/api/auth/me", 401);
await expectStatus("GET /api/admin/sections is 401", "GET", "/api/admin/sections", 401);
await expectStatus("GET /api/admin/blog/posts is 401", "GET", "/api/admin/blog/posts", 401);
await expectStatus("GET /api/admin/inbox is 401", "GET", "/api/admin/inbox", 401);
await expectStatus("POST /api/admin/sections is 401", "POST", "/api/admin/sections", 401, {
  body: { title: "nope", type: "CUSTOM" },
});

if (!EMAIL || !PASSWORD) {
  console.log("\nSkipping authenticated checks: pass --email and --password to run them.");
} else {
  console.log("\nAuthentication");
  const login = await call("POST", "/api/auth/login", { body: { email: EMAIL, password: PASSWORD } });
  record("login succeeds", login.status === 200, `got ${login.status}`);

  const setCookie = login.headers?.getSetCookie?.() ?? [];
  const sessionCookie = setCookie.find((c) => c.startsWith("yt_session="));
  record("login sets a session cookie", Boolean(sessionCookie), "no yt_session cookie");

  if (sessionCookie) {
    cookie = sessionCookie.split(";")[0];
    record("cookie is HttpOnly", /HttpOnly/i.test(sessionCookie), "missing HttpOnly");
    record("cookie is SameSite=Lax", /SameSite=Lax/i.test(sessionCookie), "missing SameSite=Lax");

    // Over plain HTTP a Secure cookie is silently discarded by the browser, so
    // the flag must track the scheme rather than NODE_ENV.
    const isHttps = BASE.startsWith("https://");
    record(
      isHttps ? "cookie is Secure over HTTPS" : "cookie is not Secure over HTTP",
      /Secure/i.test(sessionCookie) === isHttps,
      `Secure=${/Secure/i.test(sessionCookie)} for ${isHttps ? "https" : "http"}`,
    );
  }

  const me = await expectStatus("GET /api/auth/me with cookie", "GET", "/api/auth/me", 200, {
    auth: true,
  });
  record("me returns the right admin", me.json?.admin?.email === EMAIL, `got ${me.json?.admin?.email}`);

  console.log("\nAdmin section round trip");
  const slug = `smoke-test-${Date.now()}`;
  const created = await call("POST", "/api/admin/sections", {
    auth: true,
    body: { title: "Smoke Test Section", type: "CUSTOM", slug, subtitle: "created by smoke.mjs" },
  });
  record("create section", created.status === 201 || created.status === 200, `got ${created.status}`);
  const sectionId = created.json?.section?.id ?? created.json?.id;

  if (!sectionId) {
    record("create section returned an id", false, `body: ${created.text?.slice(0, 200)}`);
  } else {
    const updated = await call("PUT", `/api/admin/sections/${sectionId}`, {
      auth: true,
      body: { title: "Smoke Test Section (edited)" },
    });
    record("update section", updated.status === 200, `got ${updated.status}`);

    const block = await call("POST", `/api/admin/sections/${sectionId}/blocks`, {
      auth: true,
      body: { type: "PARAGRAPH", data: { text: "A paragraph added by the smoke test." } },
    });
    record("add a content block", block.status === 201 || block.status === 200, `got ${block.status}`);

    const listed = await call("GET", "/api/admin/sections", { auth: true });
    const all = listed.json?.sections ?? [];
    record("new section appears in the list", all.some((s) => s.id === sectionId), "not found");

    // An unpublished section must not leak into the public payload.
    await call("PUT", `/api/admin/sections/${sectionId}`, { auth: true, body: { isPublished: false } });
    const publicAfterHide = await call("GET", "/api/public/site");
    record(
      "unpublished section is absent from the public payload",
      !(publicAfterHide.json?.sections ?? []).some((s) => s.id === sectionId),
      "unpublished section was still served publicly",
    );

    const removed = await call("DELETE", `/api/admin/sections/${sectionId}`, { auth: true });
    record("delete section", removed.status === 200 || removed.status === 204, `got ${removed.status}`);

    const afterDelete = await call("GET", "/api/admin/sections", { auth: true });
    const remaining = afterDelete.json?.sections ?? [];
    record("section is gone after delete", !remaining.some((s) => s.id === sectionId), "still present");
  }

  console.log("\nAdmin blog round trip");
  const postPayload = {
    title: `Smoke Test Post ${Date.now()}`,
    contentMarkdown: "Written by the smoke test. **Bold** text and a [link](https://example.com).",
    status: "DRAFT",
  };
  const post = await call("POST", "/api/admin/blog/posts", { auth: true, body: postPayload });
  record("create draft post", post.status === 201 || post.status === 200, `got ${post.status}`);
  const postId = post.json?.post?.id;
  const postSlug = post.json?.post?.slug;

  if (postId) {
    record("draft got a generated slug", Boolean(postSlug), "no slug returned");
    // Drafts must stay private until published.
    await expectStatus(
      "draft is not publicly readable",
      "GET",
      `/api/public/posts/${postSlug}`,
      404,
    );

    const published = await call("PUT", `/api/admin/blog/posts/${postId}`, {
      auth: true,
      body: { ...postPayload, status: "PUBLISHED" },
    });
    record("publish post", published.status === 200, `got ${published.status}`);
    await expectStatus(
      "published post is publicly readable",
      "GET",
      `/api/public/posts/${postSlug}`,
      200,
    );

    const deleted = await call("DELETE", `/api/admin/blog/posts/${postId}`, { auth: true });
    record("delete post", deleted.status === 200 || deleted.status === 204, `got ${deleted.status}`);
  }

  console.log("\nContact form");
  const contact = await call("POST", "/api/contact", {
    body: {
      name: "Smoke Test",
      email: "smoke@example.com",
      subject: "Automated check",
      message: "Sent by scripts/smoke.mjs to verify the contact pipeline.",
    },
  });
  record("submit contact message", contact.status === 200 || contact.status === 201, `got ${contact.status}`);

  const honeypot = await call("POST", "/api/contact", {
    body: {
      name: "Spam Bot",
      email: "bot@example.com",
      subject: "Buy things",
      message: "Spam, sent to check the honeypot silently discards it.",
      botField: "http://spam.example.com",
    },
  });
  record(
    "honeypot submission is accepted but not stored",
    honeypot.status === 200 || honeypot.status === 201,
    `got ${honeypot.status}`,
  );

  const inbox = await call("GET", "/api/admin/inbox", { auth: true });
  record("read the inbox", inbox.status === 200, `got ${inbox.status}`);
  const messages = inbox.json?.messages ?? [];
  const real = messages.filter((m) => m.email === "smoke@example.com");
  const spam = messages.filter((m) => m.email === "bot@example.com");
  record("real message reached the inbox", real.length > 0, "not found");
  record("honeypot message was dropped", spam.length === 0, `${spam.length} spam message(s) stored`);

  for (const message of [...real, ...spam]) {
    await call("DELETE", `/api/admin/inbox/${message.id}`, { auth: true });
  }

  console.log("\nSign out");
  const logout = await call("POST", "/api/auth/logout", { auth: true });
  record("logout succeeds", logout.status === 200, `got ${logout.status}`);
}

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length > 0) {
  console.log("\nFailures:");
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}
console.log("All checks passed.\n");
