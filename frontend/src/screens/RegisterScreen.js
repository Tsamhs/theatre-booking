import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
  ScrollView, TouchableWithoutFeedback, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

export default function RegisterScreen({ navigation }) {
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const { register } = useAuth();
  const emailRef    = useRef(null);
  const passwordRef = useRef(null);

  async function handleRegister() {
    Keyboard.dismiss();
    if (!name.trim() || !email.trim() || !password) {
      setError('Παρακαλώ συμπληρώστε όλα τα πεδία.');
      return;
    }
    if (password.length < 8) {
      setError('Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await register(name.trim(), email.trim().toLowerCase(), password);
      Alert.alert(
        'Εγγραφή Επιτυχής! 🎉',
        'Ο λογαριασμός σας δημιουργήθηκε. Μπορείτε να συνδεθείτε.',
        [{ text: 'Σύνδεση', onPress: () => navigation.navigate('Login') }]
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Αποτυχία εγγραφής. Δοκιμάστε ξανά.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#0D1B3E', '#0A0D1A', '#0A0D1A']}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === 'ios'     ? 'padding' :
          Platform.OS === 'android' ? 'height'  : undefined
        }
      >
        <TouchableWithoutFeedback
          onPress={Keyboard.dismiss}
          disabled={Platform.OS === 'web'}
        >
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
          >
            <SafeAreaView edges={['top']}>
              {/* Logo */}
              <View style={styles.logoArea}>
                <LinearGradient colors={['#1565C0', '#1E88E5']} style={styles.logoCircle}>
                  <Ionicons name="film" size={36} color={COLORS.white} />
                </LinearGradient>
                <Text style={styles.appName}>CineBook</Text>
                <Text style={styles.appTagline}>Δημιουργία Λογαριασμού</Text>
              </View>
            </SafeAreaView>

            {/* Form card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Εγγραφή</Text>

              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Name */}
              <Text style={styles.label}>Ονοματεπώνυμο</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="person-outline" size={18} color={COLORS.textDim} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Γιάννης Παπαδόπουλος"
                  placeholderTextColor={COLORS.placeholder}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                />
              </View>

              {/* Email */}
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="mail-outline" size={18} color={COLORS.textDim} style={styles.inputIcon} />
                <TextInput
                  ref={emailRef}
                  style={styles.input}
                  placeholder="your@email.com"
                  placeholderTextColor={COLORS.placeholder}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              </View>

              {/* Password */}
              <Text style={styles.label}>Κωδικός</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={COLORS.textDim} style={styles.inputIcon} />
                <TextInput
                  ref={passwordRef}
                  style={styles.input}
                  placeholder="Τουλάχιστον 8 χαρακτήρες"
                  placeholderTextColor={COLORS.placeholder}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                  returnKeyType="done"
                  onSubmitEditing={handleRegister}
                />
                <TouchableOpacity onPress={() => setShowPass(v => !v)} style={styles.eyeBtn}>
                  <Ionicons
                    name={showPass ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={COLORS.textDim}
                  />
                </TouchableOpacity>
              </View>

              {/* Submit */}
              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#1565C0', '#1E88E5']}
                  style={styles.submitBtnInner}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {loading
                    ? <ActivityIndicator color={COLORS.white} />
                    : <Text style={styles.submitBtnText}>Εγγραφή</Text>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <TouchableOpacity
              style={styles.footer}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.footerText}>
                Έχετε ήδη λογαριασμό;{'  '}
                <Text style={styles.footerLink}>Συνδεθείτε</Text>
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

// Platform-specific input style — defined once outside StyleSheet.create
// to avoid the JSX prop spread syntax error
const webInput = Platform.OS === 'web'
  ? { outlineStyle: 'none', cursor: 'text' }
  : {};

const styles = StyleSheet.create({
  root:      { flex: 1, backgroundColor: COLORS.background },
  flex:      { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },

  logoArea: { alignItems: 'center', paddingTop: 32, paddingBottom: 32 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  appName:    { fontSize: 30, fontWeight: '900', color: COLORS.white, letterSpacing: 1 },
  appTagline: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: COLORS.border,
    marginBottom: 24,
  },
  cardTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 20 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.errorBg,
    borderRadius: 10, padding: 12, marginBottom: 16,
    borderLeftWidth: 3, borderLeftColor: COLORS.error,
  },
  errorText: { color: COLORS.error, fontSize: 13, flex: 1 },

  label: {
    fontSize: 12, fontWeight: '600',
    color: COLORS.textSecondary, marginBottom: 6, marginTop: 16,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 8 },

  // outlineStyle + cursor live in the StyleSheet — NOT as inline JSX props
  input: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 15,
    color: COLORS.text,
    ...webInput,
  },
  eyeBtn: { padding: 8 },

  submitBtn:         { borderRadius: 12, overflow: 'hidden', marginTop: 24 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnInner:    { paddingVertical: 16, alignItems: 'center' },
  submitBtnText:     { color: COLORS.white, fontSize: 16, fontWeight: '700' },

  footer:     { alignItems: 'center' },
  footerText: { color: COLORS.textSecondary, fontSize: 14 },
  footerLink: { color: COLORS.primary, fontWeight: '700' },
});
