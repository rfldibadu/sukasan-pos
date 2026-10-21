import { ElementType } from "react";

interface MetricCardProps {
  title: string;
  value: string;
  subtext: string;
  icon: ElementType;
  color: string;
}

export function MetricCard({ title, value, subtext, icon: Icon, color }: MetricCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 shadow-xs flex items-center justify-between">
      <div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{title}</p>
        <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{value}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">{subtext}</p>
      </div>
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
  );
}