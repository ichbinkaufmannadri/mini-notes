import { createClient } from "@/lib/supabase/server";
import { addNote, signIn, signOut } from "./actions";

export default async function Home() {
  const supabase = await createClient();
  // getUser() asks Supabase Auth to verify the JWT, so a forged cookie won't pass.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="signin">
        <h1>Mini Notes</h1>
        <p>Your private notes. Only you can see them.</p>
        <form action={signIn}>
          <button>Sign in with GitHub</button>
        </form>
      </main>
    );
  }

  // No "where user_id = ..." needed: RLS only returns this user's rows.
  const { data: notes } = await supabase
    .from("notes")
    .select("id, content, created_at")
    .order("created_at", { ascending: false });

  return (
    <main>
      <header className="header">
        <h1>Mini Notes</h1>
        <div className="user">
          <span>{user.user_metadata.user_name ?? user.email}</span>
          <form action={signOut}>
            <button className="secondary">Sign out</button>
          </form>
        </div>
      </header>

      <form action={addNote} className="note-form">
        <input name="content" required maxLength={500} placeholder="Write a note…" />
        <button>Add</button>
      </form>

      {notes?.length ? (
        <ul className="notes">
          {notes.map((note) => (
            <li key={note.id}>
              {note.content}
              <time dateTime={note.created_at}>
                {new Date(note.created_at).toLocaleString()}
              </time>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty">No notes yet. Write your first one above.</p>
      )}
    </main>
  );
}
