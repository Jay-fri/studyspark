import {
  BookOpen, Brain, FlaskConical, Atom, Globe, Code2, Calculator,
  Palette, Music, Heart, Leaf, Cpu, Rocket, Trophy, Lightbulb,
  Zap, Star, PenLine, Clock, Microscope, GraduationCap, Map,
  Camera, Sigma, type LucideIcon,
} from "lucide-react";

export interface NotebookIconDef {
  key:   string;
  icon:  LucideIcon;
  label: string;
}

export const NOTEBOOK_ICON_SET: NotebookIconDef[] = [
  { key: "BookOpen",      icon: BookOpen,      label: "General"     },
  { key: "Brain",         icon: Brain,         label: "Psychology"  },
  { key: "FlaskConical",  icon: FlaskConical,  label: "Chemistry"   },
  { key: "Atom",          icon: Atom,          label: "Physics"     },
  { key: "Globe",         icon: Globe,         label: "Geography"   },
  { key: "Code2",         icon: Code2,         label: "Programming" },
  { key: "Calculator",    icon: Calculator,    label: "Mathematics" },
  { key: "Palette",       icon: Palette,       label: "Arts"        },
  { key: "Music",         icon: Music,         label: "Music"       },
  { key: "Heart",         icon: Heart,         label: "Medicine"    },
  { key: "Leaf",          icon: Leaf,          label: "Biology"     },
  { key: "Cpu",           icon: Cpu,           label: "Technology"  },
  { key: "Rocket",        icon: Rocket,        label: "Engineering" },
  { key: "Trophy",        icon: Trophy,        label: "Sports"      },
  { key: "Lightbulb",     icon: Lightbulb,     label: "Philosophy"  },
  { key: "Zap",           icon: Zap,           label: "Energy"      },
  { key: "Star",          icon: Star,          label: "Astronomy"   },
  { key: "PenLine",       icon: PenLine,       label: "Literature"  },
  { key: "Clock",         icon: Clock,         label: "History"     },
  { key: "Microscope",    icon: Microscope,    label: "Research"    },
  { key: "GraduationCap", icon: GraduationCap, label: "Academic"    },
  { key: "Map",           icon: Map,           label: "Geography"   },
  { key: "Camera",        icon: Camera,        label: "Media"       },
  { key: "Sigma",         icon: Sigma,         label: "Statistics"  },
];

const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  NOTEBOOK_ICON_SET.map(({ key, icon }) => [key, icon])
);

export const DEFAULT_NOTEBOOK_ICON = "BookOpen";

export function isIconKey(value: string | null | undefined): boolean {
  return !!value && value in ICON_MAP;
}

/**
 * Renders a Lucide icon for icon-key values, or falls back to emoji text for
 * legacy notebooks that stored an emoji string before this system was introduced.
 */
export function NotebookIcon({
  value,
  size = 18,
  color = "#38E0C3",
  strokeWidth = 1.75,
  className = "",
}: {
  value: string | null | undefined;
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}) {
  const Icon = value ? ICON_MAP[value] : null;
  if (Icon) {
    return <Icon size={size} strokeWidth={strokeWidth} style={{ color }} className={className} />;
  }
  // Legacy emoji fallback — keeps old notebooks working
  return (
    <span style={{ fontSize: size * 1.05, lineHeight: 1 }} className={className}>
      {value || "📚"}
    </span>
  );
}
