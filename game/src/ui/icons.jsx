/**
 * Hand-drawn cartoon SVG icon set for Depth Charge.
 * Bold dark outlines, saturated two-tone fills, rounded joins.
 * Every icon: viewBox 0 0 24 24, accepts { size = 24, ...props }.
 */
import React from "react";

export function CoinIcon({ size = 24, ...props }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" {...props}>
      <circle cx="12" cy="12" r="9" fill="#f7b820" stroke="#7a4a0e" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="12" cy="12" r="6.6" fill="none" stroke="#e09a10" strokeWidth="1.2" />
      <path d="M7 8.4C8.2 5.9 10 4.6 12 4.6C13.1 4.6 14.2 5 15.1 5.6C13.5 5.1 11.3 5.4 9.7 6.8C8.6 7.7 7.9 9 7.5 10.2C7.1 9.6 6.9 9 7 8.4Z" fill="#ffe066" opacity="0.9" />
      <path d="M12 6.4V17.6" stroke="#7a4a0e" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M14.6 8.7C14.3 7.6 13.2 7 12 7C10.6 7 9.3 7.7 9.3 8.9C9.3 11.6 14.7 10.4 14.7 13.1C14.7 14.3 13.4 15 12 15C10.7 15 9.6 14.5 9.2 13.3" fill="none" stroke="#7a4a0e" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PlayAdIcon({ size = 24, ...props }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" {...props}>
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" fill="#3a3f4a" stroke="#20232b" strokeWidth="1.6" strokeLinejoin="round" />
      <rect x="4" y="4" width="16" height="4.5" rx="2.2" fill="#ffffff" opacity="0.08" />
      <path d="M9.3 7.8L16.2 12L9.3 16.2Z" fill="#ffffff" stroke="#ffffff" strokeWidth="1.1" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function LockIcon({ size = 24, ...props }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" {...props}>
      <path d="M8 10V7.5C8 5 9.8 3 12 3C14.2 3 16 5 16 7.5V10" fill="none" stroke="#7c8a99" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="5" y="10" width="14" height="10" rx="3" fill="#f7b820" stroke="#7a4a0e" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M6 11.3C6.5 10.6 8 10.1 9.5 10.1C8 10.7 7 11.4 6.8 12.4C6.4 12 6.1 11.6 6 11.3Z" fill="#ffe066" opacity="0.9" />
      <circle cx="12" cy="14.3" r="1.4" fill="#7a4a0e" />
      <rect x="11.3" y="15" width="1.4" height="2.6" rx="0.5" fill="#7a4a0e" />
    </svg>
  );
}

// Missile silhouette — nose cone, body, tail fins.
export function MissileIcon({ size = 24, ...props }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" {...props}>
      <path d="M12 2.5C14 4.5 14.6 8 14.4 11.5L9.6 11.5C9.4 8 10 4.5 12 2.5Z" fill="#c7ced6" stroke="#2e3540" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      <rect x="9.7" y="11.5" width="4.6" height="6.5" fill="#8a94a0" stroke="#2e3540" strokeWidth="1.5" />
      <path d="M9.7 14L6 18L9.7 16.8Z" fill="#d64545" stroke="#2e3540" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M14.3 14L18 18L14.3 16.8Z" fill="#d64545" stroke="#2e3540" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M10.2 18L13.8 18L13 20.5L11 20.5Z" fill="#ffb020" opacity="0.9" />
      <path d="M10.6 4.5C11.2 3.7 11.7 3.1 12.2 2.8C11.6 3.7 11.2 4.9 11 6.4C10.8 5.7 10.6 5.1 10.6 4.5Z" fill="#fff" opacity="0.85" />
    </svg>
  );
}

// Thrusters — flame + speed chevrons.
export function ThrusterIcon({ size = 24, ...props }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" {...props}>
      <path d="M8 4h8l-1.4 6H9.4Z" fill="#8a94a0" stroke="#2e3540" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M9 10.5C7.6 12.5 7.2 15 8.4 17.5C9.6 15.6 10.6 15.6 12 17.5C13.4 15.6 14.4 15.6 15.6 17.5C16.8 15 16.4 12.5 15 10.5Z" fill="#ff9a1f" stroke="#7a4a0e" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M10 12.5C9.4 13.6 9.3 14.7 9.8 15.9C10.5 15 11 15 11.6 15.7C11.2 14.3 10.6 13.2 10 12.5Z" fill="#ffe066" />
    </svg>
  );
}

// Armor / shield.
export function ArmorIcon({ size = 24, ...props }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" {...props}>
      <path d="M12 3L19 6V11C19 15.5 16 18.8 12 21C8 18.8 5 15.5 5 11V6Z" fill="#5b8def" stroke="#1f3f80" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M12 3L19 6V11C19 15.5 16 18.8 12 21Z" fill="#3f6cc8" opacity="0.7" />
      <path d="M7 7.2C8.5 6.4 10.2 5.9 12 5.7C9.8 6.2 8 7.1 6.8 8.4C6.8 8 6.9 7.6 7 7.2Z" fill="#a9d4ff" opacity="0.85" />
      <path d="M9 11.5L11 13.5L15.5 8.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

// Salvage / income — coin sack with dollar wrench.
export function SalvageIcon({ size = 24, ...props }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" {...props}>
      <path d="M12 3.5C13 3.5 13.7 4.4 13.4 5.3L12.7 7.3H15.5C18 7.3 20 9.5 19.6 12.2L18.7 18.3C18.5 19.9 17.1 21 15.5 21H8.5C6.9 21 5.5 19.9 5.3 18.3L4.4 12.2C4 9.5 6 7.3 8.5 7.3H11.3L10.6 5.3C10.3 4.4 11 3.5 12 3.5Z" fill="#c98a2e" stroke="#6b3d0f" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M7 9.5C8.2 8.7 9.8 8.3 11.3 8.2C9.4 8.7 7.9 9.6 7.1 10.9C6.9 10.4 6.9 9.9 7 9.5Z" fill="#ffe066" opacity="0.85" />
      <circle cx="12" cy="14" r="3.1" fill="#f7b820" stroke="#7a4a0e" strokeWidth="1.4" />
      <path d="M12 12.3V15.7M10.8 13.1H13.2" stroke="#7a4a0e" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

// Slow-mo powerup — blue clock.
export function ClockIcon({ size = 24, ...props }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" {...props}>
      <circle cx="12" cy="13" r="8" fill="#4fb0ff" stroke="#1a5f96" strokeWidth="1.8" />
      <circle cx="12" cy="13" r="5.8" fill="none" stroke="#eaf7ff" strokeWidth="1" opacity="0.6" />
      <path d="M12 8.6V13L15 15.2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <rect x="10" y="1.6" width="4" height="2.2" rx="1" fill="#7c8a99" stroke="#3a4550" strokeWidth="1" />
      <path d="M8 6.8C9 5.7 10.4 5 12 5C10.4 5.4 9.2 6.2 8.5 7.4C8.2 7.2 8.1 7 8 6.8Z" fill="#cdeeff" opacity="0.9" />
    </svg>
  );
}

// Shrink powerup — inward arrows.
export function ShrinkIcon({ size = 24, ...props }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" {...props}>
      <circle cx="12" cy="12" r="9.2" fill="#9a5fe0" stroke="#5b2fa0" strokeWidth="1.8" />
      <path d="M8.5 4.5L8.5 8.5L4.5 8.5" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M4.5 8.5L9.2 12.8" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" fill="none" />
      <path d="M15.5 19.5L15.5 15.5L19.5 15.5" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M19.5 15.5L14.8 11.2" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" fill="none" />
      <path d="M7 6C7.8 5.6 8.5 5.4 9.2 5.4C8.4 5.7 7.7 6.2 7.3 7C7.1 6.7 7 6.3 7 6Z" fill="#e2c6ff" opacity="0.9" />
    </svg>
  );
}

export function TargetIcon({ size = 24, ...props }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" {...props}>
      <circle cx="12" cy="12" r="9.5" fill="#e8402f" stroke="#7a1f1f" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="6.5" fill="#f4f0e6" stroke="#7a1f1f" strokeWidth="1.3" />
      <circle cx="12" cy="12" r="3.6" fill="#e8402f" stroke="#7a1f1f" strokeWidth="1.3" />
      <circle cx="12" cy="12" r="1.2" fill="#2a2a2a" />
    </svg>
  );
}

export function DepthIcon({ size = 24, ...props }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" {...props}>
      <path d="M4 5H20" stroke="#8fd8ff" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M4 10H20" stroke="#5fb8f0" strokeWidth="1.6" strokeLinecap="round" opacity="0.75" />
      <path d="M4 15H20" stroke="#3f8fd0" strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
      <path d="M8 19.5L12 22L16 19.5" stroke="#2a6aa8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function BoltIcon({ size = 24, ...props }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" {...props}>
      <path d="M13 2L5 14H11L10 22L19 9H13Z" fill="#ffd23e" stroke="#7a5000" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function SkullIcon({ size = 24, ...props }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" {...props}>
      <path d="M12 3C7.6 3 5 6 5 9.8C5 12 6 13.4 7 14.4V17H9V19H10.5V17.3H13.5V19H15V17H17V14.4C18 13.4 19 12 19 9.8C19 6 16.4 3 12 3Z" fill="#e9e9e9" stroke="#333" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="9" cy="10" r="1.7" fill="#333" />
      <circle cx="15" cy="10" r="1.7" fill="#333" />
      <path d="M11 12L10.4 14.4H13.6L13 12Z" fill="#333" />
    </svg>
  );
}

export function HomeIcon({ size = 24, ...props }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" {...props}>
      <path d="M3 11L12 4L21 11L18.5 11L12 6.3L5.5 11Z" fill="#a9432f" stroke="#5a2416" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
      <rect x="5.5" y="11" width="13" height="9" fill="#d9b06a" stroke="#6b4420" strokeWidth="1.7" strokeLinejoin="round" />
      <rect x="10.3" y="14.5" width="3.4" height="5.5" rx="0.6" fill="#6b4420" stroke="#4a2f14" strokeWidth="1.3" />
    </svg>
  );
}

export function TrophyIcon({ size = 24, ...props }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" {...props}>
      <path d="M7 6C4 6 4 10 7.3 10.5" fill="none" stroke="#7a4a0e" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M17 6C20 6 20 10 16.7 10.5" fill="none" stroke="#7a4a0e" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7 4H17L16.3 11C16 13.5 14.3 15 12 15C9.7 15 8 13.5 7.7 11Z" fill="#f7b820" stroke="#7a4a0e" strokeWidth="1.8" strokeLinejoin="round" />
      <rect x="11" y="15" width="2" height="3" fill="#e09a10" stroke="#7a4a0e" strokeWidth="1.3" />
      <path d="M8.5 20L9 18H15L15.5 20Z" fill="#e09a10" stroke="#7a4a0e" strokeWidth="1.6" strokeLinejoin="round" />
      <rect x="8" y="19.6" width="8" height="1.4" rx="0.7" fill="#c98a10" stroke="#7a4a0e" strokeWidth="1.2" />
    </svg>
  );
}

export function AdChipIcon({ size = 24, ...props }) {
  return <PlayAdIcon size={size} {...props} />;
}

export const ICONS = {
  coin: CoinIcon, playAd: PlayAdIcon, lock: LockIcon, missile: MissileIcon,
  thruster: ThrusterIcon, armor: ArmorIcon, salvage: SalvageIcon,
  clock: ClockIcon, shrink: ShrinkIcon, target: TargetIcon, depth: DepthIcon,
  bolt: BoltIcon, skull: SkullIcon, home: HomeIcon, trophy: TrophyIcon,
};

export default ICONS;
