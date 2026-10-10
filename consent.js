import { authorizationId, isClaude, looksLikeEmail, redirectHost, returnUrl } from "./consent-lib.js";

const SUPABASE_URL = "https://kfoixcqdvxesxtnkmedo.supabase.co";
const SUPABASE_KEY = "sb_publishable_BOEZlDkG0mouaeeOopkPzw_YBLvG_XF";

const app = document.getElementById("app");
const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  for (const k of kids) e.append(k);
  return e;
};
const show = (...kids) => app.replaceChildren(el("div", { class: "card" }, ...kids));
const errorLine = (msg) => el("p", { class: "error" }, msg);

// "implicit": the email link carries the sign-in itself, so it works in whichever
// browser or device opens it (PKCE would need the same browser that asked).
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { flowType: "implicit", detectSessionInUrl: true, persistSession: true },
});

const id = authorizationId(location.href);

async function main() {
  if (!id) {
    show(
      el("h1", {}, "Meeting Library"),
      el("p", {}, "This page lets you approve Claude's read-only access to your meetings."),
      el("p", { class: "muted" }, "Open it from Claude: Settings › Connectors › Meeting Library › Connect."),
    );
    return;
  }
  const { data: { session }, error } = await db.auth.getSession();
  const fromLink = new URLSearchParams(location.hash.slice(1));
  if (!session && fromLink.get("error_code") === "otp_expired") {
    return signIn("That sign-in link was already used or has expired. Ask for a new one.");
  }
  if (!session) return signIn(error ? `Sign-in failed: ${error.message}` : undefined);
  return consent(session);
}

function signIn(message) {
  const input = el("input", { type: "email", placeholder: "Your email address", "aria-label": "Email" });
  const button = el("button", { class: "primary" }, "Email me a sign-in link");
  const status = el("p", { class: "muted" }, "Use the email of your Meeting Library account.");
  button.addEventListener("click", async () => {
    if (!looksLikeEmail(input.value)) {
      status.className = "error";
      status.textContent = "Please enter a valid email address.";
      return;
    }
    button.disabled = true;
    const { error } = await db.auth.signInWithOtp({
      email: input.value.trim(),
      options: { shouldCreateUser: false, emailRedirectTo: returnUrl(location.href, id) },
    });
    button.disabled = false;
    status.className = error ? "error" : "";
    status.textContent = error
      ? `Could not send the email: ${error.message}`
      : "Check your email and click Sign in once. Any browser works; the page continues there.";
  });
  show(
    el("h1", {}, "Sign in to Meeting Library"),
    el("p", {}, "To let Claude read your meetings, first confirm it's you."),
    message ? errorLine(message) : "",
    el("div", { class: "row" }, input, button),
    status,
  );
}

async function consent(session) {
  const { data, error } = await db.auth.oauth.getAuthorizationDetails(id);
  if (error) {
    if (/session|jwt|expired/i.test(error.message)) return signIn("Your sign-in expired. Please sign in again.");
    show(
      el("h1", {}, "This request can't be completed"),
      errorLine(error.message),
      el("p", { class: "muted" }, "Go back to Claude and start connecting again."),
    );
    return;
  }
  // Already approved earlier: continue straight back to the app.
  if (!data.authorization_id && data.redirect_url) {
    location.assign(data.redirect_url);
    return;
  }
  const host = redirectHost(data.redirect_uri);
  const name = data.client?.name || "An application";
  const approve = el("button", { class: "primary" }, "Allow read-only access");
  const deny = el("button", {}, "Deny");
  const busy = (b) => [approve, deny].forEach((x) => (x.disabled = b));
  approve.addEventListener("click", async () => {
    busy(true);
    const { error } = await db.auth.oauth.approveAuthorization(id);
    if (error) {
      busy(false);
      approve.after(errorLine(error.message));
    }
  });
  deny.addEventListener("click", async () => {
    busy(true);
    const { error } = await db.auth.oauth.denyAuthorization(id);
    if (error) busy(false);
  });
  show(
    el("h1", {}, `${name} wants to read your meetings`),
    el("p", {}, "It will be able to:"),
    el(
      "ul",
      {},
      el("li", {}, "search and read your synced meetings: titles, dates, notes and transcripts"),
      el("li", {}, "see your projects, sub-projects, participants and tags"),
    ),
    el("p", {}, "It cannot change or delete anything. Audio never leaves your computer."),
    el(
      "p",
      { class: "muted" },
      "Access goes to ",
      el("span", { class: "host" }, host),
      isClaude(data.redirect_uri) ? " (Claude)." : ". Only allow this if you started it yourself.",
    ),
    el("div", { class: "row" }, approve, deny),
    el(
      "p",
      { class: "muted" },
      `Signed in as ${session.user.email}. `,
      el("button", {
        class: "link",
        onclick: async () => {
          await db.auth.signOut();
          signIn();
        },
      }, "Not you?"),
    ),
  );
}

main().catch((e) => show(errorLine(`Something went wrong: ${e.message}`)));
