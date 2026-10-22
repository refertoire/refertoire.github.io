import React from 'react';
import { Platform, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useRepertoire } from '@/context/RepertoireContext';

export default function InfoModalScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme];
  const { currentInstance } = useRepertoire();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Branding */}
        <View style={styles.headerBlock}>
          <Image
            source={require('@/assets/images/refertoire-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.title, { color: theme.text }]}>Refertoire Guide</Text>
          <Text style={[styles.subtitle, { color: theme.subtext }]}>
            Ensemble Repertoire & Sheet Music Sync Engine
          </Text>
        </View>

        {/* Active Ensemble Summary */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="people-outline" size={16} color={theme.tint} />
            <Text style={[styles.cardHeading, { color: theme.subtext }]}>Active Ensemble</Text>
          </View>
          {currentInstance ? (
            <View style={styles.detailList}>
              <Text style={[styles.ensembleName, { color: theme.text }]}>
                {currentInstance.name}
              </Text>
              
              <View style={[styles.codeBadge, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
                <Ionicons name="key-outline" size={13} color={theme.tint} />
                <Text style={[styles.codeText, { color: theme.tint }]}>
                  {currentInstance.code}
                </Text>
              </View>

              <View style={styles.metaRow}>
                <Ionicons name="person-outline" size={13} color={theme.subtext} />
                <Text style={[styles.detailText, { color: theme.subtext }]}>
                  Director: {currentInstance.director}
                </Text>
              </View>

              <View style={styles.metaRow}>
                <Ionicons name="library-outline" size={13} color={theme.subtext} />
                <Text style={[styles.detailText, { color: theme.subtext }]}>
                  Library: {currentInstance.scores.length} scores synced
                </Text>
              </View>
            </View>
          ) : (
            <Text style={[styles.detailText, { color: theme.subtext }]}>
              No ensemble connected. Enter your choir access code in settings to sync scores.
            </Text>
          )}
        </View>

        {/* How It Works List */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="information-circle-outline" size={16} color={theme.tint} />
            <Text style={[styles.cardHeading, { color: theme.subtext }]}>Quick Overview</Text>
          </View>

          <View style={styles.stepItem}>
            <View style={[styles.stepBadge, { backgroundColor: theme.surfaceSubtle }]}>
              <Ionicons name="key-outline" size={16} color={theme.tint} />
            </View>
            <View style={styles.stepTextContainer}>
              <Text style={[styles.stepTitle, { color: theme.text }]}>Pair with Code</Text>
              <Text style={[styles.stepDesc, { color: theme.subtext }]}>
                Enter your choir's 8-character access code to pair and join.
              </Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View style={[styles.stepBadge, { backgroundColor: theme.surfaceSubtle }]}>
              <Ionicons name="cloud-download-outline" size={16} color={theme.tint} />
            </View>
            <View style={styles.stepTextContainer}>
              <Text style={[styles.stepTitle, { color: theme.text }]}>Offline Sync</Text>
              <Text style={[styles.stepDesc, { color: theme.subtext }]}>
                All scores automatically cache to local storage for rehearsal or performance.
              </Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View style={[styles.stepBadge, { backgroundColor: theme.surfaceSubtle }]}>
              <Ionicons name="musical-notes-outline" size={16} color={theme.tint} />
            </View>
            <View style={styles.stepTextContainer}>
              <Text style={[styles.stepTitle, { color: theme.text }]}>Stage & Study Mode</Text>
              <Text style={[styles.stepDesc, { color: theme.subtext }]}>
                Read scores with Stage Mode, foot pedal navigation, and instant page flips.
              </Text>
            </View>
          </View>
        </View>

        {/* Done / Dismiss Button */}
        <TouchableOpacity
          style={[styles.doneBtn, { backgroundColor: theme.tint }]}
          activeOpacity={0.85}
          onPress={() => router.back()}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </ScrollView>

      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    alignItems: 'center',
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  headerBlock: {
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 14,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  card: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  cardHeading: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  detailList: {
    gap: 8,
    backgroundColor: 'transparent',
  },
  ensembleName: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  codeBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    marginVertical: 2,
  },
  codeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', web: 'monospace' }),
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'transparent',
  },
  detailText: {
    fontSize: 13,
    lineHeight: 18,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  stepTextContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  doneBtn: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#C49746',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  doneBtnText: {
    color: '#0D0E12',
    fontSize: 15,
    fontWeight: '700',
  },
});
