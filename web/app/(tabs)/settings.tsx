import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Share,
  Platform,
  Switch,
  Image,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useRepertoire } from '@/context/RepertoireContext';
import { DownloadService } from '@/services/downloadService';
import { NetworkService } from '@/services/networkService';
import { UpdateService } from '@/services/updateService';
import { HybridSyncService, HierarchyMode, SyncProgressUpdate } from '@/services/hybridSyncService';
import * as DocumentPicker from 'expo-document-picker';
import UploadScoreModal, { SelectedPdfFile } from '@/components/UploadScoreModal';
import EnsembleMembersModal from '@/components/EnsembleMembersModal';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme];
  const {
    currentUser,
    currentInstance,
    userRole,
    ensembleMembers,
    scores,
    isSyncing,
    isOfflineMode,
    setOfflineMode,
    reSyncAll,
    clearOfflineCache,
    signOut,
    signOutUser,
    uploadScore,
  } = useRepertoire();

  const [showMembersModal, setShowMembersModal] = useState(false);
  const [resyncing, setResyncing] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateCheckStatus, setUpdateCheckStatus] = useState<string | null>(null);
  const [pendingUploadFile, setPendingUploadFile] = useState<SelectedPdfFile | null>(null);

  // Hybrid Sync Agent State
  const isFsaSupported = HybridSyncService.isFileSystemAccessSupported();
  const isIOS = HybridSyncService.isIOS();
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [linkedFolderName, setLinkedFolderName] = useState<string | null>(null);
  const [hierarchyMode, setHierarchyMode] = useState<HierarchyMode>('by_program');
  const [isSyncingDisk, setIsSyncingDisk] = useState(false);
  const [syncDiskProgress, setSyncDiskProgress] = useState<SyncProgressUpdate | null>(null);
  const [showTreePreview, setShowTreePreview] = useState(false);

  // Restore stored directory handle on desktop
  useEffect(() => {
    async function loadStoredHandle() {
      if (isFsaSupported) {
        const handle = await HybridSyncService.getStoredDirectoryHandle();
        if (handle) {
          setDirectoryHandle(handle);
          setLinkedFolderName(handle.name);
        }
      }
    }
    loadStoredHandle();
  }, [isFsaSupported]);

  // Build live directory tree preview
  const previewTree = useMemo(() => {
    if (!currentInstance) return [];
    return HybridSyncService.buildSyncTree(currentInstance, hierarchyMode);
  }, [currentInstance, hierarchyMode]);

  // Pick local folder (Desktop)
  const handlePickFolder = async () => {
    try {
      const handle = await HybridSyncService.pickDirectory();
      if (handle) {
        setDirectoryHandle(handle);
        setLinkedFolderName(handle.name);
        // Automatically run initial sync to populate the folder
        if (currentInstance) {
          setIsSyncingDisk(true);
          await HybridSyncService.syncToLocalDisk(
            handle,
            currentInstance,
            hierarchyMode,
            setSyncDiskProgress
          );
          setIsSyncingDisk(false);
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        Alert.alert('Folder Selection Notice', e.message || 'Could not access the selected directory.');
      }
    }
  };

  // Unlink folder
  const handleUnlinkFolder = async () => {
    await HybridSyncService.removeDirectoryHandle();
    setDirectoryHandle(null);
    setLinkedFolderName(null);
  };

  // Sync to local disk (Desktop)
  const handleSyncToDisk = async () => {
    if (!directoryHandle || !currentInstance) return;
    setIsSyncingDisk(true);
    try {
      const result = await HybridSyncService.syncToLocalDisk(
        directoryHandle,
        currentInstance,
        hierarchyMode,
        setSyncDiskProgress
      );
      Alert.alert(
        'Sync Complete',
        `Synchronized ${result.syncedCount} score files to ${linkedFolderName}/.`
      );
    } catch (e: any) {
      Alert.alert('Sync Error', e.message || 'Failed to sync to local directory.');
    } finally {
      setIsSyncingDisk(false);
    }
  };

  // Export ZIP archive (iOS Files / universal fallback)
  const handleExportZip = async () => {
    if (!currentInstance) return;
    setIsSyncingDisk(true);
    try {
      const zipBlob = await HybridSyncService.exportZipArchive(
        currentInstance,
        hierarchyMode,
        setSyncDiskProgress
      );
      const filename = `${currentInstance.name.replace(/\s+/g, '-')}-Scores.zip`;
      await HybridSyncService.shareOrDownloadFile(
        zipBlob,
        filename,
        `${currentInstance.name} Repertoire Files`
      );
    } catch (e: any) {
      Alert.alert('Export Notice', e.message || 'Could not generate archive package.');
    } finally {
      setIsSyncingDisk(false);
    }
  };

  const handleCheckForUpdates = async () => {
    if (isCheckingUpdate) return;
    setIsCheckingUpdate(true);
    setUpdateCheckStatus('Checking...');

    try {
      const result = await UpdateService.checkForUpdates(true);
      if (result.available && result.release) {
        setUpdateCheckStatus(`v${result.release.version} available`);
        UpdateService.simulateUpdate(result.release);
      } else {
        setUpdateCheckStatus('Up to date');
        Alert.alert(
          'Up to Date',
          `Refertoire v${result.currentVersion} (Build ${result.currentBuildNumber}) is the latest version.`
        );
      }
    } catch {
      setUpdateCheckStatus('Check failed');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const downloadedCount = scores.filter(s => s.downloadStatus === 'completed').length;
  const totalScores = scores.length;
  const diskBytes = currentInstance ? DownloadService.getInstanceDiskUsage(currentInstance.code) : 0;
  const diskSizeMB = (diskBytes / (1024 * 1024)).toFixed(2);

  const handleResync = async () => {
    setResyncing(true);
    await reSyncAll();
    setResyncing(false);
  };

  const handleShareCode = async () => {
    if (!currentInstance) return;
    try {
      await Share.share({
        title: `Join ${currentInstance.name} on Refertoire`,
        message: `Join our repertoire on Refertoire! Use Ensemble Access Code: ${currentInstance.code}`,
      });
    } catch {}
  };

  const handleClearCache = async () => {
    setIsClearingCache(true);
    try {
      await clearOfflineCache();
    } catch (err) {
      console.warn('Clear cache error:', err);
    } finally {
      setIsClearingCache(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      router.push('/login');
    } catch (err) {
      console.warn('Sign out error:', err);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={styles.responsiveContainer}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Text style={[styles.screenTitle, { color: theme.text }]}>Settings & Ensemble</Text>
          <Text style={[styles.screenSub, { color: theme.subtext }]}>
            Offline storage, ensemble codes, and sync settings
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Active Ensemble Section */}
          <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.sectionCardHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="musical-notes" size={17} color={theme.tint} />
                <Text style={[styles.sectionCardTitle, { color: theme.text }]}>Active Ensemble</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/login')}>
                <Text style={[styles.headerLink, { color: theme.tint }]}>Switch Group</Text>
              </TouchableOpacity>
            </View>

            {currentInstance ? (
              <View style={styles.sectionBody}>
                <View style={styles.ensembleTitleRow}>
                  <Text style={[styles.ensembleName, { color: theme.text }]} numberOfLines={1}>
                    {currentInstance.name}
                  </Text>
                  <View
                    style={[
                      styles.rolePill,
                      { backgroundColor: userRole === 'admin' ? theme.badgeBackground : theme.surfaceSubtle },
                    ]}>
                    <Text
                      style={[
                        styles.rolePillText,
                        { color: userRole === 'admin' ? theme.badgeText : theme.subtext },
                      ]}>
                      {userRole === 'admin' ? 'Director' : 'Singer'}
                    </Text>
                  </View>
                </View>

                {currentInstance.director && (
                  <Text style={[styles.ensembleMeta, { color: theme.subtext }]}>
                    Director: {currentInstance.director}
                    {currentInstance.seasonName ? ` • ${currentInstance.seasonName}` : ''}
                  </Text>
                )}

                {/* Access Code Box */}
                <View style={[styles.codeRow, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
                  <View>
                    <Text style={[styles.codeLabel, { color: theme.subtext }]}>ACCESS CODE</Text>
                    <Text style={[styles.codeValue, { color: theme.tint }]}>{currentInstance.code}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.shareBtn, { backgroundColor: theme.tint }]}
                    onPress={handleShareCode}>
                    <Ionicons name="share-social-outline" size={14} color="#FFFFFF" style={{ marginRight: 5 }} />
                    <Text style={styles.shareBtnText}>Share Code</Text>
                  </TouchableOpacity>
                </View>

                {/* Members list link */}
                <TouchableOpacity
                  style={[styles.actionRowBtn, { borderTopColor: theme.border }]}
                  onPress={() => setShowMembersModal(true)}>
                  <View style={styles.actionRowLeft}>
                    <Ionicons name="people-outline" size={18} color={theme.text} />
                    <Text style={[styles.actionRowLabel, { color: theme.text }]}>Ensemble Members</Text>
                  </View>
                  <View style={styles.actionRowRight}>
                    <View style={[styles.countBadge, { backgroundColor: theme.surfaceSubtle }]}>
                      <Text style={[styles.countText, { color: theme.subtext }]}>{ensembleMembers.length}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.subtext} />
                  </View>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.connectPrompt}
                onPress={() => router.push('/login')}>
                <Text style={[styles.connectPromptText, { color: theme.tint }]}>
                  Connect with Choir Code →
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Local Directory Sync Agent (Desktop FSA & iOS Vault) */}
          <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.sectionCardHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons
                  name={isFsaSupported ? 'folder-open' : 'cloud-download-outline'}
                  size={18}
                  color={theme.tint}
                />
                <Text style={[styles.sectionCardTitle, { color: theme.text }]}>
                  {isFsaSupported ? 'Local Directory Sync Agent' : 'Repertoire File Manager & Vault'}
                </Text>
              </View>
              <View
                style={[
                  styles.syncStatusPill,
                  {
                    backgroundColor: linkedFolderName
                      ? 'rgba(16, 185, 129, 0.12)'
                      : theme.surfaceSubtle,
                  },
                ]}>
                <View
                  style={[
                    styles.syncDot,
                    {
                      backgroundColor: linkedFolderName
                        ? '#10B981'
                        : theme.subtext,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.syncStatusText,
                    {
                      color: linkedFolderName ? '#10B981' : theme.subtext,
                    },
                  ]}>
                  {linkedFolderName ? 'Disk Mirror Linked' : isIOS ? 'iOS Vault Active' : 'Ready to Link'}
                </Text>
              </View>
            </View>

            <View style={styles.sectionBody}>
              {/* Desktop Direct Disk Flow */}
              {isFsaSupported ? (
                <>
                  {linkedFolderName ? (
                    <View style={[styles.linkedFolderBox, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
                      <View style={styles.linkedFolderInfo}>
                        <Ionicons name="folder" size={24} color={theme.tint} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.linkedFolderLabel, { color: theme.subtext }]}>
                            TARGET LOCAL DIRECTORY
                          </Text>
                          <Text style={[styles.linkedFolderPath, { color: theme.text }]} numberOfLines={1}>
                            {linkedFolderName}/
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.unlinkBtn}
                        onPress={handleUnlinkFolder}
                        disabled={isSyncingDisk}>
                        <Ionicons name="close-circle-outline" size={16} color={theme.subtext} />
                        <Text style={[styles.unlinkText, { color: theme.subtext }]}>Change</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={[styles.unlinkedPromptBox, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
                      <View style={styles.unlinkedPromptLeft}>
                        <Ionicons name="folder-outline" size={24} color={theme.tint} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.promptTitle, { color: theme.text }]}>
                            No local choir directory linked
                          </Text>
                          <Text style={[styles.promptSub, { color: theme.subtext }]}>
                            Select a folder on your computer, iCloud, or Dropbox to mirror repertoire and folders.
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={[styles.primaryActionBtn, { backgroundColor: theme.tint }]}
                        onPress={handlePickFolder}
                        disabled={isSyncingDisk}>
                        <Ionicons name="folder-open-outline" size={16} color="#0D0E12" style={{ marginRight: 6 }} />
                        <Text style={styles.primaryActionBtnText}>Link Local Folder</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Hierarchy Mode Selector */}
                  <View style={styles.hierarchyModeContainer}>
                    <Text style={[styles.settingLabel, { color: theme.subtext }]}>
                      FOLDER HIERARCHY STRUCTURE
                    </Text>
                    <View style={[styles.modeSegmentedBar, { backgroundColor: theme.surfaceSubtle }]}>
                      {(['by_program', 'by_voicing', 'by_season'] as HierarchyMode[]).map((mode) => (
                        <TouchableOpacity
                          key={mode}
                          style={[
                            styles.modeSegmentBtn,
                            hierarchyMode === mode && {
                              backgroundColor: theme.card,
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: 1 },
                              shadowOpacity: 0.1,
                              shadowRadius: 2,
                            },
                          ]}
                          onPress={() => setHierarchyMode(mode)}>
                          <Text
                            style={[
                              styles.modeSegmentText,
                              {
                                color: hierarchyMode === mode ? theme.text : theme.subtext,
                                fontWeight: hierarchyMode === mode ? '700' : '500',
                              },
                            ]}>
                            {mode === 'by_program'
                              ? 'By Program'
                              : mode === 'by_voicing'
                              ? 'By Voicing'
                              : 'By Season'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Desktop Sync Action & Progress */}
                  {linkedFolderName && (
                    <View style={styles.syncActionArea}>
                      {isSyncingDisk && syncDiskProgress && (
                        <View style={styles.progressContainer}>
                          <View style={styles.progressHeaderRow}>
                            <Text style={[styles.progressCurrentFile, { color: theme.text }]} numberOfLines={1}>
                              {syncDiskProgress.currentFile}
                            </Text>
                            <Text style={[styles.progressRatio, { color: theme.tint }]}>
                              {syncDiskProgress.current} / {syncDiskProgress.total}
                            </Text>
                          </View>
                          <View style={[styles.storageBarBg, { backgroundColor: theme.surfaceSubtle }]}>
                            <View
                              style={[
                                styles.storageBarFill,
                                {
                                  backgroundColor: theme.tint,
                                  width: `${(syncDiskProgress.current / syncDiskProgress.total) * 100}%`,
                                },
                              ]}
                            />
                          </View>
                        </View>
                      )}

                      <TouchableOpacity
                        style={[styles.primaryActionBtn, { backgroundColor: theme.tint }]}
                        onPress={handleSyncToDisk}
                        disabled={isSyncingDisk}>
                        {isSyncingDisk ? (
                          <ActivityIndicator size="small" color="#0D0E12" />
                        ) : (
                          <>
                            <Ionicons name="sync" size={17} color="#0D0E12" style={{ marginRight: 6 }} />
                            <Text style={styles.primaryActionBtnText}>Sync to Local Disk Now</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              ) : (
                /* iOS / iPadOS Files Vault Flow */
                <>
                  <View style={[styles.iosNoticeBox, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
                    <Ionicons name="phone-portrait-outline" size={24} color={theme.tint} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.promptTitle, { color: theme.text }]}>
                        iOS Repertoire Vault
                      </Text>
                      <Text style={[styles.promptSub, { color: theme.subtext }]}>
                        Export your choir's complete folder tree directly into the iPad Files app, or share pieces to forScore & PiaScore.
                      </Text>
                    </View>
                  </View>

                  {/* Hierarchy Mode Selector for Export */}
                  <View style={styles.hierarchyModeContainer}>
                    <Text style={[styles.settingLabel, { color: theme.subtext }]}>
                      FOLDER HIERARCHY STRUCTURE
                    </Text>
                    <View style={[styles.modeSegmentedBar, { backgroundColor: theme.surfaceSubtle }]}>
                      {(['by_program', 'by_voicing', 'by_season'] as HierarchyMode[]).map((mode) => (
                        <TouchableOpacity
                          key={mode}
                          style={[
                            styles.modeSegmentBtn,
                            hierarchyMode === mode && {
                              backgroundColor: theme.card,
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: 1 },
                              shadowOpacity: 0.1,
                              shadowRadius: 2,
                            },
                          ]}
                          onPress={() => setHierarchyMode(mode)}>
                          <Text
                            style={[
                              styles.modeSegmentText,
                              {
                                color: hierarchyMode === mode ? theme.text : theme.subtext,
                                fontWeight: hierarchyMode === mode ? '700' : '500',
                              },
                            ]}>
                            {mode === 'by_program'
                              ? 'By Program'
                              : mode === 'by_voicing'
                              ? 'By Voicing'
                              : 'By Season'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* iOS Export Action */}
                  <TouchableOpacity
                    style={[styles.primaryActionBtn, { backgroundColor: theme.tint }]}
                    onPress={handleExportZip}
                    disabled={isSyncingDisk}>
                    {isSyncingDisk ? (
                      <ActivityIndicator size="small" color="#0D0E12" />
                    ) : (
                      <>
                        <Ionicons name="share-outline" size={17} color="#0D0E12" style={{ marginRight: 6 }} />
                        <Text style={styles.primaryActionBtnText}>
                          Export Folder Hierarchy to Files (.zip)
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}

              {/* Folder Tree Preview Toggle */}
              {currentInstance && (
                <View style={[styles.treeSection, { borderTopColor: theme.border }]}>
                  <TouchableOpacity
                    style={styles.treeToggleHeader}
                    onPress={() => setShowTreePreview(!showTreePreview)}>
                    <View style={styles.treeToggleLeft}>
                      <Ionicons
                        name={showTreePreview ? 'chevron-down' : 'chevron-forward'}
                        size={16}
                        color={theme.subtext}
                      />
                      <Text style={[styles.treeToggleTitle, { color: theme.text }]}>
                        Folder Hierarchy Preview ({currentInstance.scores.length} scores)
                      </Text>
                    </View>
                    <Text style={[styles.treeToggleHint, { color: theme.tint }]}>
                      {showTreePreview ? 'Hide' : 'View Tree'}
                    </Text>
                  </TouchableOpacity>

                  {showTreePreview && (
                    <View style={[styles.treePreviewBox, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
                      <Text style={[styles.treeRootName, { color: theme.text }]}>
                        📁 {currentInstance.name}/
                      </Text>
                      {previewTree.map((item, idx) => (
                        <View key={`${item.folder}-${item.filename}-${idx}`} style={styles.treeItemRow}>
                          <Text style={[styles.treeIndent, { color: theme.subtext }]}>
                            {idx === previewTree.length - 1 ? '└── ' : '├── '}
                          </Text>
                          <Text style={[styles.treeFolderPill, { color: theme.tint }]}>
                            {item.folder}/
                          </Text>
                          <Text style={[styles.treeFileName, { color: theme.text }]} numberOfLines={1}>
                            {item.filename}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Offline Cache Stats & Quick Refresh */}
              <View style={[styles.subStorageRow, { borderTopColor: theme.border }]}>
                <View>
                  <Text style={[styles.storageMetaText, { color: theme.subtext }]}>
                    Internal Cache: {downloadedCount} of {totalScores} scores ({diskSizeMB} MB)
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.textActionBtn}
                  onPress={handleClearCache}
                  disabled={isClearingCache}>
                  <Text style={[styles.textActionLabel, { color: Colors.status.failed }]}>
                    {isClearingCache ? 'Clearing...' : 'Clear Cache'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Account Profile Section */}
          {currentUser && (
            <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.sectionCardHeader}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="person-outline" size={17} color={theme.tint} />
                  <Text style={[styles.sectionCardTitle, { color: theme.text }]}>Account</Text>
                </View>
                <TouchableOpacity
                  onPress={async () => {
                    await signOutUser();
                    router.push('/login');
                  }}>
                  <Text style={[styles.headerLink, { color: Colors.status.failed }]}>Sign Out</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.sectionBody}>
                <View style={styles.accountRow}>
                  <View style={[styles.avatar, { backgroundColor: theme.badgeBackground }]}>
                    <Ionicons name="person" size={18} color={theme.tint} />
                  </View>
                  <View style={styles.accountInfo}>
                    <Text style={[styles.accountName, { color: theme.text }]}>{currentUser.fullName}</Text>
                    <Text style={[styles.accountEmail, { color: theme.subtext }]}>{currentUser.email}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* App Info & Update Section */}
          <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.sectionCardHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="information-circle-outline" size={17} color={theme.tint} />
                <Text style={[styles.sectionCardTitle, { color: theme.text }]}>Software & Updates</Text>
              </View>
              <Text style={[styles.versionText, { color: theme.subtext }]}>
                v{UpdateService.currentVersion} ({UpdateService.currentBuildNumber})
              </Text>
            </View>

            <View style={styles.sectionBody}>
              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, flex: 1 }]}
                  onPress={handleCheckForUpdates}
                  disabled={isCheckingUpdate}>
                  <Ionicons name="refresh-outline" size={15} color={theme.text} style={{ marginRight: 5 }} />
                  <Text style={[styles.smallBtnText, { color: theme.text }]}>
                    {isCheckingUpdate ? 'Checking...' : updateCheckStatus || 'Check for Updates'}
                  </Text>
                </TouchableOpacity>

                {Platform.OS === 'web' && (
                  <TouchableOpacity
                    style={[styles.smallBtn, { backgroundColor: theme.tint, borderColor: theme.tint, flex: 1 }]}
                    onPress={() => Linking.openURL('https://refertoire.github.io/apk/Refertoire.apk')}>
                    <Ionicons name="logo-android" size={15} color="#FFFFFF" style={{ marginRight: 5 }} />
                    <Text style={[styles.smallBtnText, { color: '#FFFFFF', fontWeight: '700' }]}>
                      Get Android APK
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {currentInstance && (
                <TouchableOpacity
                  style={[styles.disconnectBtn, { borderTopColor: theme.border }]}
                  onPress={handleSignOut}
                  disabled={isSigningOut}>
                  <Ionicons name="log-out-outline" size={16} color={Colors.status.failed} style={{ marginRight: 6 }} />
                  <Text style={[styles.disconnectText, { color: Colors.status.failed }]}>
                    {isSigningOut ? 'Disconnecting...' : `Disconnect from ${currentInstance.code}`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Footer branding */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.subtext }]}>
              Refertoire • Ensemble Repertoire Sync
            </Text>
          </View>
        </ScrollView>

        <EnsembleMembersModal
          visible={showMembersModal}
          onClose={() => setShowMembersModal(false)}
        />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  screenSub: {
    fontSize: 12,
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 96,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.12)',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  headerLink: {
    fontSize: 12,
    fontWeight: '600',
  },
  statBadge: {
    fontSize: 12,
    fontWeight: '700',
  },
  versionText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  sectionBody: {
    padding: 16,
    gap: 14,
  },
  ensembleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ensembleName: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    flex: 1,
  },
  rolePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rolePillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  ensembleMeta: {
    fontSize: 12,
    marginTop: -2,
    opacity: 0.85,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  codeLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  codeValue: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 1,
    marginTop: 2,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  actionRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionRowLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  countText: {
    fontSize: 11,
    fontWeight: '600',
  },
  connectPrompt: {
    padding: 24,
    alignItems: 'center',
  },
  connectPromptText: {
    fontSize: 14,
    fontWeight: '700',
  },
  storageBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  storageBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  storageSubText: {
    fontSize: 12,
    marginTop: -2,
    opacity: 0.85,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  smallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  smallBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  toggleInfo: {
    flex: 1,
    paddingRight: 12,
  },
  toggleTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  toggleSub: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
    opacity: 0.8,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 14,
    fontWeight: '700',
  },
  accountEmail: {
    fontSize: 12,
    marginTop: 1,
  },
  disconnectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  disconnectText: {
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 12,
    opacity: 0.7,
  },
  syncStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  syncDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  syncStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  linkedFolderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  linkedFolderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    backgroundColor: 'transparent',
  },
  linkedFolderLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  linkedFolderPath: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 2,
  },
  unlinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  unlinkText: {
    fontSize: 12,
    fontWeight: '600',
  },
  unlinkedPromptBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 14,
  },
  unlinkedPromptLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'transparent',
  },
  promptTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  promptSub: {
    fontSize: 12,
    lineHeight: 17,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    width: '100%',
    shadowColor: '#C49746',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryActionBtnText: {
    color: '#0D0E12',
    fontSize: 14,
    fontWeight: '700',
  },
  hierarchyModeContainer: {
    gap: 8,
    backgroundColor: 'transparent',
  },
  settingLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  modeSegmentedBar: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 10,
    gap: 4,
  },
  modeSegmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  modeSegmentText: {
    fontSize: 12,
  },
  syncActionArea: {
    gap: 10,
    backgroundColor: 'transparent',
  },
  progressContainer: {
    gap: 6,
    backgroundColor: 'transparent',
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  progressCurrentFile: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    flex: 1,
    marginRight: 8,
  },
  progressRatio: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  iosNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  treeSection: {
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
  },
  treeToggleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  treeToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'transparent',
  },
  treeToggleTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  treeToggleHint: {
    fontSize: 12,
    fontWeight: '700',
  },
  treePreviewBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  treeRootName: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 4,
  },
  treeItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  treeIndent: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  treeFolderPill: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginRight: 4,
  },
  treeFileName: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    flex: 1,
  },
  subStorageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
  },
  storageMetaText: {
    fontSize: 11,
  },
  textActionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  textActionLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
