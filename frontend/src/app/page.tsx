import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Verified dari backend/app/main.py baris 19: session_cookie="session"
const SESSION_COOKIE = "session";

export default async function RootPage() {
  const cookieStore = await cookies();
  const hasSession = cookieStore.has(SESSION_COOKIE);

  if (hasSession) {
    redirect("/beranda");
  } else {
    redirect("/masuk");
  }
}
