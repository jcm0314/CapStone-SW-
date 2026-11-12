import React from 'react';
import {
  Highlighter, MessagesSquare, UserCheck, Share2, Users, Printer, Upload, Sprout, Building2,
  Send, Columns2, Columns3, Tags, ListOrdered, Hash, Plug, FileText, Gauge, SlidersHorizontal, Moon, Sun, Plus, Circle
} from 'lucide-react';

const ICONS = {
  Highlighter, MessagesSquare, UserCheck, Share2, Users, Printer, Upload, Sprout, Building2,
  Send, Columns2, Columns3, Tags, ListOrdered, Hash, Plug, FileText, Gauge, SlidersHorizontal, Moon, Sun, Plus
};

export default function FeatureIcon({ name, className = 'w-4 h-4' }) {
  const Icon = ICONS[name] || Circle;
  return <Icon className={className} aria-hidden="true" />;
}
