"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/libs/supabase/client";
import config from "@/config";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      router.push(config.auth.callbackUrl);
    }

    setIsLoading(false);
  };

  return (
    <main className="p-8 md:p-24" data-theme={config.colors.theme}>
      <div className="text-center mb-4">
        <Link href="/" className="btn btn-ghost btn-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path
              fillRule="evenodd"
              d="M15 10a.75.75 0 01-.75.75H7.612l2.158 1.96a.75.75 0 11-1.04 1.08l-3.5-3.25a.75.75 0 010-1.08l3.5-3.25a.75.75 0 111.04 1.08L7.612 9.25h6.638A.75.75 0 0115 10z"
              clipRule="evenodd"
            />
          </svg>
          Home
        </Link>
      </div>
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-center mb-12">
        Login to {config.appName}
      </h1>
      <form className="form-control w-full max-w-md mx-auto space-y-4" onSubmit={handleLogin}>
        <input
          required
          type="email"
          placeholder="tom@cruise.com"
          className="input input-bordered w-full placeholder:opacity-60"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          required
          type="password"
          placeholder="Your password"
          className="input input-bordered w-full placeholder:opacity-60"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-error text-sm">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={isLoading} type="submit">
          {isLoading && <span className="loading loading-spinner loading-xs"></span>}
          Login
        </button>
      </form>
    </main>
  );
}
