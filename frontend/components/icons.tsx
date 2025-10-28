import React from 'react';
import { Feather } from '@expo/vector-icons';
import { ViewProps } from 'react-native';

type IconProps = ViewProps & { color?: string; size?: number };

export const Eye = ({ color = '#4b5563', size = 20 }: IconProps) => (
  <Feather name="eye" color={color} size={size} />
);

export const EyeOff = ({ color = '#4b5563', size = 20 }: IconProps) => (
  <Feather name="eye-off" color={color} size={size} />
);

export const Calendar = ({ color = '#4b5563', size = 20 }: IconProps) => (
  <Feather name="calendar" color={color} size={size} />
);

export const List = ({ color = '#4b5563', size = 20 }: IconProps) => (
  <Feather name="list" color={color} size={size} />
);

export const User = ({ color = '#4b5563', size = 20 }: IconProps) => (
  <Feather name="user" color={color} size={size} />
);

export const Edit3 = ({ color = '#4b5563', size = 18 }: IconProps) => (
  <Feather name="edit-3" color={color} size={size} />
);

export const Trash2 = ({ color = '#ef4444', size = 18 }: IconProps) => (
  <Feather name="trash-2" color={color} size={size} />
);


