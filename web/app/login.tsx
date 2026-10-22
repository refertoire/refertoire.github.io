import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Image,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useRepertoire } from '@/context/RepertoireContext';
import { DatabaseService } from '@/services/databaseService';

type AuthMode = 'signin' | 'signup';
type EnsembleMode = 'join' | 'create';

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme];
  const {
    currentUser,
    currentInstance,
    signUp,
    signIn,
    signOutUser,
    signInWithCode,
    createGroup,
  } = useRepertoire();

  // Auth Form State
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  // Ensemble Form State
  const [ensembleMode, setEnsembleMode] = useState<EnsembleMode>('join');
  const [joinCode, setJoinCode] = useState('');
  const [ensembleName, setEnsembleName] = useState('');
  const [directorName, setDirectorName] = useState(currentUser?.fullName || '');
  const [seasonName, setSeasonName] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [ensembleLoading, setEnsembleLoading] = useState(false);
  const [ensembleError, setEnsembleError] = useState<string | null>(null);

  const handleSignUp = async () => {
    if (!fullName.trim()) {
      setAuthError('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setAuthError('Please enter an email address.');
      return;
    }
    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }

    setAuthError(null);
    setAuthSuccess(null);
    setAuthLoading(true);

    const res = await signUp({
      fullName: fullName.trim(),
      email: email.trim(),
      password,
    });

    setAuthLoading(false);

    if (res.success) {
      if (res.requiresEmailConfirmation) {
        setAuthSuccess(
          res.message || 'Verification link sent to your email. Confirm and sign in.'
        );
        setAuthMode('signin');
      } else {
        setDirectorName(fullName.trim());
      }
    } else {
      setAuthError(res.error || 'Failed to create account.');
    }
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setAuthError('Please enter email and password.');
      return;
    }

    setAuthError(null);
    setAuthSuccess(null);
    setAuthLoading(true);

    const res = await signIn({
      email: email.trim(),
      password,
    });

    setAuthLoading(false);

    if (res.success) {
      if (currentInstance) {
        router.replace('/(tabs)');
      }
    } else {
      setAuthError(res.error || 'Sign in failed. Check credentials.');
    }
  };

  const handleJoinEnsemble = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setEnsembleError('Enter your 8-character ensemble access code.');
      return;
    }

    setEnsembleError(null);
    setEnsembleLoading(true);

    const res = await signInWithCode(code);
    setEnsembleLoading(false);

    if (res.success) {
      router.replace('/(tabs)');
    } else {
      setEnsembleError(res.error || `Ensemble code "${code}" not found.`);
    }
  };

  const handleCreateEnsemble = async () => {
    if (!ensembleName.trim()) {
      setEnsembleError('Enter the ensemble or choir name.');
      return;
    }
    const finalDirector = (directorName || currentUser?.fullName || '').trim();
    if (!finalDirector) {
      setEnsembleError('Specify the director name.');
      return;
    }

    setEnsembleError(null);
    setEnsembleLoading(true);

    const res = await createGroup({
      name: ensembleName.trim(),
      director: finalDirector,
      seasonName: seasonName.trim() || undefined,
      customCode: customCode.trim() || undefined,
    });

    setEnsembleLoading(false);

    if (res.success) {
      router.replace('/(tabs)');
    } else {
      setEnsembleError(res.error || 'Failed to create ensemble.');
    }
  };

  const handleSuggestCode = () => {
    if (ensembleName.trim()) {
      setCustomCode(DatabaseService.generateUniqueCode(ensembleName));
    } else {
      setCustomCode(DatabaseService.generateUniqueCode());
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          {/* Compact Brand Header */}
          <View style={styles.header}>
            <Image
              source={require('@/assets/images/refertoire-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={[styles.brandTitle, { color: theme.text }]}>Refertoire</Text>
            <Text style={[styles.brandSub, { color: theme.subtext }]}>
              Ensemble Repertoire & Sheet Music Sync
            </Text>
          </View>

          {/* STEP 1: AUTHENTICATION */}
          {!currentUser ? (
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              {/* Segmented Switcher */}
              <View style={[styles.segmentedBar, { backgroundColor: theme.surfaceSubtle }]}>
                <TouchableOpacity
                  style={[
                    styles.segBtn,
                    authMode === 'signin' && [styles.segBtnActive, { backgroundColor: theme.card }],
                  ]}
                  onPress={() => {
                    setAuthMode('signin');
                    setAuthError(null);
                    setAuthSuccess(null);
                  }}>
                  <Text
                    style={[
                      styles.segText,
                      { color: authMode === 'signin' ? theme.text : theme.subtext },
                      authMode === 'signin' && styles.segTextActive,
                    ]}>
                    Sign In
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.segBtn,
                    authMode === 'signup' && [styles.segBtnActive, { backgroundColor: theme.card }],
                  ]}
                  onPress={() => {
                    setAuthMode('signup');
                    setAuthError(null);
                    setAuthSuccess(null);
                  }}>
                  <Text
                    style={[
                      styles.segText,
                      { color: authMode === 'signup' ? theme.text : theme.subtext },
                      authMode === 'signup' && styles.segTextActive,
                    ]}>
                    Create Account
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Status / Alert Messages */}
              {authSuccess && (
                <View style={styles.successBox}>
                  <Ionicons name="checkmark-circle" size={16} color="#059669" />
                  <Text style={styles.successText}>{authSuccess}</Text>
                </View>
              )}

              {authError && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color="#DC2626" />
                  <Text style={styles.errorText}>{authError}</Text>
                </View>
              )}

              {authMode === 'signup' && (
                <View style={styles.formGroup}>
                  <Text style={[styles.fieldLabel, { color: theme.text }]}>Full Name</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.text }]}
                    placeholder="e.g. Julian Vance"
                    placeholderTextColor={theme.subtext}
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                  />
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={[styles.fieldLabel, { color: theme.text }]}>Email Address</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.text }]}
                  placeholder="e.g. singer@choir.org"
                  placeholderTextColor={theme.subtext}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.fieldLabel, { color: theme.text }]}>Password</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.text }]}
                  placeholder="••••••••"
                  placeholderTextColor={theme.subtext}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: theme.tint }]}
                onPress={authMode === 'signin' ? handleSignIn : handleSignUp}
                disabled={authLoading}>
                {authLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {authMode === 'signin' ? 'Sign In' : 'Create Account'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            /* STEP 2: ENSEMBLE SELECTION (Logged In) */
            <View style={styles.ensembleContainer}>
              {/* Profile summary */}
              <View style={[styles.profileStrip, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={[styles.avatar, { backgroundColor: theme.badgeBackground }]}>
                  <Ionicons name="person" size={16} color={theme.tint} />
                </View>
                <View style={styles.profileTextWrap}>
                  <Text style={[styles.profileName, { color: theme.text }]}>{currentUser.fullName}</Text>
                  <Text style={[styles.profileEmail, { color: theme.subtext }]}>{currentUser.email}</Text>
                </View>
                <TouchableOpacity onPress={signOutUser} style={styles.logoutBtn}>
                  <Ionicons name="log-out-outline" size={15} color={Colors.status.failed} />
                </TouchableOpacity>
              </View>

              {/* Active Repertoire shortcut */}
              {currentInstance && (
                <TouchableOpacity
                  style={[styles.activeGroupBar, { backgroundColor: theme.badgeBackground, borderColor: theme.tint }]}
                  onPress={() => router.replace('/(tabs)')}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.activeGroupLabel, { color: theme.badgeText }]}>CURRENT ENSEMBLE</Text>
                    <Text style={[styles.activeGroupName, { color: theme.text }]}>{currentInstance.name}</Text>
                    <Text style={[styles.activeGroupCode, { color: theme.tint }]}>Code: {currentInstance.code}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={18} color={theme.tint} />
                </TouchableOpacity>
              )}

              {/* Join or Create Card */}
              <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={[styles.segmentedBar, { backgroundColor: theme.surfaceSubtle }]}>
                  <TouchableOpacity
                    style={[
                      styles.segBtn,
                      ensembleMode === 'join' && [styles.segBtnActive, { backgroundColor: theme.card }],
                    ]}
                    onPress={() => {
                      setEnsembleMode('join');
                      setEnsembleError(null);
                    }}>
                    <Text
                      style={[
                        styles.segText,
                        { color: ensembleMode === 'join' ? theme.text : theme.subtext },
                        ensembleMode === 'join' && styles.segTextActive,
                      ]}>
                      Join with Code
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.segBtn,
                      ensembleMode === 'create' && [styles.segBtnActive, { backgroundColor: theme.card }],
                    ]}
                    onPress={() => {
                      setEnsembleMode('create');
                      setEnsembleError(null);
                    }}>
                    <Text
                      style={[
                        styles.segText,
                        { color: ensembleMode === 'create' ? theme.text : theme.subtext },
                        ensembleMode === 'create' && styles.segTextActive,
                      ]}>
                      Create Ensemble
                    </Text>
                  </TouchableOpacity>
                </View>

                {ensembleError && (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={16} color="#DC2626" />
                    <Text style={styles.errorText}>{ensembleError}</Text>
                  </View>
                )}

                {ensembleMode === 'join' ? (
                  <View style={styles.formGroup}>
                    <Text style={[styles.fieldLabel, { color: theme.text }]}>Ensemble Access Code</Text>
                    <TextInput
                      style={[
                        styles.input,
                        styles.codeInput,
                        { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.tint },
                      ]}
                      placeholder="e.g. CANTOR-4819"
                      placeholderTextColor={theme.subtext}
                      value={joinCode}
                      onChangeText={val => setJoinCode(val.toUpperCase())}
                      autoCapitalize="characters"
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      style={[styles.primaryBtn, { backgroundColor: theme.tint, marginTop: 14 }]}
                      onPress={handleJoinEnsemble}
                      disabled={ensembleLoading}>
                      {ensembleLoading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.primaryBtnText}>Join Repertoire</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ gap: 10 }}>
                    <View style={styles.formGroup}>
                      <Text style={[styles.fieldLabel, { color: theme.text }]}>Ensemble Name</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.text }]}
                        placeholder="e.g. St. Mark Choir"
                        placeholderTextColor={theme.subtext}
                        value={ensembleName}
                        onChangeText={setEnsembleName}
                      />
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={[styles.fieldLabel, { color: theme.text }]}>Director Name</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.text }]}
                        placeholder="e.g. Dr. Julian Vance"
                        placeholderTextColor={theme.subtext}
                        value={directorName}
                        onChangeText={setDirectorName}
                      />
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={[styles.fieldLabel, { color: theme.text }]}>Season / Occasion (Optional)</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.text }]}
                        placeholder="e.g. Lent & Easter 2026"
                        placeholderTextColor={theme.subtext}
                        value={seasonName}
                        onChangeText={setSeasonName}
                      />
                    </View>

                    <View style={styles.formGroup}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={[styles.fieldLabel, { color: theme.text }]}>Access Code (Optional)</Text>
                        <TouchableOpacity onPress={handleSuggestCode}>
                          <Text style={[styles.suggestLink, { color: theme.tint }]}>Suggest Code</Text>
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.tint, fontWeight: '700' }]}
                        placeholder="e.g. CHORAL-26"
                        placeholderTextColor={theme.subtext}
                        value={customCode}
                        onChangeText={val => setCustomCode(val.toUpperCase())}
                        autoCapitalize="characters"
                      />
                    </View>

                    <TouchableOpacity
                      style={[styles.primaryBtn, { backgroundColor: theme.tint, marginTop: 4 }]}
                      onPress={handleCreateEnsemble}
                      disabled={ensembleLoading}>
                      {ensembleLoading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.primaryBtnText}>Create Ensemble</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Android APK Link on Web */}
          {Platform.OS === 'web' && (
            <TouchableOpacity
              style={[styles.apkStrip, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}
              onPress={() => Linking.openURL('https://refertoire.github.io/apk/Refertoire.apk')}>
              <Ionicons name="logo-android" size={17} color="#22C55E" />
              <Text style={[styles.apkStripText, { color: theme.text }]}>Download Standalone Android APK</Text>
              <Ionicons name="arrow-forward" size={14} color={theme.subtext} />
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 12,
    marginBottom: 10,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  brandSub: {
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  segmentedBar: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 18,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 9,
  },
  segBtnActive: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
  segText: {
    fontSize: 13,
    fontWeight: '600',
  },
  segTextActive: {
    fontWeight: '700',
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    gap: 10,
    marginBottom: 14,
  },
  successText: {
    fontSize: 12,
    color: '#065F46',
    flex: 1,
    lineHeight: 18,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    gap: 10,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    color: '#B91C1C',
    flex: 1,
    lineHeight: 18,
  },
  formGroup: {
    gap: 6,
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  codeInput: {
    height: 52,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  suggestLink: {
    fontSize: 12,
    fontWeight: '600',
  },
  primaryBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  ensembleContainer: {
    gap: 14,
  },
  profileStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileTextWrap: {
    flex: 1,
  },
  profileName: {
    fontSize: 14,
    fontWeight: '700',
  },
  profileEmail: {
    fontSize: 12,
    marginTop: 1,
  },
  logoutBtn: {
    padding: 8,
  },
  activeGroupBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  activeGroupLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  activeGroupName: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  activeGroupCode: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 2,
  },
  apkStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
    gap: 12,
  },
  apkStripText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
});
