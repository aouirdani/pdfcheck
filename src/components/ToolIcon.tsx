import {
  Layers, Scissors, Minimize2, RotateCw, ArrowUpDown, FilePlus,
  Image, FileText, Monitor, Table, Code2, ImageDown, FileDown,
  PenLine, Stamp, Edit3, MessageSquare, Lock, Unlock, ScanText, Hash, File,
} from "lucide-react";
import type { LucideProps } from "lucide-react";

type LucideIcon = React.ComponentType<LucideProps>;

const ICON_MAP: Record<string, LucideIcon> = {
  merge:          Layers,
  split:          Scissors,
  compress:       Minimize2,
  rotate:         RotateCw,
  reorder:        ArrowUpDown,
  "add-pages":    FilePlus,
  jpg:            Image,
  word:           FileText,
  ppt:            Monitor,
  excel:          Table,
  html:           Code2,
  "pdf-to-jpg":   ImageDown,
  "pdf-to-word":  FileDown,
  "pdf-to-ppt":   Monitor,
  "pdf-to-excel": Table,
  edit:           Edit3,
  watermark:      Stamp,
  sign:           PenLine,
  annotate:       MessageSquare,
  protect:        Lock,
  unlock:         Unlock,
  ocr:            ScanText,
  "page-numbers": Hash,
};

interface Props {
  icon: string;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

export function ToolIcon({ icon, size = 16, className, strokeWidth = 1.75 }: Props) {
  const Icon = ICON_MAP[icon] ?? File;
  return <Icon size={size} className={className} strokeWidth={strokeWidth} />;
}
