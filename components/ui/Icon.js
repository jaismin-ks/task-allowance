// components/ui/Icon.js
// Outline icon set from the Figma Components page — one stroke weight everywhere.
// Icons are decorative by default; the control that wraps them carries the label.
import {
  ArrowRight,
  Camera,
  ChartColumn,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ClipboardPaste,
  ExternalLink,
  Flame,
  Gift,
  ImagePlus,
  Info,
  Link,
  ListChecks,
  Mic,
  Minus,
  Pencil,
  Plus,
  Repeat,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Square,
  Target,
  Trash2,
  TriangleAlert,
  Trophy,
  X,
} from 'lucide-react-native';
import { useColors } from '../../theme/theme';

const ICONS = {
  'arrow-right': ArrowRight,
  camera: Camera,
  chart: ChartColumn,
  check: Check,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  alert: CircleAlert,
  paste: ClipboardPaste,
  external: ExternalLink,
  flame: Flame,
  gift: Gift,
  image: ImagePlus,
  info: Info,
  link: Link,
  checklist: ListChecks,
  mic: Mic,
  minus: Minus,
  pencil: Pencil,
  plus: Plus,
  repeat: Repeat,
  retry: RotateCcw,
  search: Search,
  sliders: SlidersHorizontal,
  sparkle: Sparkles,
  stop: Square,
  target: Target,
  trash: Trash2,
  warning: TriangleAlert,
  trophy: Trophy,
  close: X,
};

export function Icon({ name, size = 20, color, strokeWidth = 1.75, ...props }) {
  const colors = useColors();
  const Glyph = ICONS[name];
  if (!Glyph) return null;
  return (
    <Glyph
      size={size}
      color={color ?? colors.text}
      strokeWidth={strokeWidth}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      {...props}
    />
  );
}
