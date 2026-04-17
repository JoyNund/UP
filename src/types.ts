export type UserRole = 'DEVELOPER' | 'JEFE' | 'SUPERVISOR' | 'COLABORADOR';

export interface Assistant {
  id: string;
  name: string;
  areaId: string;
  active: boolean;
  role: UserRole;
}

export interface Area {
  id: string;
  name: string;
}

export interface Indicator {
  key: string;
  label: string;
  iconName?: string;
  group?: 'CSAT';
  active: boolean;
}

export interface ProductivityRecord {
  id: string;
  timestamp: string;
  assistantId: string;
  areaId: string;
  date: string;
  [key: string]: any; // Allow dynamic indicator values
}

export type View = 'registro' | 'dashboard' | 'historial' | 'configuracion';
