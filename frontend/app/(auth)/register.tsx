import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Eye, EyeOff } from '../../components/icons';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { register, loginWithGoogle } = useAuth();
  const router = useRouter();

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      await register(email, password, name);
      router.replace('/(auth)/login');
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setIsLoading(true);
    try {
      await loginWithGoogle();
      // AuthContext listener handles navigation on success
    } catch (error: any) {
      Alert.alert('Google Signup Failed', error.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="calendar" size={60} color="#f97316" />
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join to manage all your calendars</Text>
        </View>

        {/* Form Fields */}
        <View style={styles.form}>
          {/* Name */}
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={name}
              onChangeText={setName}
              editable={!isLoading}
            />
          </View>

          {/* Email */}
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
            />
          </View>

          {/* Password */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password (min 6 characters)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              editable={!isLoading}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              accessibilityRole="button"
              accessibilityLabel="Toggle password visibility"
            >
              {showPassword ? <EyeOff size={20} color="#666" /> : <Eye size={20} color="#666" />}
            </TouchableOpacity>
          </View>

          {/* Register Button */}
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          {/* Google Register */}
          <TouchableOpacity
            style={[styles.googleButton, isLoading && styles.buttonDisabled]}
            onPress={handleGoogleRegister}
            disabled={isLoading}
          >
            <Ionicons name="logo-google" size={20} color="#fff" style={styles.googleIcon} />
            <Text style={styles.buttonText}>Sign up with Google</Text>
          </TouchableOpacity>

          {/* Navigate to Login */}
          <TouchableOpacity onPress={() => router.back()} disabled={isLoading}>
            <Text style={styles.linkText}>
              Already have an account?{' '}
              <Text style={styles.linkTextBold}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', padding: 16 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 5,
  },
  header: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 28, fontWeight: '700', color: '#333', marginTop: 8 },
  subtitle: { fontSize: 15, color: '#666', marginTop: 4 },
  form: { width: '100%' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f3b78b',
    borderRadius: 10,
    marginBottom: 16,
    paddingHorizontal: 14,
    backgroundColor: '#fdfdfd',
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 50, fontSize: 16, color: '#333' },
  button: {
    backgroundColor: '#f97316',
    borderRadius: 10,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    flexDirection: 'row',
  },
  googleButton: {
    backgroundColor: '#DB4437',
    borderRadius: 10,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    flexDirection: 'row',
  },
  googleIcon: { marginRight: 8 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkText: { textAlign: 'center', color: '#666', fontSize: 14, marginTop: 20 },
  linkTextBold: { color: '#f97316', fontWeight: '600' },
});
