"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const MAX_NOTE_LENGTH = 500; // Same limit as the CHECK constraint in schema.sql.

export async function addNote(formData: FormData) {
  // Server-side validation: the browser's maxLength is only a hint and can be bypassed.
  const content = formData.get("content");
  if (typeof content !== "string") throw new Error("Invalid note");
  const text = content.trim();
  if (text.length < 1 || text.length > MAX_NOTE_LENGTH) {
    throw new Error(`Note must be 1-${MAX_NOTE_LENGTH} characters`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  // No user_id sent: the DB fills it from the verified JWT (default auth.uid()),
  // and the RLS insert policy rejects any other value anyway.
  // The Supabase client sends parameters safely, so no SQL injection.
  const { error } = await supabase.from("notes").insert({ content: text });
  if (error) throw new Error("Could not save note");

  revalidatePath("/"); // Re-render the page so the new note shows up.
}

export async function signIn() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      // Must exactly match a Redirect URL allowlisted in Supabase (no wildcards).
      redirectTo: `${process.env.SITE_URL}/auth/callback`,
    },
  });
  if (error) throw error;
  redirect(data.url); // Send the browser to GitHub's consent screen.
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
