import React from "react";

interface ProjectFlowIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

export function ProjectFlowIcon({
  size = 24,
  className = "",
  ...props
}: ProjectFlowIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient
          id="pf-icon-bg"
          x1="0"
          y1="0"
          x2="32"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>
        <linearGradient
          id="pf-icon-glow"
          x1="0"
          y1="0"
          x2="0"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="7" fill="url(#pf-icon-bg)" />
      <rect
        x="0.5"
        y="0.5"
        width="31"
        height="31"
        rx="6.5"
        stroke="url(#pf-icon-glow)"
        strokeWidth="1"
      />
      <rect
        x="6"
        y="10"
        width="4.5"
        height="13"
        rx="2.25"
        fill="#FFFFFF"
        fillOpacity="0.45"
      />
      <rect
        x="13.75"
        y="6.5"
        width="4.5"
        height="19"
        rx="2.25"
        fill="#FFFFFF"
        fillOpacity="0.9"
      />
      <rect
        x="21.5"
        y="12"
        width="4.5"
        height="13.5"
        rx="2.25"
        fill="#FFFFFF"
      />
      <circle cx="23.75" cy="8" r="2.25" fill="#38BDF8" />
    </svg>
  );
}

export function ProjectFlowLogo({
  size = 24,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2.5 font-bold tracking-tight ${className}`}>
      <ProjectFlowIcon size={size} className="rounded-md shadow-xs shrink-0" />
      <span className="text-sm font-semibold tracking-tight text-foreground">
        ProjectFlow
      </span>
    </div>
  );
}
