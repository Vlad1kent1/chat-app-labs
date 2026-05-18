import { StyleSheet, View, Text, Alert, ScrollView, TextInput, Image, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Button } from '@ui/button';
import { Spinner } from '@ui/spinner';
import { AvatarFallback } from '@ui/avatar-fallback';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { logout, updateUserProfile, deleteUserAccount } from '@store/slices/authSlice';

interface EditFormData {
  firstName: string;
  lastName: string;
  username: string;
  phone: string;
}

export default function ProfileScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const isLoading = useAppSelector((state) => state.auth.isLoading);
  const error = useAppSelector((state) => state.auth.error);

  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<EditFormData>({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    username: user?.username || '',
    phone: user?.phone || '',
  });

  // Update form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName || '',
        username: user.username,
        phone: user.phone || '',
      });
    }
  }, [user]);

  const handleEditFieldChange = (field: keyof EditFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveProfile = async () => {
    try {
      // Validate form fields
      if (!formData.firstName.trim()) {
        Alert.alert('Validation Error', 'First name is required');
        return;
      }

      // Ensure username present
      let username = formData.username.trim();
      if (!username) {
        Alert.alert('Validation Error', 'Username is required');
        return;
      }

      const resultAction = await dispatch(
        updateUserProfile({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim() || undefined,
          username: username,
          phone: formData.phone.trim() || undefined,
        })
      );

      if (updateUserProfile.fulfilled.match(resultAction)) {
        Alert.alert('Success', 'Profile updated successfully');
        setIsEditMode(false);
      } else if (updateUserProfile.rejected.match(resultAction)) {
        Alert.alert('Error', resultAction.payload || 'Failed to update profile');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      Alert.alert('Error', message);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              const resultAction = await dispatch(deleteUserAccount());

              if (deleteUserAccount.fulfilled.match(resultAction)) {
                router.replace('/login');
              } else if (deleteUserAccount.rejected.match(resultAction)) {
                Alert.alert('Error', resultAction.payload || 'Failed to delete account');
              }
            } catch (err) {
              const message = err instanceof Error ? err.message : 'An error occurred';
              Alert.alert('Error', message);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleLogout = async () => {
    try {
      const resultAction = await dispatch(logout());
      if (logout.fulfilled.match(resultAction)) {
        router.replace('/login');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      Alert.alert('Error', message);
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.title}>No user is currently signed in.</Text>
        <Button style={styles.button} onPress={() => router.replace('/login')}>
          <Text style={styles.buttonText}>Go to login</Text>
        </Button>
      </View>
    );
  }

  if (isEditMode) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
            <View style={styles.container}>
              <View style={styles.headerRow}>
                <Text style={styles.title}>Edit Profile</Text>
              </View>

              {error && <Text style={styles.errorText}>{error}</Text>}

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>First Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter first name"
                  value={formData.firstName}
                  onChangeText={(value) => handleEditFieldChange('firstName', value)}
                  editable={!isLoading}
                />

                <Text style={styles.formLabel}>Last Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter last name (optional)"
                  value={formData.lastName}
                  onChangeText={(value) => handleEditFieldChange('lastName', value)}
                  editable={!isLoading}
                />

                <Text style={styles.formLabel}>Username *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter username"
                  value={formData.username}
                  onChangeText={(value) => handleEditFieldChange('username', value)}
                  editable={!isLoading}
                />

                <Text style={styles.formLabel}>Phone</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter phone (optional)"
                  value={formData.phone}
                  onChangeText={(value) => handleEditFieldChange('phone', value)}
                  editable={!isLoading}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.buttonColumn}>
                <Button
                  style={[styles.button, styles.primaryButton]}
                  disabled={isLoading}
                  onPress={handleSaveProfile}
                >
                  {isLoading ? (
                    <Spinner color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonText}>Save Changes</Text>
                  )}
                </Button>
                <Button
                  style={[styles.button, styles.secondaryButton]}
                  disabled={isLoading}
                  onPress={() => setIsEditMode(false)}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </Button>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Display mode
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          <Text style={styles.title}>My Profile</Text>

          {/* Avatar and status */}
          <View style={styles.avatarRow}>
            <AvatarFallback
              avatarUrl={user.avatarUrl}
              firstName={user.firstName}
              lastName={user.lastName as string}
              size="large"
            />
            <View style={styles.statusColumn}>
              <Text style={styles.statusText}>{user.isOnline ? 'Online' : 'Offline'}</Text>
              <Text style={styles.lastSeenText}>Last seen: {new Date(user.lastSeen).toLocaleString()}</Text>
            </View>
          </View>

        {/* Profile card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Profile Information</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Full Name</Text>
            <Text style={styles.infoValue}>{user.firstName} {user.lastName || ''}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user.email}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Username</Text>
            <Text style={styles.infoValue}>{user.username}</Text>
          </View>

          {user.phone && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{user.phone}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Member Since</Text>
            <Text style={styles.infoValue}>{new Date(user.createdAt).toLocaleDateString()}</Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.buttonColumn}>
          <Button style={[styles.button, styles.primaryButton]} onPress={() => setIsEditMode(true)} disabled={isLoading}>
            <Text style={styles.buttonText}>Edit Profile</Text>
          </Button>

          <Button style={[styles.button, styles.primaryButton]} disabled={isLoading} onPress={handleLogout}>
            {isLoading ? <Spinner color="#FFFFFF" /> : <Text style={styles.buttonText}>Logout</Text>}
          </Button>

          <Button style={[styles.button, styles.deleteButton]} disabled={isLoading} onPress={handleDeleteAccount}>
            <Text style={styles.deleteButtonText}>Delete Account</Text>
          </Button>
        </View>
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  container: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
  headerRow: {
    marginTop: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
  },
  statusColumn: {
    flexDirection: 'column',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },
  lastSeenText: {
    fontSize: 11,
    color: '#000000',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#000000',
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    maxWidth: '60%',
    textAlign: 'right',
  },
  formSection: {
    gap: 16,
    marginVertical: 12,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#000000',
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#000000',
  },
    buttonRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  buttonColumn: { gap: 12, marginTop: 12 },
  button: { borderRadius: 0, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },

  primaryButton: { backgroundColor: '#000000' },
  secondaryButton: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#000000' },
  deleteButton: { backgroundColor: '#000000' },

  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  secondaryButtonText: { color: '#000000', fontWeight: '700', fontSize: 14 },
  deleteButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});