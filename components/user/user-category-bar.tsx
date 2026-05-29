import Link from "next/link";

type UserCategoryBarProps = {
  categories: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
};

export function UserCategoryBar({ categories }: UserCategoryBarProps) {
  if (!categories.length) return null;

  return (
    <nav className="border-b border-[#dfe3e8] bg-[#f8fafc]">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-4 overflow-x-auto px-4 py-3 md:px-6">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/category/${category.slug}`}
            className="shrink-0 rounded-md px-3 py-1.5 text-sm font-medium text-[#334155] transition hover:bg-[#e2e8f0] hover:text-[#0f172a]"
          >
            {category.name}
          </Link>
        ))}
      </div>
    </nav>
  );
}
