export type Category =
  | 'administrator'
  | 'dt_operations_manager'
  | 'field_engineer'
  | 'analyst'
  | 'household_consumer';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  systemNumber: string;
  category: Category;
  place: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export const CATEGORY_INFO: Record<Category, { label: string; emoji: string; description: string; color: string; bgColor: string; borderColor: string }> = {
  administrator: {
    label: 'Administrator',
    emoji: '🔐',
    description: 'Full system access, model configuration & thresholds',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
  dt_operations_manager: {
    label: 'DT Operations Manager',
    emoji: '⚙️',
    description: 'Transformer assets, maintenance & operations',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  field_engineer: {
    label: 'Field Engineer',
    emoji: '🛠️',
    description: 'Maintenance scheduling & field execution',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  analyst: {
    label: 'Analyst (Read-Only)',
    emoji: '👁️',
    description: 'View-only reports, feeders, transformers & analytics',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
  },
  household_consumer: {
    label: 'Household Consumer',
    emoji: '🏠',
    description: 'Private usage insights & NILM data view',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
  },
};
