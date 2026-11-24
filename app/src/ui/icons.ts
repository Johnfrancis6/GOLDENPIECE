/**
 * Lucide icon map (F4, set 1.77+; one import per glyph so the bundle only
 * holds what the app uses). Keys are the Lucide names used in design/.
 * `fingerprint` is named `fingerprint-pattern` since lucide 1.x.
 */
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import ArrowLeftRight from 'lucide-react-native/icons/arrow-left-right';
import Banknote from 'lucide-react-native/icons/banknote';
import Bus from 'lucide-react-native/icons/bus';
import Camera from 'lucide-react-native/icons/camera';
import ChartLine from 'lucide-react-native/icons/chart-line';
import ChartPie from 'lucide-react-native/icons/chart-pie';
import Check from 'lucide-react-native/icons/check';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import CircleAlert from 'lucide-react-native/icons/circle-alert';
import CircleCheck from 'lucide-react-native/icons/circle-check';
import CircleCheckBig from 'lucide-react-native/icons/circle-check-big';
import CircleEllipsis from 'lucide-react-native/icons/circle-ellipsis';
import CircleHelp from 'lucide-react-native/icons/circle-help';
import Clock from 'lucide-react-native/icons/clock';
import CreditCard from 'lucide-react-native/icons/credit-card';
import Delete from 'lucide-react-native/icons/delete';
import Download from 'lucide-react-native/icons/download';
import Ellipsis from 'lucide-react-native/icons/ellipsis';
import Eye from 'lucide-react-native/icons/eye';
import EyeOff from 'lucide-react-native/icons/eye-off';
import FingerprintPattern from 'lucide-react-native/icons/fingerprint-pattern';
import Gamepad2 from 'lucide-react-native/icons/gamepad-2';
import GraduationCap from 'lucide-react-native/icons/graduation-cap';
import HeartPulse from 'lucide-react-native/icons/heart-pulse';
import History from 'lucide-react-native/icons/history';
import House from 'lucide-react-native/icons/house';
import Landmark from 'lucide-react-native/icons/landmark';
import Languages from 'lucide-react-native/icons/languages';
import ListChecks from 'lucide-react-native/icons/list-checks';
import LoaderCircle from 'lucide-react-native/icons/loader-circle';
import LockKeyhole from 'lucide-react-native/icons/lock-keyhole';
import LockOpen from 'lucide-react-native/icons/lock-open';
import PiggyBank from 'lucide-react-native/icons/piggy-bank';
import Plus from 'lucide-react-native/icons/plus';
import ReceiptText from 'lucide-react-native/icons/receipt-text';
import RefreshCw from 'lucide-react-native/icons/refresh-cw';
import RotateCw from 'lucide-react-native/icons/rotate-cw';
import RotateCwFadingClock from 'lucide-react-native/icons/rotate-cw-fading-clock';
import ScanFace from 'lucide-react-native/icons/scan-face';
import Search from 'lucide-react-native/icons/search';
import ShieldAlert from 'lucide-react-native/icons/shield-alert';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import ShieldX from 'lucide-react-native/icons/shield-x';
import ShoppingCart from 'lucide-react-native/icons/shopping-cart';
import Smartphone from 'lucide-react-native/icons/smartphone';
import Sparkles from 'lucide-react-native/icons/sparkles';
import Tags from 'lucide-react-native/icons/tags';
import TrendingDown from 'lucide-react-native/icons/trending-down';
import TrendingUp from 'lucide-react-native/icons/trending-up';
import User from 'lucide-react-native/icons/user';
import UserRoundPlus from 'lucide-react-native/icons/user-round-plus';
import Utensils from 'lucide-react-native/icons/utensils';
import Wallet from 'lucide-react-native/icons/wallet';
import Wifi from 'lucide-react-native/icons/wifi';
import WifiOff from 'lucide-react-native/icons/wifi-off';
import X from 'lucide-react-native/icons/x';

export const ICONS = {
  'arrow-left': ArrowLeft,
  'arrow-left-right': ArrowLeftRight,
  banknote: Banknote,
  bus: Bus,
  camera: Camera,
  'chart-line': ChartLine,
  'chart-pie': ChartPie,
  check: Check,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'circle-alert': CircleAlert,
  'circle-check': CircleCheck,
  'circle-check-big': CircleCheckBig,
  'circle-ellipsis': CircleEllipsis,
  'circle-help': CircleHelp,
  clock: Clock,
  'credit-card': CreditCard,
  delete: Delete,
  download: Download,
  ellipsis: Ellipsis,
  eye: Eye,
  'eye-off': EyeOff,
  fingerprint: FingerprintPattern,
  'gamepad-2': Gamepad2,
  'graduation-cap': GraduationCap,
  'heart-pulse': HeartPulse,
  history: History,
  house: House,
  landmark: Landmark,
  languages: Languages,
  'list-checks': ListChecks,
  'loader-circle': LoaderCircle,
  'lock-keyhole': LockKeyhole,
  'lock-open': LockOpen,
  'piggy-bank': PiggyBank,
  plus: Plus,
  'receipt-text': ReceiptText,
  'refresh-cw': RefreshCw,
  'rotate-cw': RotateCw,
  'rotate-cw-fading-clock': RotateCwFadingClock,
  'scan-face': ScanFace,
  search: Search,
  'shield-alert': ShieldAlert,
  'shield-check': ShieldCheck,
  'shield-x': ShieldX,
  'shopping-cart': ShoppingCart,
  smartphone: Smartphone,
  sparkles: Sparkles,
  tags: Tags,
  'trending-down': TrendingDown,
  'trending-up': TrendingUp,
  user: User,
  'user-round-plus': UserRoundPlus,
  utensils: Utensils,
  wallet: Wallet,
  wifi: Wifi,
  'wifi-off': WifiOff,
  x: X,
} as const;

export type IconName = keyof typeof ICONS;
