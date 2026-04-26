"use client";

import Link from "next/link";
import Image from "next/image";
import { signOut, signInWithGoogle } from "@/lib/auth";
import { useAuthContext } from "./AuthProvider";

export default function Navbar() {
  const { user, loading } = useAuthContext();

  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logomark-green.svg" alt="Demeter" width={28} height={23} priority />
          <span className="font-semibold text-gray-900">Demeter</span>
        </Link>

        <nav className="flex items-center gap-3">
          {!loading && (
            user ? (
              <>
                <Link
                  href="/plants/new"
                  className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 transition-colors"
                >
                  + Add plant
                </Link>
                <button
                  onClick={() => signOut()}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Sign out
                </button>
              </>
            ) : (
              <button
                onClick={() => signInWithGoogle()}
                className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 transition-colors"
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
