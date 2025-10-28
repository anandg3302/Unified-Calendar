declare module 'lucide-react-native' {
  import React from 'react';
  import { ViewProps } from 'react-native';

  export interface IconProps extends ViewProps {
    color?: string;
    size?: number;
    strokeWidth?: number;
  }

  export const Eye: React.FC<IconProps>;
  export const EyeOff: React.FC<IconProps>;
  export const Calendar: React.FC<IconProps>;
  export const List: React.FC<IconProps>;
  export const User: React.FC<IconProps>;
  export const Edit3: React.FC<IconProps>;
  export const Trash2: React.FC<IconProps>;
}


