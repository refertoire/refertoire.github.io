import React, { useState } from 'react';
import {
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useRepertoire } from '@/context/RepertoireContext';
import { Setlist, ScoreItem } from '@/types/repertoire';
import ProgramEditorModal from '@/components/ProgramEditorModal';
import NetworkStatusBar from '@/components/NetworkStatusBar';

export default function SetlistsScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme];
  const { currentInstance, scores, userRole, deleteProgram } = useRepertoire();

  const [expandedSetlistId, setExpandedSetlistId] = useState<string | null>(
    currentInstance?.setlists[0]?.id || null
  );

  const [modalVisible, setModalVisible] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Setlist | null>(null);

  const setlists = currentInstance?.setlists || [];

  const getScoreById = (id: string): ScoreItem | undefined => {
    return scores.find(s => s.id === id);
  };

  const handleOpenCreateModal = () => {
    setEditingProgram(null);
    setModalVisible(true);
  };

  const handleOpenEditModal = (program: Setlist) => {
    setEditingProgram(program);
    setModalVisible(true);
  };

  const handleDeleteProgram = (program: Setlist) => {
    const doDelete = async () => {
      await deleteProgram(program.id);
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Delete program "${program.title}"?`);
      if (confirmed) {
        doDelete();
      }
    } else {
      Alert.alert(
        'Delete Program',
        `Delete program "${program.title}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: doDelete },
        ]
      );
    }
  };

  const renderSetlistItem = ({ item }: { item: Setlist }) => {
    const isExpanded = expandedSetlistId === item.id;
    const setlistScores = item.scoreIds
      .map(id => getScoreById(id))
      .filter((s): s is ScoreItem => Boolean(s));

    return (
      <View
        style={[
          styles.setlistCard,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}>
        {/* Setlist Header */}
        <TouchableOpacity
          style={styles.setlistHeader}
          onPress={() => setExpandedSetlistId(isExpanded ? null : item.id)}
          activeOpacity={0.72}>
          <View style={[styles.folderBadge, { backgroundColor: theme.surfaceSubtle }]}>
            <Ionicons name={isExpanded ? 'folder-open' : 'folder'} size={20} color={theme.tint} />
          </View>

          <View style={styles.headerTitleWrap}>
            <Text style={[styles.setlistTitle, { color: theme.text }]} numberOfLines={1}>
              {item.title}
            </Text>

            {(item.date || item.venue) && (
              <View style={styles.metaRow}>
                {item.date && (
                  <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={11} color={theme.tint} />
                    <Text style={[styles.metaText, { color: theme.tint }]}>{item.date}</Text>
                  </View>
                )}
                {item.venue && (
                  <View style={styles.metaItem}>
                    <Ionicons name="location-outline" size={11} color={theme.subtext} />
                    <Text style={[styles.metaText, { color: theme.subtext }]}>{item.venue}</Text>
                  </View>
                )}
              </View>
            )}

            {item.description && (
              <Text style={[styles.setDescription, { color: theme.subtext }]} numberOfLines={2}>
                {item.description}
              </Text>
            )}
          </View>

          <View style={styles.headerRight}>
            <View style={[styles.countBadge, { backgroundColor: theme.surfaceSubtle }]}>
              <Text style={[styles.countText, { color: theme.text }]}>
                {item.scoreIds.length} {item.scoreIds.length === 1 ? 'score' : 'scores'}
              </Text>
            </View>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={theme.subtext}
            />
          </View>
        </TouchableOpacity>

        {/* Expanded Sequence */}
        {isExpanded && (
          <View style={[styles.expandedContent, { borderTopColor: theme.border }]}>
            {userRole === 'admin' && (
              <View style={[styles.adminActionsRow, { borderBottomColor: theme.border }]}>
                <TouchableOpacity
                  style={[styles.editBtn, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}
                  onPress={() => handleOpenEditModal(item)}>
                  <Ionicons name="create-outline" size={13} color={theme.text} style={{ marginRight: 4 }} />
                  <Text style={[styles.editBtnText, { color: theme.text }]}>Edit Program</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteProgram(item)}>
                  <Ionicons name="trash-outline" size={13} color="#DC2626" style={{ marginRight: 4 }} />
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}

            {setlistScores.length === 0 ? (
              <View style={styles.emptyFolderNotice}>
                <Text style={[styles.emptyFolderText, { color: theme.subtext }]}>
                  No pieces added to this program yet.
                </Text>
                {userRole === 'admin' && (
                  <TouchableOpacity
                    style={[styles.addPiecesBtn, { backgroundColor: theme.tint }]}
                    onPress={() => handleOpenEditModal(item)}>
                    <Text style={styles.addPiecesBtnText}>Add Scores</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              setlistScores.map((score, index) => {
                const voicingColors = Colors.voicings[score.voicing] || {
                  bg: theme.surfaceSubtle,
                  text: theme.text,
                  darkBg: theme.surfaceSubtle,
                  darkText: theme.text,
                };
                const voicingBg = colorScheme === 'dark' ? voicingColors.darkBg : voicingColors.bg;
                const voicingTextColor =
                  colorScheme === 'dark' ? voicingColors.darkText : voicingColors.text;

                return (
                  <TouchableOpacity
                    key={score.id}
                    style={[styles.sequenceRow, { borderBottomColor: theme.border }]}
                    onPress={() =>
                      router.push({ pathname: '/score/[id]', params: { id: score.id } })
                    }
                    activeOpacity={0.7}>
                    <View style={[styles.sequenceNum, { backgroundColor: theme.surfaceSubtle }]}>
                      <Text style={[styles.sequenceNumText, { color: theme.tint }]}>
                        {index + 1}
                      </Text>
                    </View>

                    <View style={styles.sequenceInfo}>
                      <Text style={[styles.sequenceTitle, { color: theme.text }]} numberOfLines={1}>
                        {score.title}
                      </Text>
                      <Text style={[styles.sequenceComposer, { color: theme.subtext }]} numberOfLines={1}>
                        {score.composer}
                      </Text>
                    </View>

                    <View style={styles.sequenceRight}>
                      <View style={[styles.miniVoicingBadge, { backgroundColor: voicingBg }]}>
                        <Text style={[styles.miniVoicingText, { color: voicingTextColor }]}>
                          {score.voicing}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={14} color={theme.subtext} />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={styles.responsiveContainer}>
        {/* Screen Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <View style={styles.headerTextWrap}>
            <Text style={[styles.screenTitle, { color: theme.text }]}>Programs</Text>
            <Text style={[styles.screenSub, { color: theme.subtext }]}>
              Ordered rehearsal & performance folders
            </Text>
          </View>

          {userRole === 'admin' && (
            <TouchableOpacity
              style={[styles.createBtn, { backgroundColor: theme.tint }]}
              onPress={handleOpenCreateModal}>
              <Ionicons name="add" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.createBtnText}>New Program</Text>
            </TouchableOpacity>
          )}
        </View>

        <NetworkStatusBar />

        <FlatList
          data={setlists}
          keyExtractor={item => item.id}
          renderItem={renderSetlistItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-open-outline" size={44} color={theme.subtext} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No Programs Created</Text>
              <Text style={[styles.emptyText, { color: theme.subtext }]}>
                {userRole === 'admin'
                  ? 'Create a program folder to set the rehearsal or concert sequence.'
                  : 'The director has not configured any program folders yet.'}
              </Text>
              {userRole === 'admin' && (
                <TouchableOpacity
                  style={[styles.emptyCreateBtn, { backgroundColor: theme.tint }]}
                  onPress={handleOpenCreateModal}>
                  <Ionicons name="add-circle-outline" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.emptyCreateBtnText}>Create Program</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />

        <ProgramEditorModal
          visible={modalVisible}
          programToEdit={editingProgram}
          onClose={() => setModalVisible(false)}
          onSaved={() => {
            if (editingProgram) {
              setExpandedSetlistId(editingProgram.id);
            }
          }}
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
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    justifyContent: 'space-between',
  },
  headerTextWrap: {
    flex: 1,
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
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 96,
  },
  setlistCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  setlistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  folderBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerTitleWrap: {
    flex: 1,
  },
  setlistTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '500',
  },
  setDescription: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
    opacity: 0.85,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  countText: {
    fontSize: 11,
    fontWeight: '600',
  },
  expandedContent: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  adminActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#EF444415',
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  emptyFolderNotice: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyFolderText: {
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  addPiecesBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addPiecesBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  sequenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  sequenceNum: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sequenceNumText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  sequenceInfo: {
    flex: 1,
  },
  sequenceTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  sequenceComposer: {
    fontSize: 12,
    marginTop: 2,
    opacity: 0.8,
  },
  sequenceRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniVoicingBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  miniVoicingText: {
    fontSize: 10,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyCreateBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
