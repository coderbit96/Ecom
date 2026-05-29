import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CartDrawer } from "@/components/user/cart-drawer";
import { UserCategoryBar } from "@/components/user/user-category-bar";
import { UserFooter } from "@/components/user/user-footer";
import { UserNavbar } from "@/components/user/user-navbar";
import { CartProvider } from "@/lib/cart-context";

type UserLayoutProps = {
  children: React.ReactNode;
};

export default async function UserLayout({ children }: UserLayoutProps) {
  const session = await auth();

  let categories: Array<{ id: string; name: string; slug: string }> = [];

  try {
    categories = await db.category.findMany({
      where: { parentId: null },
      orderBy: { order: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
      },
      take: 12,
    });
  } catch {
    categories = [];
  }

  return (
    <CartProvider userId={session?.user?.id ?? null}>
      <div className="min-h-screen bg-white text-[#0f172a]">
        <UserNavbar user={session?.user ?? null} categories={categories} />
        <UserCategoryBar categories={categories} />
        <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6">
          {children}
        </main>
        <UserFooter />
        <CartDrawer />
      </div>
    </CartProvider>
  );
}
