import { useState } from "react";
import { Tool } from "../data/tools";
import { ToolIcon } from "./ToolIcon";

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
      style={{
        position: "relative",
        textAlign: "left",
        width: "100%",
        padding: 20,
        border: hovered ? "1px solid var(--black)" : "var(--border)",
        borderRadius: "var(--radius)",
        background: hovered ? "var(--gray-50)" : "var(--white)",
        cursor: "pointer",
        transition: "border-color var(--transition), background var(--transition)",
        outline: "none",
      }}
    >
      {/* PRO badge */}
      {tool.badge === "Pro" && (
        <span style={{
          position: "absolute",
          top: 12,
          right: 12,
          fontSize: 10,
          fontWeight: 700,
          color: "var(--red)",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}>
          PRO
        </span>
      )}
      {tool.badge && tool.badge !== "Pro" && (
        <span style={{
          position: "absolute",
          top: 12,
          right: 12,
          fontSize: 10,
          fontWeight: 700,
          color: "var(--gray-400)",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}>
          {tool.badge}
        </span>
      )}

      {/* Icon */}
      <div style={{
        width: 36,
        height: 36,
        borderRadius: "var(--radius)",
        border: "var(--border)",
        background: "var(--white)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
        color: "var(--red)",
      }}>
        <ToolIcon icon={tool.icon} size={18} />
      </div>

      {/* Name */}
      <p style={{
        fontSize: 14,
        fontWeight: 500,
        color: "var(--black)",
        marginBottom: 4,
      }}>
        {tool.title}
      </p>

      {/* Description */}
      <p style={{
        fontSize: 13,
        color: "var(--gray-400)",
        lineHeight: 1.5,
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }}>
        {tool.description}
      </p>
    </button>
  );
}
