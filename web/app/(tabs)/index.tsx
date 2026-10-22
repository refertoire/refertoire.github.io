import React, { useState } from 'react';
import {
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useRepertoire } from '@/context/RepertoireContext';
import { ScoreItem, Voicing, LiturgicalSeason, PieceGenre } from '@/types/repertoire';
import { SORT_OPTIONS } from '@/utils/sorting';
import * as DocumentPicker from 'expo-document-picker';
import UploadScoreModal, { SelectedPdfFile } from '@/components/UploadScoreModal';
import NetworkStatusBar from '@/components/NetworkStatusBar';
import { NetworkService } from '@/services/networkService';
import { HybridSyncService } from '@/services/hybridSyncService';

const VOICING_FILTERS: Array<Voicing | 'ALL'> = ['ALL', 'SATB', 'SSAA', 'TTBB', 'SAB'];
const SEASON_FILTERS: Array<LiturgicalSeason | 'ALL'> = ['ALL', 'Lent', 'Holy Week', 'Christmas', 'Concert', 'General'];
const GENRE_FILTERS: Array<PieceGenre | 'ALL'> = ['ALL', 'Classical', 'Sacred', 'Contemporary', 'Folk', 'Pop'];

export default function RepertoireLibraryScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme];
  const {
    currentInstance,
    userRole,
    isLoading,
    isSyncing,
    syncProgress,
    filteredAndSortedScores,
    searchQuery,
    setSearchQuery,
    sortOption,
    setSortOption,
    voicingFilter,
    setVoicingFilter,
    seasonFilter,
    setSeasonFilter,
    genreFilter,
    setGenreFilter,
    favoritesOnly,
    setFavoritesOnly,
    isOfflineMode,
    toggleFavorite,
    deleteScore,
    uploadScore,
    reSyncAll,
    repertoireFolder,
    pickRepertoireFolder,
  } = useRepertoire();

  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [pendingUploadFile, setPendingUploadFile] = useState<SelectedPdfFile | null>(null);

  const hasActiveFilters =
    voicingFilter !== 'ALL' || seasonFilter !== 'ALL' || genreFilter !== 'ALL' || favoritesOnly;

  const handlePickScoreFile = async () => {
    if (isOfflineMode || !NetworkService.isOnline()) {
      Alert.alert(
        'Upload Unavailable',
        'Uploading scores requires an active network connection. Disable Offline Mode to upload.'
      );
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setPendingUploadFile({
          uri: asset.uri,
          name: asset.name,
          size: asset.size,
        });
      }
    } catch (err) {
      console.warn('Error opening file picker:', err);
    }
  };

  const handleDeleteScore = (score: ScoreItem) => {
    const confirmDelete = async () => {
      const res = await deleteScore(score.id);
      if (!res.success) {
        Alert.alert('Delete Error', res.error || 'Failed to delete score.');
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`Remove "${score.title}" from this ensemble?`)) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        'Remove Score',
        `Remove "${score.title}" from the ensemble repertoire?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: confirmDelete },
        ]
      );
    }
  };

  if (!isLoading && !currentInstance) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <View style={styles.responsiveContainer}>
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: theme.surfaceSubtle }]}>
              <Ionicons name="musical-notes-outline" size={44} color={theme.tint} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No Choir Connected</Text>
            <Text style={[styles.emptyText, { color: theme.subtext }]}>
              Enter your ensemble access code to sync repertoire and sheet music offline.
            </Text>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.tint }]}
              onPress={() => router.push('/login')}>
              <Ionicons name="key-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryButtonText}>Join with Access Code</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const renderScoreItem = ({ item }: { item: ScoreItem }) => {
    const voicingColors = Colors.voicings[item.voicing] || {
      bg: theme.surfaceSubtle,
      text: theme.text,
      darkBg: theme.surfaceSubtle,
      darkText: theme.text,
    };
    const voicingBg = colorScheme === 'dark' ? voicingColors.darkBg : voicingColors.bg;
    const voicingTextColor = colorScheme === 'dark' ? voicingColors.darkText : voicingColors.text;

    return (
      <TouchableOpacity
        style={[
          styles.scoreItem,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
        onPress={() => router.push({ pathname: '/score/[id]', params: { id: item.id } })}
        activeOpacity={0.72}>
        <View style={styles.scoreItemMain}>
          {/* Metadata pill row */}
          <View style={styles.metaRow}>
            <View style={styles.badgesGroup}>
              <View style={[styles.voicingBadge, { backgroundColor: voicingBg }]}>
                <Text style={[styles.voicingText, { color: voicingTextColor }]}>
                  {item.voicing}
                </Text>
              </View>
              {item.season && item.season !== 'General' && (
                <View style={[styles.seasonBadge, { backgroundColor: theme.surfaceSubtle }]}>
                  <Text style={[styles.seasonText, { color: theme.subtext }]}>{item.season}</Text>
                </View>
              )}
              {item.genre && (
                <Text style={[styles.genreLabel, { color: theme.subtext }]}>{item.genre}</Text>
              )}
            </View>

            <View style={styles.statusGroup}>
              {item.downloadStatus === 'completed' ? (
                <View style={styles.offlineIndicator}>
                  <Ionicons name="checkmark-circle" size={13} color={Colors.status.completed} />
                  <Text style={styles.offlineText}>Offline</Text>
                </View>
              ) : item.downloadStatus === 'downloading' ? (
                <ActivityIndicator size="small" color={theme.tint} />
              ) : (
                <Ionicons name="cloud-outline" size={15} color={theme.subtext} />
              )}
            </View>
          </View>

          {/* Title & Composer */}
          <Text style={[styles.scoreTitle, { color: theme.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={[styles.scoreComposer, { color: theme.subtext }]} numberOfLines={1}>
            {item.composer}
            {item.arranger ? ` • arr. ${item.arranger}` : ''}
          </Text>

          {/* Bottom details */}
          <View style={styles.footerRow}>
            <View style={styles.footerDetail}>
              <Ionicons name="document-text-outline" size={12} color={theme.subtext} />
              <Text style={[styles.footerText, { color: theme.subtext }]}>
                {item.pageCount} {item.pageCount === 1 ? 'page' : 'pages'}
              </Text>
            </View>

            {item.keySignature && (
              <View style={styles.footerDetail}>
                <Ionicons name="musical-note-outline" size={12} color={theme.subtext} />
                <Text style={[styles.footerText, { color: theme.subtext }]}>
                  {item.keySignature}
                </Text>
              </View>
            )}

            {item.tempo && (
              <View style={styles.footerDetail}>
                <Ionicons name="speedometer-outline" size={12} color={theme.subtext} />
                <Text style={[styles.footerText, { color: theme.subtext }]}>
                  {item.tempo}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Action icons column */}
        <View style={styles.itemActions}>
          <TouchableOpacity
            onPress={() => toggleFavorite(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.actionBtn}
            accessibilityLabel={item.isFavorite ? 'Remove favorite' : 'Add favorite'}>
            <Ionicons
              name={item.isFavorite ? 'star' : 'star-outline'}
              size={20}
              color={item.isFavorite ? '#F59E0B' : theme.subtext}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => HybridSyncService.openInSheetMusicApp(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.actionBtn}
            accessibilityLabel={`Open or share ${item.title} in sheet music app`}>
            <Ionicons name="share-outline" size={17} color={theme.subtext} />
          </TouchableOpacity>

          {userRole === 'admin' && (
            <TouchableOpacity
              onPress={() => handleDeleteScore(item)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[styles.actionBtn, styles.deleteBtn]}
              accessibilityLabel={`Delete score ${item.title}`}>
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={styles.responsiveContainer}>
        {/* Compact Ensemble Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Image
            source={require('@/assets/images/refertoire-logo.png')}
            style={styles.logoImg}
            resizeMode="contain"
          />
          <View style={styles.headerInfo}>
            <View style={styles.titleRow}>
              <Text style={[styles.choirName, { color: theme.text }]} numberOfLines={1}>
                {currentInstance?.name || 'Refertoire'}
              </Text>
              <View
                style={[
                  styles.roleBadge,
                  { backgroundColor: userRole === 'admin' ? theme.badgeBackground : theme.surfaceSubtle },
                ]}>
                <Text
                  style={[
                    styles.roleBadgeText,
                    { color: userRole === 'admin' ? theme.badgeText : theme.subtext },
                  ]}>
                  {userRole === 'admin' ? 'Admin' : 'Member'}
                </Text>
              </View>
            </View>
            <View style={styles.choirMetaRow}>
              <Text style={[styles.choirMeta, { color: theme.subtext }]} numberOfLines={1}>
                {currentInstance?.scores.length ?? 0} {currentInstance?.scores.length === 1 ? 'score' : 'scores'}
              </Text>
              <Text style={[styles.metaDivider, { color: theme.border }]}>•</Text>
              <Text style={[styles.codeLabel, { color: theme.subtext }]}>Code:</Text>
              <Text style={[styles.codeText, { color: theme.tint }]}>
                {currentInstance?.code || '------'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.syncButton, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}
            onPress={() => reSyncAll()}
            disabled={isSyncing}>
            {isSyncing ? (
              <>
                <ActivityIndicator size="small" color={theme.tint} style={{ marginRight: 5 }} />
                <Text style={[styles.syncText, { color: theme.tint }]}>
                  {syncProgress ? `${syncProgress.completedFiles}/${syncProgress.totalFiles}` : 'Syncing'}
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={15} color={Colors.status.completed} style={{ marginRight: 4 }} />
                <Text style={[styles.syncText, { color: Colors.status.completed }]}>Synced</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <NetworkStatusBar />

        {/* Repertoire Storage Folder Setup Banner */}
        {!repertoireFolder.uri && (
          <View style={[styles.folderBanner, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
            <View style={styles.folderBannerLeft}>
              <View style={[styles.folderIconWrap, { backgroundColor: theme.badgeBackground }]}>
                <Ionicons name="folder-open" size={17} color={theme.tint} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.folderBannerTitle, { color: theme.text }]}>
                  Pick your repertoire storage folder
                </Text>
                <Text style={[styles.folderBannerSub, { color: theme.subtext }]}>
                  Choose where Refertoire saves, references, and syncs your scores.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.folderBannerBtn, { backgroundColor: theme.tint }]}
              onPress={pickRepertoireFolder}>
              <Text style={styles.folderBannerBtnText}>Pick Folder</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Search & Filter Bar */}
        <View style={styles.searchBarRow}>
          <View
            style={[
              styles.searchBar,
              { backgroundColor: theme.surfaceSubtle, borderColor: theme.border },
            ]}>
            <Ionicons name="search" size={17} color={theme.subtext} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search title, composer, tags..."
              placeholderTextColor={theme.subtext}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={theme.subtext} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.filterToggleBtn,
              {
                backgroundColor: hasActiveFilters || showFilterDrawer ? theme.badgeBackground : theme.surfaceSubtle,
                borderColor: hasActiveFilters ? theme.tint : theme.border,
              },
            ]}
            onPress={() => setShowFilterDrawer(!showFilterDrawer)}>
            <Ionicons
              name="options-outline"
              size={18}
              color={hasActiveFilters || showFilterDrawer ? theme.tint : theme.subtext}
            />
            {hasActiveFilters && <View style={[styles.filterActiveDot, { backgroundColor: theme.tint }]} />}
          </TouchableOpacity>
        </View>

        {/* Collapsible Filter & Sort Drawer */}
        {showFilterDrawer && (
          <View style={[styles.filterDrawer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            {/* Voicing Pills */}
            <View style={styles.filterGroup}>
              <Text style={[styles.filterHeading, { color: theme.subtext }]}>VOICING</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                {VOICING_FILTERS.map(v => {
                  const isSel = voicingFilter === v;
                  return (
                    <TouchableOpacity
                      key={v}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isSel ? theme.tint : theme.surfaceSubtle,
                          borderColor: isSel ? theme.tint : theme.border,
                        },
                      ]}
                      onPress={() => setVoicingFilter(v)}>
                      <Text style={[styles.chipText, { color: isSel ? '#FFFFFF' : theme.text }]}>
                        {v}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Season Pills */}
            <View style={styles.filterGroup}>
              <Text style={[styles.filterHeading, { color: theme.subtext }]}>SEASON</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                {SEASON_FILTERS.map(s => {
                  const isSel = seasonFilter === s;
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isSel ? theme.tint : theme.surfaceSubtle,
                          borderColor: isSel ? theme.tint : theme.border,
                        },
                      ]}
                      onPress={() => setSeasonFilter(s)}>
                      <Text style={[styles.chipText, { color: isSel ? '#FFFFFF' : theme.text }]}>
                        {s}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Sort & Favorites Action Row */}
            <View style={styles.filterActionsRow}>
              <TouchableOpacity
                style={[
                  styles.chip,
                  {
                    backgroundColor: favoritesOnly ? theme.tint : theme.surfaceSubtle,
                    borderColor: favoritesOnly ? theme.tint : theme.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                  },
                ]}
                onPress={() => setFavoritesOnly(!favoritesOnly)}>
                <Ionicons
                  name={favoritesOnly ? 'star' : 'star-outline'}
                  size={14}
                  color={favoritesOnly ? '#FFFFFF' : theme.text}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.chipText, { color: favoritesOnly ? '#FFFFFF' : theme.text }]}>
                  Favorites
                </Text>
              </TouchableOpacity>

              {hasActiveFilters && (
                <TouchableOpacity
                  onPress={() => {
                    setVoicingFilter('ALL');
                    setSeasonFilter('ALL');
                    setGenreFilter('ALL');
                    setFavoritesOnly(false);
                  }}>
                  <Text style={[styles.resetText, { color: theme.tint }]}>Reset Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Quick Sort Bar */}
        <View style={styles.sortBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortContent}>
            <Text style={[styles.sortLabel, { color: theme.subtext }]}>Sort:</Text>
            {SORT_OPTIONS.map(opt => {
              const isSel = sortOption.field === opt.field;
              return (
                <TouchableOpacity
                  key={opt.field}
                  style={[
                    styles.sortPill,
                    {
                      backgroundColor: isSel ? theme.badgeBackground : theme.surfaceSubtle,
                      borderColor: isSel ? theme.tint : 'transparent',
                    },
                  ]}
                  onPress={() => setSortOption(opt)}>
                  <Text
                    style={[
                      styles.sortPillText,
                      { color: isSel ? theme.tint : theme.subtext, fontWeight: isSel ? '700' : '500' },
                    ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Scores List */}
        <FlatList
          data={filteredAndSortedScores}
          keyExtractor={item => item.id}
          renderItem={renderScoreItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <Ionicons name="musical-notes-outline" size={40} color={theme.subtext} />
              <Text style={[styles.emptyListTitle, { color: theme.text }]}>
                {currentInstance?.scores.length === 0 ? 'No Scores Added' : 'No Matching Scores'}
              </Text>
              <Text style={[styles.emptyListSub, { color: theme.subtext }]}>
                {currentInstance?.scores.length === 0
                  ? userRole === 'admin'
                    ? 'Upload the first score PDF to start syncing.'
                    : 'The director has not uploaded scores yet.'
                  : 'Try adjusting your search query or filters.'}
              </Text>

              {userRole === 'admin' && currentInstance?.scores.length === 0 && (
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: theme.tint, marginTop: 14 }]}
                  onPress={handlePickScoreFile}>
                  <Ionicons name="cloud-upload-outline" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.primaryButtonText}>Upload PDF</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />

        {/* Admin Upload FAB */}
        {userRole === 'admin' && (
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: theme.tint }]}
            onPress={handlePickScoreFile}
            activeOpacity={0.85}>
            <Ionicons name="add" size={22} color="#FFFFFF" />
            <Text style={styles.fabText}>Upload PDF</Text>
          </TouchableOpacity>
        )}

        <UploadScoreModal
          file={pendingUploadFile}
          onClose={() => setPendingUploadFile(null)}
          onUpload={uploadScore}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  responsiveContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  logoImg: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  headerInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  choirName: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  choirMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  choirMeta: {
    fontSize: 12,
  },
  metaDivider: {
    fontSize: 10,
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  codeText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.5,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  syncText: {
    fontSize: 12,
    fontWeight: '600',
  },
  searchBarRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: 44,
  },
  filterToggleBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterActiveDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  filterDrawer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  filterGroup: {
    gap: 6,
  },
  filterHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  chipsRow: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  resetText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sortBar: {
    paddingVertical: 8,
  },
  sortContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  sortLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 2,
  },
  sortPill: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  sortPillText: {
    fontSize: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 96,
    gap: 12,
  },
  scoreItem: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  scoreItemMain: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  badgesGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voicingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  voicingText: {
    fontSize: 11,
    fontWeight: '700',
  },
  seasonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  seasonText: {
    fontSize: 11,
    fontWeight: '500',
  },
  genreLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  offlineText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.status.completed,
  },
  scoreTitle: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  scoreComposer: {
    fontSize: 13,
    marginBottom: 8,
    opacity: 0.85,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  footerDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '500',
  },
  itemActions: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingLeft: 4,
  },
  actionBtn: {
    padding: 8,
    borderRadius: 8,
  },
  deleteBtn: {
    backgroundColor: '#EF444415',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
    marginBottom: 20,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyList: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyListTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
  },
  emptyListSub: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
    elevation: 6,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    gap: 6,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  folderBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  folderBannerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  folderIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  folderBannerSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  folderBannerBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderBannerBtnText: {
    color: '#0D0E12',
    fontSize: 13,
    fontWeight: '700',
  },
});
