"use client";

import Image from "next/image";
import { useState } from "react";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
};

export default function BrandLogo({
  className = "h-14 w-auto",
  priority = false,
}: BrandLogoProps) {
  const [showImage, setShowImage] = useState(true);

  if (showImage) {
    return (
      <Image
        src="/brand/veramed-logo.png"
        alt="Veramed"
        width={320}
        height={96}
        priority={priority}
        className={className}
        onError={() => setShowImage(false)}
      />
    );
  }

  return (
    <div className="inline-flex items-center gap-3 text-slate-950">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-300 bg-white text-lg font-semibold">
        V
      </span>
      <span className="text-2xl font-semibold tracking-tight">Veramed</span>
    </div>
  );
}
