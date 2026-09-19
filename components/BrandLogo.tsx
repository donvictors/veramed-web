import Image from "next/image";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
  tone?: "dark" | "light";
  showWordmark?: boolean;
};

export default function BrandLogo({
  className = "",
  priority = false,
  tone = "dark",
  showWordmark = true,
}: BrandLogoProps) {
  return (
    <span className={["inline-flex items-center gap-2.5", className].join(" ")}>
      {showWordmark ? <span
        className={[
          "inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl",
          tone === "light" ? "bg-white" : "bg-emerald-50",
        ].join(" ")}
      >
      <Image
          src="/brand/veramed-icon.png"
          alt=""
          width={36}
          height={36}
        priority={priority}
          className="h-9 w-9 object-cover"
      />
      </span> : null}
      <span
        className={[
          "text-xl font-semibold tracking-[-0.035em]",
          tone === "light" ? "text-white" : "text-slate-950",
        ].join(" ")}
      >
        Veramed
      </span>
    </span>
  );
}
