

type AvatarProps = {
  src?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const sizes = {
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-20 w-20 text-xl",
};

export default function Avatar({ src, name, size = "md", className = "" }: AvatarProps) {
  const sizeClass = sizes[size];
  const initial = (name || "U").charAt(0).toUpperCase();

  if (src) {
    return (
      <img
        src={src}
        alt={name || "User"}
        className={`${sizeClass} rounded-full object-cover ring-1 ring-border ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex items-center justify-center rounded-full bg-accent/20 font-heading font-bold text-accent ${className}`}
    >
      {initial}
    </div>
  );
}
