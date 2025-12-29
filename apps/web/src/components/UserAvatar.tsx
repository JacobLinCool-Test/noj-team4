"use client";

import { getAvatarUrl } from "@/lib/api/user";

interface UserAvatarProps {
  username: string;
  avatarUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
  className?: string;
  showRing?: boolean;
  ringColor?: string;
}

const sizeClasses = {
  xs: "h-6 w-6 text-xs",
  sm: "h-8 w-8 text-sm",
  md: "h-10 w-10 text-base",
  lg: "h-16 w-16 text-2xl",
  xl: "h-20 w-20 text-3xl",
  "2xl": "h-28 w-28 text-4xl",
  "3xl": "h-36 w-36 text-5xl",
};

export function UserAvatar({
  username,
  avatarUrl,
  size = "md",
  className = "",
  showRing = false,
  ringColor = "ring-white",
}: UserAvatarProps) {
  const resolvedUrl = getAvatarUrl(avatarUrl ?? null);
  const sizeClass = sizeClasses[size];
  const letter = username[0]?.toUpperCase() || "?";
  const ringClasses = showRing ? `ring-4 ${ringColor} shadow-xl` : "";

  if (resolvedUrl) {
    return (
      <div
        className={`flex-shrink-0 overflow-hidden rounded-full ${sizeClass} ${ringClasses} ${className}`}
      >
        <img
          src={resolvedUrl}
          alt={username}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`flex flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#003865] to-[#0a5c99] text-white font-bold ${sizeClass} ${ringClasses} ${className}`}
    >
      {letter}
    </div>
  );
}
