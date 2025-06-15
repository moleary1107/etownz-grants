import type { LucideIcon } from 'lucide-react'

// Core icons used frequently across the application (5+ files)
export {
  CheckCircle,
  Clock,
  RefreshCw,
  Eye,
  Search,
  Target,
  FileText,
  TrendingUp,
  Users,
  Download,
  Calendar,
  Settings,
  Plus,
  Edit,
  DollarSign,
  ArrowRight,
  Star,
  AlertTriangle,
  Save,
  ChevronDown,
  ChevronRight,
  Brain,
  Trash2,
  Upload,
  Bell,
  Home,
  Grid,
  Activity,
  BarChart3,
  Building,
  Filter,
  Folder,
  Info,
  X,
  Check,
  Copy,
  Share2,
  BookOpen,
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  Unlock,
  Shield,
  Zap,
  Database,
  Server,
  Globe,
  Link,
  Workflow,
  Play,
  Pause,
  Edit3,
  Gauge,
  Cpu,
  Lightbulb,
  GitBranch,
  GitCommit,
  GitMerge,
  GitPullRequest,
  ArrowLeftRight,
  MoreHorizontal,
  RotateCcw,
  GripVertical,
  Sparkles
} from 'lucide-react'

// Icon component type for consistent usage
export type IconComponent = LucideIcon

// Icon props interface
export interface IconProps {
  className?: string
  size?: number
  color?: string
  strokeWidth?: number
}

// Commonly used icon combinations for specific contexts
export const IconSets = {
  // Status icons
  status: {
    success: CheckCircle,
    warning: AlertTriangle,
    error: X,
    info: Info,
    loading: RefreshCw
  },
  
  // Navigation icons
  navigation: {
    home: Home,
    settings: Settings,
    user: User,
    search: Search,
    grid: Grid
  },
  
  // Action icons  
  actions: {
    edit: Edit,
    save: Save,
    download: Download,
    upload: Upload,
    copy: Copy,
    share: Share2,
    delete: Trash2
  },
  
  // Data icons
  data: {
    chart: BarChart3,
    trending: TrendingUp,
    activity: Activity,
    database: Database,
    server: Server
  },
  
  // Content icons
  content: {
    file: FileText,
    folder: Folder,
    book: BookOpen,
    star: Star,
    target: Target
  }
} as const

// Helper function to get icon by name (for dynamic usage)
export const getIcon = (iconName: string): IconComponent | null => {
  const iconMap: Record<string, IconComponent> = {
    CheckCircle,
    Clock,
    RefreshCw,
    Eye,
    Search,
    Target,
    FileText,
    TrendingUp,
    Users,
    Download,
    Calendar,
    Settings,
    Plus,
    Edit,
    DollarSign,
    ArrowRight,
    Star,
    AlertTriangle,
    Save,
    ChevronDown,
    ChevronRight,
    Brain,
    Trash2,
    Upload,
    Bell,
    Home,
    Grid,
    Activity,
    BarChart3,
    Building,
    Filter,
    Folder,
    Info,
    X,
    Check,
    Copy,
    Share2,
    BookOpen,
    User,
    Mail,
    Phone,
    MapPin,
    Lock,
    Unlock,
    Shield,
    Zap,
    Database,
    Server,
    Globe,
    Link,
    Workflow,
    Play,
    Pause,
    Edit3,
    Gauge,
    Cpu,
    Lightbulb,
    GitBranch,
    GitCommit,
    GitMerge,
    GitPullRequest,
    ArrowLeftRight,
    MoreHorizontal,
    RotateCcw,
    GripVertical,
    Sparkles
  }
  
  return iconMap[iconName] || null
}

// Default icon props
export const defaultIconProps: IconProps = {
  className: 'w-4 h-4',
  strokeWidth: 2
}