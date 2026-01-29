import { SessionProvider } from "next-auth/react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/landing");
  }

  return (
    <SessionProvider session={session}>
      <div className="h-screen overflow-hidden">{children}</div>
    </SessionProvider>
  );
}
