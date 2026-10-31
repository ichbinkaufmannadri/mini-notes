import crypto from "node:crypto";
import express from "express";
import { createClient } from "@supabase/supabase-js";

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY, // Supabase "secret" key: bypasses RLS. Only ever set here, on Render.
  GITHUB_WEBHOOK_SECRET,
  NOTES_USER_ID, // Whose notes list the webhook writes to (your Supabase user id).
  PORT = "3001",
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GITHUB_WEBHOOK_SECRET || !NOTES_USER_ID) {
  throw new Error("Missing env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GITHUB_WEBHOOK_SECRET, NOTES_USER_ID");
}
const webhookSecret = GITHUB_WEBHOOK_SECRET;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// GitHub signs the exact bytes it sent: "sha256=" + HMAC-SHA256(secret, rawBody) in hex.
function isValidSignature(rawBody: Buffer, header: string | undefined): boolean {
  if (!header) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  const received = Buffer.from(header);
  const wanted = Buffer.from(expected);
  // timingSafeEqual takes the same time no matter where the bytes differ,
  // so an attacker can't guess the signature byte by byte from response times.
  return received.length === wanted.length && crypto.timingSafeEqual(received, wanted);
}

const app = express();

app.get("/", (_req, res) => {
  res.send("ok"); // Health check for Render.
});

// express.raw keeps the body as raw bytes. Parsing JSON first and re-serializing
// would change the bytes and break the signature check.
app.post("/webhook", express.raw({ type: "*/*", limit: "1mb" }), async (req, res) => {
  if (!Buffer.isBuffer(req.body) || !isValidSignature(req.body, req.get("X-Hub-Signature-256"))) {
    res.status(401).send("Invalid signature");
    return;
  }

  // Only now, after verifying the signature, do we trust and parse the payload.
  const event = req.get("X-GitHub-Event");
  if (event === "ping") {
    res.send("pong"); // GitHub sends this once when the webhook is created.
    return;
  }
  if (event !== "push") {
    res.status(202).send("Event ignored");
    return;
  }

  let repo: string;
  try {
    const payload = JSON.parse(req.body.toString("utf8"));
    repo = String(payload.repository?.full_name ?? "unknown repo").slice(0, 200);
  } catch {
    res.status(400).send("Invalid JSON");
    return;
  }

  // Service role bypasses RLS, so we must set user_id ourselves (auth.uid() is empty here).
  const { error } = await supabase
    .from("notes")
    .insert({ user_id: NOTES_USER_ID, content: `New push to ${repo}` });

  if (error) {
    console.error("Insert failed:", error.message);
    res.status(500).send("Could not save note");
    return;
  }
  res.status(201).send("Note created");
});

app.listen(Number(PORT), () => {
  console.log(`Worker listening on port ${PORT}`);
});
