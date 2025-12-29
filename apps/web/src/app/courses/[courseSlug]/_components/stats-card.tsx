'use client';

import type { ReactNode } from "react";

interface StatsCardProps {
  label: string;
  value: number | string;
  icon: ReactNode;
  color: "sky" | "emerald" | "violet" | "amber" | "rose";
  suffix?: string;
  showProgress?: boolean;
  progressValue?: number;
}

const COLOR_STYLES = {
  sky: {
    iconBg: "bg-sky-100",
    iconText: "text-sky-600",
    gradient: "from-sky-500/10",
    valueText: "text-slate-900",
    progressFrom: "from-sky-500",
    progressTo: "to-sky-400",
  },
  emerald: {
    iconBg: "bg-emerald-100",
    iconText: "text-emerald-600",
    gradient: "from-emerald-500/10",
    valueText: "text-emerald-600",
    progressFrom: "from-emerald-500",
    progressTo: "to-emerald-400",
  },
  violet: {
    iconBg: "bg-violet-100",
    iconText: "text-violet-600",
    gradient: "from-violet-500/10",
    valueText: "text-violet-600",
    progressFrom: "from-violet-500",
    progressTo: "to-violet-400",
  },
  amber: {
    iconBg: "bg-amber-100",
    iconText: "text-amber-600",
    gradient: "from-amber-500/10",
    valueText: "text-amber-600",
    progressFrom: "from-amber-500",
    progressTo: "to-amber-400",
  },
  rose: {
    iconBg: "bg-rose-100",
    iconText: "text-rose-600",
    gradient: "from-rose-500/10",
    valueText: "text-rose-600",
    progressFrom: "from-rose-500",
    progressTo: "to-rose-400",
  },
};

export function StatsCard({
  label,
  value,
  icon,
  color,
  suffix,
  showProgress = false,
  progressValue = 0,
}: StatsCardProps) {
  const styles = COLOR_STYLES[color];

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all duration-300 hover:border-slate-200 hover:shadow-lg">
      {/* Decorative gradient corner */}
      <div className={`absolute right-0 top-0 h-32 w-32 rounded-bl-full bg-gradient-to-br ${styles.gradient} to-transparent`} />

      <div className="relative">
        {/* Icon and Label */}
        <div className="mb-3 flex items-center gap-3">
          <div className={`rounded-xl p-2.5 ${styles.iconBg}`}>
            <div className={`h-6 w-6 ${styles.iconText}`}>
              {icon}
            </div>
          </div>
          <span className="text-sm font-medium text-slate-500">{label}</span>
        </div>

        {/* Value */}
        <div className="flex items-baseline gap-1">
          <p className={`text-4xl font-bold tracking-tight ${styles.valueText}`}>
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {suffix && (
            <span className={`text-xl font-semibold ${styles.iconText} opacity-60`}>
              {suffix}
            </span>
          )}
        </div>

        {/* Progress Bar */}
        {showProgress && (
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full bg-gradient-to-r transition-all duration-500 ${styles.progressFrom} ${styles.progressTo}`}
              style={{ width: `${Math.min(100, Math.max(0, progressValue))}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Loading skeleton version
export function StatsCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="absolute right-0 top-0 h-32 w-32 rounded-bl-full bg-gradient-to-br from-slate-100/50 to-transparent" />
      <div className="relative">
        <div className="mb-3 flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-slate-100 skeleton-shimmer" />
          <div className="h-4 w-20 rounded bg-slate-100 skeleton-shimmer" />
        </div>
        <div className="h-10 w-24 rounded bg-slate-100 skeleton-shimmer" />
      </div>
    </div>
  );
}
