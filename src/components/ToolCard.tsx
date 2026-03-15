import { Tool } from "../data/tools";
import { ToolIcon } from "./ToolIcon";

interface Props {
  tool: Tool;
  onClick: (tool: Tool) => void;
}

const badgeConfig: Record<string, { bg: string; text: string; dot: string }> = {
  Popular: { bg: "bg-orange-50 dark:bg-orange-950/50", text: "text-orange-600 dark:text-orange-400", dot: "bg-orange-400" },
  New: { bg: "bg-emerald-50 dark:bg-emerald-950/50", text: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-400" },
  AI: { bg: "bg-violet-50 dark:bg-violet-950/50", text: "text-violet-600 dark:text-violet-400", dot: "bg-violet-400" },
  Pro: { bg: "bg-indigo-50 dark:bg-indigo-950/50", text: "text-indigo-600 dark:text-indigo-400", dot: "bg-indigo-400" },
};

export function ToolCard({ tool, onClick }: Props) {
  const badge = tool.badge ? badgeConfig[tool.badge] : null;

  return (
    <button
      onClick={() => onClick(tool)}
      className="relative group text-left w-full rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all duration-200
        hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)]
        hover:-translate-y-1 hover:border-indigo-200 dark:hover:border-indigo-800
        focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
    >
      {/* Badge */}
      {badge && tool.badge && (
        <span className={`absolute top-3 right-3 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
          {tool.badge}
        </span>
      )}

      {/* Icon */}
      <div className={`w-11 h-11 rounded-2xl ${tool.bg} dark:opacity-90 flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md`}>
        <ToolIcon icon={tool.icon} className={`w-5 h-5 ${tool.color}`} />
      </div>

      {/* Title */}
      <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
        {tool.title}
      </h3>

      {/* Description */}
      <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed line-clamp-2">
        {tool.description}
      </p>

      {/* Use tool arrow */}
      <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200">
        Use tool
        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      </div>
    </button>
  );
}
