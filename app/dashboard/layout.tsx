import { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import config from "@/config";

// This is a server-side component to ensure the user is logged in.
// If not, it will redirect to the login page.
// It's applied to all subpages of /dashboard in /app/dashboard/*** pages
// You can also add custom static UI elements like a Navbar, Sidebar, Footer, etc..
// See https://shipfa.st/docs/tutorials/private-page
export default async function LayoutPrivate({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(config.auth.loginUrl);
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 bg-base-200 p-4">
        <ul className="menu space-y-2">
          <li>
            <Link href="/dashboard">Dashboard</Link>
          </li>
          <li>
            <Link href="/dashboard/penghuni">Penghuni</Link>
          </li>
          <li>
            <Link href="/dashboard/kamar">Kamar</Link>
          </li>
          <li>
            <Link href="/dashboard/tagihan">Tagihan</Link>
          </li>
        </ul>
      </aside>
      <div className="flex-1">{children}</div>
    </div>
  );
}
