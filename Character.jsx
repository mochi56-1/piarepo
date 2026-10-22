import React, { useId } from "react";
export default function Character({ bust = false, className = "" }) {
  const clipId = useId().replaceAll(":", "");
  return (
    <svg
      className={`companion ${className}`}
      viewBox={bust ? "480 860 650 850" : "480 860 650 1450"}
      role="img"
      aria-label="ぴあれぽのキャラクター"
    >
      <defs>
        <clipPath id={clipId}>
          <path d="M480 1100H620V860H1130V2310H480Z" />
        </clipPath>
      </defs>
      <image
        href="/images/piarepo-character.png"
        width="1640"
        height="2360"
        clipPath={`url(#${clipId})`}
      />
    </svg>
  );
}
