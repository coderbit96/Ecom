"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from "firebase/auth";
import {
  Heart,
  Menu,
  Search,
  ShoppingCart,
  User,
  X,
  Package,
  UserCircle2,
  LogOut,
} from "lucide-react";

import { useCart } from "@/lib/cart-context";
import { getFirebaseAuth } from "@/lib/firebase-client";

type UserNavbarProps = {
  user: {
    id?: string | null;
    name?: string | null;
    image?: string | null;
    email?: string | null;
  } | null;
  categories: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
};

function UserAvatar({ user }: { user: UserNavbarProps["user"] }) {
  if (user?.image) {
    return (
      <Image
        src={user.image}
        alt={user.name ?? "User profile"}
        className="h-8 w-8 rounded-full border border-white/30 object-cover"
        width={32}
        height={32}
        unoptimized
      />
    );
  }

  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-[#1e293b] text-white">
      <User className="h-4 w-4" />
    </span>
  );
}

export function UserNavbar({ user, categories }: UserNavbarProps) {
  const { cartCount, toggleCart } = useCart();
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const displayUser =
    user ??
    (firebaseUser
      ? {
          name: firebaseUser.displayName,
          image: firebaseUser.photoURL,
        }
      : null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), setFirebaseUser);
    return unsubscribe;
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadWishlistCount() {
      const response = await fetch("/api/wishlist", {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) return;

      const payload = (await response.json()) as { count?: number };
      if (isActive) {
        setWishlistCount(payload.count ?? 0);
      }
    }

    function handleWishlistUpdate(event: Event) {
      const detail = (event as CustomEvent<{ count?: number }>).detail;
      if (typeof detail?.count === "number") {
        setWishlistCount(detail.count);
      } else {
        loadWishlistCount().catch(() => undefined);
      }
    }

    loadWishlistCount().catch(() => undefined);
    window.addEventListener("wishlist:updated", handleWishlistUpdate);

    return () => {
      isActive = false;
      window.removeEventListener("wishlist:updated", handleWishlistUpdate);
    };
  }, []);

  async function handleLogout() {
    setIsProfileOpen(false);

    if (firebaseUser) {
      await firebaseSignOut(getFirebaseAuth());
    }

    await fetch("/api/app-auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#111827] text-white shadow-sm">
      <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
        <div className="flex h-16 items-center gap-3">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/20 text-white md:hidden"
            aria-label="Toggle menu"
            onClick={() => setIsMobileOpen((prev) => !prev)}
          >
            {isMobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>

          <Link
            href="/"
            className="flex items-center gap-2 text-base font-semibold tracking-tight text-white"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded bg-[#f59e0b] text-sm font-bold text-black">
              ES
            </span>
            <span>Ecom Store</span>
          </Link>

          <div className="hidden flex-1 md:block">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
              <input
                type="search"
                placeholder="Search products, brands and categories"
                className="h-10 w-full rounded-md border border-white/20 bg-white/10 pl-9 pr-3 text-sm text-white placeholder:text-[#94a3b8] outline-none ring-0 transition focus:border-[#f59e0b]"
              />
            </label>
          </div>

          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/wishlist"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-white/90 transition hover:bg-white/10 hover:text-white"
              aria-label="Wishlist"
            >
              <Heart className="h-5 w-5" />
              {wishlistCount > 0 ? (
                <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-[#f59e0b] px-1.5 py-0.5 text-center text-[10px] font-semibold leading-none text-black">
                  {wishlistCount}
                </span>
              ) : null}
            </Link>

            <button
              type="button"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-white/90 transition hover:bg-white/10 hover:text-white"
              aria-label="Cart"
              onClick={toggleCart}
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 ? (
                <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-[#f59e0b] px-1.5 py-0.5 text-center text-[10px] font-semibold leading-none text-black">
                  {cartCount}
                </span>
              ) : null}
            </button>

            <div className="relative">
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md transition hover:bg-white/10"
                aria-label="User menu"
                onClick={() => setIsProfileOpen((prev) => !prev)}
              >
                <UserAvatar user={displayUser} />
              </button>

              {isProfileOpen ? (
                <div className="absolute right-0 mt-2 w-48 rounded-md border border-[#e2e8f0] bg-white p-1.5 text-[#0f172a] shadow-lg">
                  <Link
                    href="/orders"
                    className="flex items-center gap-2 rounded px-2.5 py-2 text-sm transition hover:bg-[#f1f5f9]"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <Package className="h-4 w-4" />
                    <span>My Orders</span>
                  </Link>
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 rounded px-2.5 py-2 text-sm transition hover:bg-[#f1f5f9]"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <UserCircle2 className="h-4 w-4" />
                    <span>My Profile</span>
                  </Link>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm transition hover:bg-[#f1f5f9]"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="pb-3 md:hidden">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
            <input
              type="search"
              placeholder="Search products"
              className="h-10 w-full rounded-md border border-white/20 bg-white/10 pl-9 pr-3 text-sm text-white placeholder:text-[#94a3b8] outline-none ring-0 transition focus:border-[#f59e0b]"
            />
          </label>
        </div>
      </div>

      {isMobileOpen ? (
        <div className="border-t border-white/10 bg-[#0f172a] md:hidden">
          <div className="mx-auto w-full max-w-7xl space-y-2 px-4 py-4">
            <div className="grid grid-cols-2 gap-2">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/category/${category.slug}`}
                  className="rounded-md border border-white/10 px-3 py-2 text-sm text-white/90 transition hover:bg-white/10"
                  onClick={() => setIsMobileOpen(false)}
                >
                  {category.name}
                </Link>
              ))}
            </div>
            <div className="border-t border-white/10 pt-2">
              <Link
                href="/orders"
                className="block rounded px-2 py-2 text-sm text-white/90 hover:bg-white/10"
                onClick={() => setIsMobileOpen(false)}
              >
                My Orders
              </Link>
              <Link
                href="/profile"
                className="block rounded px-2 py-2 text-sm text-white/90 hover:bg-white/10"
                onClick={() => setIsMobileOpen(false)}
              >
                My Profile
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
