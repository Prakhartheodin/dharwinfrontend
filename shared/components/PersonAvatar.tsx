"use client";

import React, { useState } from "react";
import { getInitials } from "@/shared/lib/initials";

type PersonAvatarProps = {
  name: string;
  email?: string;
  imageUrl?: string | null;
  className?: string;
  onClick?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
};

export default function PersonAvatar({
  name,
  email,
  imageUrl,
  className = "w-10 h-10 rounded-full",
  onClick,
  onKeyDown,
}: PersonAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = Boolean(imageUrl?.trim()) && !imgFailed;
  const interactive = Boolean(onClick);

  if (showImg) {
    return (
      <img
        src={imageUrl!}
        alt={name}
        className={`object-cover flex-shrink-0 ${interactive ? "cursor-pointer" : ""} ${className}`}
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        onKeyDown={onKeyDown}
        onClick={onClick}
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <span
      className={`flex items-center justify-center bg-primary/10 text-primary font-semibold text-sm flex-shrink-0 ring-1 ring-primary/15 ${interactive ? "cursor-pointer" : ""} ${className}`}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={onKeyDown}
      onClick={onClick}
      aria-label={name}
    >
      {getInitials(name, email)}
    </span>
  );
}
