import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface TaskItem {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

interface TaskState {
  tasks: TaskItem[];
  isLoading: boolean;
  load: () => Promise<void>;
  add: (title: string) => Promise<void>;
  toggle: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

const STORAGE_KEY = 'tasks_v1';

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  isLoading: false,
  load: async () => {
    try {
      set({ isLoading: true });
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) set({ tasks: JSON.parse(raw) });
    } finally {
      set({ isLoading: false });
    }
  },
  add: async (title: string) => {
    const newTask: TaskItem = {
      id: Math.random().toString(36).slice(2),
      title: title.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };
    const next = [newTask, ...get().tasks];
    set({ tasks: next });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  },
  toggle: async (id: string) => {
    const next = get().tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    set({ tasks: next });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  },
  remove: async (id: string) => {
    const next = get().tasks.filter(t => t.id !== id);
    set({ tasks: next });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
}));











