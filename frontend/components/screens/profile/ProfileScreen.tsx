import { StyleSheet } from 'react-native';

import { ThemedText } from '@common/themed-text';
import { ThemedView } from '@common/themed-view';

export default function ProfileScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Profile
      </ThemedText>
      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">User profile</ThemedText>
        <ThemedText style={styles.detail}>Display name: Jane Doe</ThemedText>
        <ThemedText style={styles.detail}>Email: jane.doe@example.com</ThemedText>
        <ThemedText style={styles.detail}>Status: Active</ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
  },
  title: {
    marginBottom: 8,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    gap: 8,
  },
  detail: {
    color: '#475569',
  },
});
