import Image from "next/image";
import Link from "next/link";

type CategoryCard = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
};

export function FeaturedCategories({
  categories,
}: {
  categories: CategoryCard[];
}) {
  if (!categories.length) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight text-[#0f172a]">
          Featured Categories
        </h2>
        <Link href="/categories" className="text-sm font-medium text-[#f59e0b]">
          View all
        </Link>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-1">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/category/${category.slug}`}
            className="group w-[180px] shrink-0 overflow-hidden rounded-lg border border-[#e2e8f0] bg-white"
          >
            <div className="relative h-[120px] w-full overflow-hidden bg-[#f8fafc]">
              <Image
                src={category.imageUrl}
                alt={category.name}
                fill
                sizes="180px"
                className="object-cover transition duration-300 group-hover:scale-105"
                unoptimized
              />
            </div>
            <div className="px-3 py-2.5">
              <p className="truncate text-sm font-medium text-[#0f172a]">
                {category.name}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
