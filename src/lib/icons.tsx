/**
 * Central icon exports — backed by @hugeicons/react (stroke-rounded, 1.5px).
 * Drop-in replacement for lucide-react: same <IconName className="w-4 h-4" /> API.
 */
import { forwardRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert01Icon,
  AlertCircleIcon,
  ArrowLeft01Icon,
  ArrowUpRight01Icon,
  Award01Icon,
  BookMarkedIcon,
  BookOpen01Icon,
  Cancel01Icon,
  CancelCircleIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  CheckmarkCircle01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Copy01Icon,
  DashboardBrowsingIcon,
  Delete02Icon,
  Download01Icon,
  ExternalLinkIcon,
  File01Icon,
  Home01Icon,
  ImageAdd01Icon,
  Layers01Icon,
  LayoutGridIcon,
  LeftToRightListBulletIcon,
  LibraryIcon,
  Loading02Icon,
  Maximize01Icon,
  Message01Icon,
  Minimize01Icon,
  MoreVerticalIcon,
  PauseIcon,
  PencilEdit01Icon,
  PlayIcon,
  PlusSignIcon,
  PrinterIcon,
  Refresh01Icon,
  Robot01Icon,
  Rotate01Icon,
  Search01Icon,
  SentIcon,
  Share01Icon,
  Shield01Icon,
  ShuffleIcon,
  SparklesIcon,
  Square01Icon,
  TextFontIcon,
  Upload01Icon,
  User02Icon,
  ViewIcon,
  ViewOffIcon,
  WifiOff01Icon,
  ZapIcon,
  ZoomInAreaIcon,
  ZoomOutAreaIcon,
  BookmarkAdd01Icon,
  Layers02Icon,
  Logout01Icon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  Settings01Icon,
  Menu01Icon,
  Notification01Icon,
  TickDouble01Icon,
  ArrowRight01Icon,
  Analytics01Icon,
  BarChartIcon,
  Brain01Icon,
  Building02Icon,
  Camera01Icon,
  Tick01Icon,
  ClipboardIcon,
  Coffee01Icon,
  CpuIcon,
  CreditCardIcon,
  DatabaseIcon,
  FileTypeIcon,
  FireIcon,
  GiftIcon,
  Link02Icon,
  LockIcon,
  Megaphone01Icon,
  AiNetworkIcon,
  ColorsIcon,
  PlusSignCircleIcon,
  ShieldBanIcon,
  SmartPhone01Icon,
  SlidersHorizontalIcon,
  StarIcon,
  Target01Icon,
  Timer01Icon,
  ToggleOffIcon,
  ToggleOnIcon,
  TrendingUpDownIcon,
  UserSettings01Icon,
  UserGroupIcon,
  Award01Icon as Award01IconAlias,
} from "@hugeicons/core-free-icons";
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number; color?: string };

function hi(iconData: unknown) {
  return forwardRef<SVGSVGElement, IconProps>(
    ({ className = "", style, size = 24, color = "currentColor", ...rest }, ref) =>
      <HugeiconsIcon ref={ref as any} icon={iconData as any} className={className} style={style} size={size} color={color} {...(rest as any)} />
  );
}

// ── Exports matching lucide-react names ───────────────────────────────────────
export const AlertCircle    = hi(AlertCircleIcon);
export const AlertTriangle  = hi(Alert01Icon);
export const ArrowLeft      = hi(ArrowLeft01Icon);
export const ArrowUpRight   = hi(ArrowUpRight01Icon);
export const BookMarked     = hi(BookMarkedIcon);
export const BookOpen       = hi(BookOpen01Icon);
export const Bot            = hi(Robot01Icon);
export const CheckCircle    = hi(CheckmarkCircle01Icon);
export const CheckCircle2   = hi(CheckmarkCircle02Icon);
export const ChevronDown    = hi(ChevronDownIcon);
export const ChevronLeft    = hi(ChevronLeftIcon);
export const ChevronRight   = hi(ChevronRightIcon);
export const ChevronUp      = hi(ChevronUpIcon);
export const Clock          = hi(Clock01Icon);
export const Copy           = hi(Copy01Icon);
export const Download       = hi(Download01Icon);
export const ExternalLink   = hi(ExternalLinkIcon);
export const Eye            = hi(ViewIcon);
export const EyeOff         = hi(ViewOffIcon);
export const FileText       = hi(File01Icon);
export const Home           = hi(Home01Icon);
export const ImagePlus      = hi(ImageAdd01Icon);
export const Layers         = hi(Layers01Icon);
export const LayoutDashboard = hi(DashboardBrowsingIcon);
export const LayoutGrid     = hi(LayoutGridIcon);
export const Library        = hi(LibraryIcon);
export const List           = hi(LeftToRightListBulletIcon);
export const Loader2        = hi(Loading02Icon);
export const Maximize2      = hi(Maximize01Icon);
export const MessageSquare  = hi(Message01Icon);
export const Minimize2      = hi(Minimize01Icon);
export const MoreVertical   = hi(MoreVerticalIcon);
export const Pause          = hi(PauseIcon);
export const Pencil         = hi(PencilEdit01Icon);
export const Play           = hi(PlayIcon);
export const Plus           = hi(PlusSignIcon);
export const Printer        = hi(PrinterIcon);
export const RefreshCw      = hi(Refresh01Icon);
export const RotateCcw      = hi(Rotate01Icon);
export const Search         = hi(Search01Icon);
export const Send           = hi(SentIcon);
export const Share          = hi(Share01Icon);
export const Shield         = hi(Shield01Icon);
export const Shuffle        = hi(ShuffleIcon);
export const Sparkles       = hi(SparklesIcon);
export const Square         = hi(Square01Icon);
export const Trash2         = hi(Delete02Icon);
export const Trophy         = hi(Award01Icon);
export const Type           = hi(TextFontIcon);
export const Upload         = hi(Upload01Icon);
export const User           = hi(User02Icon);
export const WifiOff        = hi(WifiOff01Icon);
export const X              = hi(Cancel01Icon);
export const XCircle        = hi(CancelCircleIcon);
export const Zap            = hi(ZapIcon);
export const ZoomIn         = hi(ZoomInAreaIcon);
export const ZoomOut        = hi(ZoomOutAreaIcon);
// Extras used in sidebar / navbar / nav
export const BookmarkPlus       = hi(BookmarkAdd01Icon);
export const Layers3            = hi(Layers02Icon);
export const LogOut             = hi(Logout01Icon);
export const PanelLeftClose     = hi(PanelLeftCloseIcon);
export const PanelLeftOpen      = hi(PanelLeftOpenIcon);
export const Settings           = hi(Settings01Icon);
export const Menu               = hi(Menu01Icon);
export const Bell               = hi(Notification01Icon);
export const CheckCheck         = hi(TickDouble01Icon);
export const ArrowRight         = hi(ArrowRight01Icon);
export const Award              = hi(Award01IconAlias);
export const BarChart2          = hi(Analytics01Icon);
export const BarChart3          = hi(BarChartIcon);
export const Brain              = hi(Brain01Icon);
export const Building2          = hi(Building02Icon);
export const Camera             = hi(Camera01Icon);
export const Check              = hi(Tick01Icon);
export const ClipboardList      = hi(ClipboardIcon);
export const Coffee             = hi(Coffee01Icon);
export const Cpu                = hi(CpuIcon);
export const CreditCard         = hi(CreditCardIcon);
export const Database           = hi(DatabaseIcon);
export const File               = hi(File01Icon);
export const FileType2          = hi(FileTypeIcon);
export const Flame              = hi(FireIcon);
export const Gift               = hi(GiftIcon);
export const Link2              = hi(Link02Icon);
export const Lock               = hi(LockIcon);
export const Megaphone          = hi(Megaphone01Icon);
export const Network            = hi(AiNetworkIcon);
export const Palette            = hi(ColorsIcon);
export const PlusCircle         = hi(PlusSignCircleIcon);
export const ShieldCheck        = hi(Shield01Icon);
export const ShieldOff          = hi(ShieldBanIcon);
export const Smartphone         = hi(SmartPhone01Icon);
export const SlidersHorizontal  = hi(SlidersHorizontalIcon);
export const Star               = hi(StarIcon);
export const Target             = hi(Target01Icon);
export const Timer              = hi(Timer01Icon);
export const ToggleLeft         = hi(ToggleOffIcon);
export const ToggleRight        = hi(ToggleOnIcon);
export const TrendingDown       = hi(TrendingUpDownIcon);
export const TrendingUp         = hi(TrendingUpDownIcon);
export const UserCog            = hi(UserSettings01Icon);
export const Users              = hi(UserGroupIcon);
