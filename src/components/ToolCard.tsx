import { Tool } from "../data/tools";
import { ToolIcon } from "./ToolIcon";
import { useState } from "react";

interface Props {
  tool: Tool;
  onClick: (tool: Tool) => void;
}

export function ToolCard({ tool, onClick }: Props) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={() => onClick(tool)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative group text-left w-full rounded-2xl border ${tool.border} ${tool.bg} p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-red-300`}
    >
      {tool.badge && (
        <span className={`absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
          tool.badge === "Popular"
            ? "bg-orange-100 text-orange-600"
            : tool.badge === "New"
            ? "bg-green-100 text-green-600"
            : "bg-gray-100 text-gray-500"
        }`}>
          {tool.badge}
        </span>
      )}

      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-200 ${tool.bg} ${hovered ? "scale-110" : ""}`}>
        <ToolIcon icon={tool.icon} className={`w-6 h-6 ${tool.color}`} />
      </div>

      <h3 className="font-bold text-gray-800 text-sm mb-1.5 group-hover:text-gray-900">
        {tool.title}
      </h3>
      <p className="text-gray-500 text-xs leading-relaxed line-clamp-2">
        {tool.description}
      </p>

      <div className={`mt-3 flex items-center gap-1 text-xs font-semibold ${tool.color} opacity-0 group-hover:opacity-100 transition-opacity`}>
        Use tool
        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      </div>
    </button>
  );
}
