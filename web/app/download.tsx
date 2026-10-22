import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function DownloadScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme];
  const apkUrl = 'https://refertoire.github.io/apk/Refertoire.apk';

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.href = apkUrl;
    } else {
      Linking.openURL(apkUrl);
    }
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={[styles.iconWrap, { backgroundColor: theme.surfaceSubtle }]}>
          <Ionicons name="cloud-download-outline" size={32} color={theme.tint} />
        </View>

        <Text style={[styles.title, { color: theme.text }]}>Downloading Refertoire</Text>
        <Text style={[styles.sub, { color: theme.subtext }]}>
          Your standalone Android APK package download should begin automatically. If it doesn't start, tap the button below.
        </Text>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: theme.tint }]}
          activeOpacity={0.85}
          onPress={() => {
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
              window.location.href = apkUrl;
            } else {
              Linking.openURL(apkUrl);
            }
          }}>
          <Ionicons name="download-outline" size={18} color="#0D0E12" style={{ marginRight: 8 }} />
          <Text style={styles.btnText}>Download Standalone APK</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    maxWidth: 400,
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 8,
    textAlign: 'center',
  },
  sub: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '100%',
    shadowColor: '#C49746',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  btnText: {
    color: '#0D0E12',
    fontWeight: '700',
    fontSize: 15,
  },
});
