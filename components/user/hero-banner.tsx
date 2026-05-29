"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type HeroSlide = {
  id: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  href: string;
  imageUrl: string;
};

type HeroBannerProps = {
  slides: HeroSlide[];
};

export function HeroBanner({ slides }: HeroBannerProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;

    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [slides.length]);

  if (!slides.length) return null;

  return (
    <section className="relative w-full overflow-hidden rounded-xl bg-[#0f172a]">
      <div className="relative h-[320px] w-full md:h-[420px]">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-700 ${
              index === activeIndex ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <Image
              src={slide.imageUrl}
              alt={slide.title}
              fill
              sizes="100vw"
              className="object-cover"
              unoptimized
              priority={index === 0}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/10" />

            <div className="absolute left-0 top-0 flex h-full w-full items-center">
              <div className="max-w-xl space-y-4 px-6 text-white md:px-10">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#fbbf24]">
                  Curated Collection
                </p>
                <h1 className="text-3xl font-semibold leading-tight md:text-5xl">
                  {slide.title}
                </h1>
                <p className="text-sm text-[#e2e8f0] md:text-base">{slide.subtitle}</p>
                <Link
                  href={slide.href}
                  className="inline-flex rounded-md bg-[#f59e0b] px-5 py-2.5 text-sm font-semibold text-[#111827] transition hover:bg-[#fbbf24]"
                >
                  {slide.ctaLabel}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`h-2.5 rounded-full transition ${
              index === activeIndex ? "w-8 bg-[#f59e0b]" : "w-2.5 bg-white/60"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
