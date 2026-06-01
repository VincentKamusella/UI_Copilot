import type { CSSProperties } from "react";

interface Props {
  iconSize?: number;
  style?: CSSProperties;
}

export default function Logo({ iconSize = 26, style }: Props) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, ...style }}>
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Background */}
        <rect width="32" height="32" rx="8" fill="#2563eb" />
        {/* Cursor / pointer arrow */}
        <path
          d="M9 7 L9 22 L12.5 18.5 L15 23 L17 22 L14.5 17 L19.5 17 Z"
          fill="white"
        />
        {/* 4-point sparkle */}
        <path
          d="M24.5 6.5 L25.3 8.25 L27 9 L25.3 9.75 L24.5 11.5 L23.7 9.75 L22 9 L23.7 8.25 Z"
          fill="white"
          opacity="0.9"
        />
      </svg>
      <span className="logo">UI Copilot</span>
    </div>
  );
}
