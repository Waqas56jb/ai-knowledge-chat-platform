import {
  Plus, LayoutDashboard, History, Library, Settings, PanelLeft, Search, LogOut, Menu, ChevronRight, Bell, User, Paperclip, Layers, X,
  ArrowUp, MessageSquare, HelpCircle, Activity, PlayCircle, FileText, AlignLeft, MessagesSquare, AlertCircle, Quote, Copy, BookOpen,
  ThumbsUp, ThumbsDown, RefreshCw, MoreHorizontal, ExternalLink, AlertTriangle, Pencil, Scale, MoreVertical, Clock, List, LayoutGrid,
  Tv, File, Users, Play, Calendar, Check, CheckCircle, Info, Eye, EyeOff, ArrowLeft, ArrowRight, Map, Sliders, Shield, Monitor, Sun,
  Moon, Trash2, Mail, Lock, Key, Sparkles, ShieldCheck, SearchCheck, CheckCircle2
} from 'lucide-react';

/* Kebab-case names keep the same vocabulary as the data files (e.g. TYPES[t].icon). */
const ICONS = {
  'plus': Plus, 'layout-dashboard': LayoutDashboard, 'history': History, 'library': Library, 'settings': Settings, 'panel-left': PanelLeft,
  'search': Search, 'log-out': LogOut, 'menu': Menu, 'chevron-right': ChevronRight, 'bell': Bell, 'user': User, 'paperclip': Paperclip,
  'layers': Layers, 'x': X, 'arrow-up': ArrowUp, 'message-square': MessageSquare, 'help-circle': HelpCircle, 'activity': Activity,
  'play-circle': PlayCircle, 'file-text': FileText, 'align-left': AlignLeft, 'messages-square': MessagesSquare, 'alert-circle': AlertCircle,
  'quote': Quote, 'copy': Copy, 'book-open': BookOpen, 'thumbs-up': ThumbsUp, 'thumbs-down': ThumbsDown, 'refresh-cw': RefreshCw,
  'more-horizontal': MoreHorizontal, 'external-link': ExternalLink, 'alert-triangle': AlertTriangle, 'pencil': Pencil, 'scale': Scale,
  'more-vertical': MoreVertical, 'clock': Clock, 'list': List, 'layout-grid': LayoutGrid, 'tv': Tv, 'file': File, 'users': Users,
  'play': Play, 'calendar': Calendar, 'check': Check, 'check-circle': CheckCircle, 'info': Info, 'eye': Eye, 'eye-off': EyeOff,
  'arrow-left': ArrowLeft, 'arrow-right': ArrowRight, 'map': Map, 'sliders': Sliders, 'shield': Shield, 'monitor': Monitor, 'sun': Sun,
  'moon': Moon, 'trash-2': Trash2, 'mail': Mail, 'lock': Lock, 'key': Key, 'sparkles': Sparkles, 'shield-check': ShieldCheck,
  'search-check': SearchCheck, 'check-circle-2': CheckCircle2
};

/** App icon: renders with class "ic" (sized by CSS). */
export default function Icon({ name, className = '' }) {
  const C = ICONS[name];
  if (!C) return null;
  return <C className={('ic ' + className).trim()} aria-hidden="true" />;
}

/** Landing icon: uses the l- namespaced class. */
export function LIcon({ name }) {
  const C = ICONS[name];
  return C ? <C className="l-ic" aria-hidden="true" /> : null;
}
