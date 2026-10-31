import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GitHub -> Supabase -> here with a one-time ?code=...
// We trade that code for a session, which Supabase stores in cookies.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Always go to a fixed local path, never to a URL taken from the query (avoids open redirects).
  return NextResponse.redirect(new URL("/", request.url));
}
