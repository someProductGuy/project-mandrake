"use client";

import Link from "next/link";
import Image from "next/image";
import { signOut, signInWithGoogle } from "@/lib/auth";
import { useAuthContext } from "./AuthProvider";

export default function Navbar() {
  const { user, loading } = useAuthContext();

  return (
    <header className="sticky top-0 z-10 bg-cream border-b border-sand">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logomark-moss.svg"
            alt="Demeter"
            width={22}
            height={18}
            priority
          />
          <span className="font-display text-xl font-semibold text-ink tracking-tight">
            Demeter
          </span>
        </Link>

        {/* Nav actions */}
        <nav className="flex items-center gap-3">
          {!loading && (
            user ? (
              <>
                <Link
                  href="/plants/new"
                  className="rounded-full bg-moss px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  + Add
                </Link>
                <Link
                  href="/settings"
                  className="text-sm text-taupe hover:text-ink transition-colors"
                  aria-label="Settings"
                >
                  ⚙️
                </Link>
                <button
                  onClick={() => signOut()}
                  className="text-sm text-taupe hover:text-ink transition-colors"
                >
                  Sign out
                </button>
              </>
            ) : (
              <button
                onClick={() => signInWithGoogle()}
                className="rounded-full bg-moss px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Sign in
              </button>
            )
          )}
        </nav>
      </div>
    </header>
  );
}
