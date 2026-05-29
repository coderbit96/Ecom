import Link from "next/link";
import { Heart, MessageCircle, ShoppingCart, User } from "lucide-react";

export function UserFooter() {
  return (
    <footer className="mt-12 border-t border-[#e2e8f0] bg-[#0f172a] text-white">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-10 md:grid-cols-3 md:px-6">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Ecom Store</h2>
          <p className="max-w-sm text-sm text-[#cbd5e1]">
            Premium shopping for curated fashion, home, and lifestyle products.
            Fast delivery and trusted quality.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">
            Quick Links
          </h3>
          <div className="grid gap-2 text-sm text-[#cbd5e1]">
            <Link href="/" className="transition hover:text-white">
              Home
            </Link>
            <Link href="/orders" className="transition hover:text-white">
              Orders
            </Link>
            <Link href="/profile" className="transition hover:text-white">
              Profile
            </Link>
            <Link href="/support" className="transition hover:text-white">
              Support
            </Link>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">
            Follow
          </h3>
          <div className="flex items-center gap-2">
            <Link
              href="https://x.com"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/20 text-[#cbd5e1] transition hover:bg-white/10 hover:text-white"
              aria-label="Community"
            >
              <MessageCircle className="h-4 w-4" />
            </Link>
            <Link
              href="https://facebook.com"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/20 text-[#cbd5e1] transition hover:bg-white/10 hover:text-white"
              aria-label="Favorites"
            >
              <Heart className="h-4 w-4" />
            </Link>
            <Link
              href="https://instagram.com"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/20 text-[#cbd5e1] transition hover:bg-white/10 hover:text-white"
              aria-label="Cart"
            >
              <ShoppingCart className="h-4 w-4" />
            </Link>
            <Link
              href="https://linkedin.com"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/20 text-[#cbd5e1] transition hover:bg-white/10 hover:text-white"
              aria-label="Profile"
            >
              <User className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-[#94a3b8]">
        Copyright {new Date().getFullYear()} Ecom Store. All rights reserved.
      </div>
    </footer>
  );
}

