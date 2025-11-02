import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Provider as PaperProvider,
  MD3LightTheme as DefaultTheme,
  Text,
  TextInput,
  Card,
  Checkbox,
  IconButton,
  FAB,
  Snackbar
} from 'react-native-paper';
import { useTaskStore } from '../../stores/taskStore';
import { format } from 'date-fns';

export default function TasksScreen() {
  const { tasks, isLoading, load, add, toggle, remove } = useTaskStore();
  const [input, setInput] = useState('');
  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });

  const theme = useMemo(() => ({
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, primary: '#6200EE' },
    roundness: 12
  }), []);

  useEffect(() => { load(); }, [load]);

  const onAdd = async () => {
    const title = input.trim();
    if (!title) return;
    await add(title);
    setInput('');
    setSnackbar({ visible: true, message: 'Task added' });
  };

  return (
    <PaperProvider theme={theme}>
      <SafeAreaView style={styles.container}>
        <Text variant="headlineSmall" style={styles.header}>Tasks</Text>
        <TextInput
          mode="outlined"
          label="New task"
          placeholder="What do you need to do?"
          value={input}
          onChangeText={setInput}
          right={<TextInput.Icon icon="plus" onPress={onAdd} />}
          style={styles.input}
        />

        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListEmptyComponent={!isLoading ? (
            <View style={styles.empty}>
              <Text style={{ color: '#6B7280' }}>No tasks yet</Text>
            </View>
          ) : null}
          renderItem={({ item }) => (
            <Card style={styles.card} mode="elevated">
              <Card.Content style={styles.row}>
                <Checkbox
                  status={item.completed ? 'checked' : 'unchecked'}
                  onPress={() => toggle(item.id)}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, item.completed && styles.completed]}>{item.title}</Text>
                  <Text style={styles.meta}>{format(new Date(item.createdAt), 'MMM d, yyyy h:mm aa')}</Text>
                </View>
                <IconButton icon="delete-outline" iconColor="#ef4444" size={20} onPress={() => remove(item.id)} />
              </Card.Content>
            </Card>
          )}
        />

        <FAB icon="plus" label="Add" onPress={onAdd} style={styles.fab} color="#fff" />
        <Snackbar visible={snackbar.visible} onDismiss={() => setSnackbar({ visible: false, message: '' })} duration={1800}>
          {snackbar.message}
        </Snackbar>
      </SafeAreaView>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  header: { marginBottom: 8 },
  input: { marginBottom: 12 },
  card: { borderRadius: 12, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 16, color: '#111' },
  completed: { textDecorationLine: 'line-through', color: '#6B7280' },
  meta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  fab: { position: 'absolute', right: 16, bottom: 24 }
});

