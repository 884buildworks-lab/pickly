import { StyleSheet, ScrollView, Pressable, Alert, Linking, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCollectionStore, useCardStore, useAppStore } from '@/store';
import type { ThemeMode } from '@/store/app-store';
import { Colors, Typography, Spacing, StatusColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { hapticWarning, hapticSuccess, hapticLight } from '@/utils/haptics';
import { exportData, importData } from '@/utils/data-transfer';

// ---- Small helper components ----

function SectionHeader({ label }: { label: string }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  return (
    <ThemedText style={[styles.sectionHeader, { color: colors.textSecondary }]}>
      {label}
    </ThemedText>
  );
}

type CellProps = {
  label: string;
  value?: string;
  destructive?: boolean;
  onPress?: () => void;
  showChevron?: boolean;
};

function Cell({ label, value, destructive, onPress, showChevron = false }: CellProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  return (
    <Pressable
      style={({ pressed }) => [pressed && styles.cellPressed]}
      onPress={onPress}
    >
      <View style={[styles.cell, { backgroundColor: colors.card }]}>
        <ThemedText
          style={[
            styles.cellLabel,
            { color: destructive ? StatusColors.rejected : colors.text },
          ]}
        >
          {label}
        </ThemedText>
        {value !== undefined && (
          <ThemedText style={[styles.cellValue, { color: colors.textSecondary }]}>
            {value}
          </ThemedText>
        )}
        {showChevron && (
          <ThemedText style={[styles.chevron, { color: colors.textSecondary }]}>›</ThemedText>
        )}
      </View>
    </Pressable>
  );
}

// ---- Main screen ----

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const collections = useCollectionStore((state) => state.collections);
  const cards = useCardStore((state) => state.cards);
  const setHasCompletedOnboarding = useAppStore((state) => state.setHasCompletedOnboarding);
  const themeMode = useAppStore((state) => state.themeMode);
  const setThemeMode = useAppStore((state) => state.setThemeMode);

  const handleThemeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
    hapticLight();
  };

  const getThemeLabel = (mode: ThemeMode) => {
    switch (mode) {
      case 'light':  return 'ライト';
      case 'dark':   return 'ダーク';
      case 'system': return 'システム';
    }
  };

  const handleClearAllData = () => {
    Alert.alert(
      'すべてのデータを削除',
      'コレクションとカードがすべて削除されます。この操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            useCollectionStore.setState({ collections: [], lastUsedCollectionId: null });
            useCardStore.setState({ cards: [] });
            hapticWarning();
            Alert.alert('完了', 'すべてのデータを削除しました。');
          },
        },
      ]
    );
  };

  const handleResetOnboarding = () => {
    setHasCompletedOnboarding(false);
    hapticSuccess();
    Alert.alert('完了', '次回起動時にオンボーディングが表示されます。');
  };

  const handleExport = async () => {
    const success = await exportData();
    if (success) {
      hapticSuccess();
    } else {
      Alert.alert('エラー', 'エクスポートに失敗しました。');
    }
  };

  const handleImport = async () => {
    const result = await importData();
    if (result) {
      hapticSuccess();
      Alert.alert(
        'インポート完了',
        `コレクション ${result.collections}件、カード ${result.cards}件をインポートしました。`
      );
    } else if (result === null) {
      // User cancelled or error
    }
  };

  const handleOpenPrivacyPolicy = () => {
    Linking.openURL('https://884buildworks-lab.github.io/pickly/privacy-policy.html');
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.groupBackground }]}
      contentContainerStyle={styles.content}
    >
      {/* ---- Stats ---- */}
      <SectionHeader label="統計" />
      <View style={[styles.group, { backgroundColor: colors.card }]}>
        <View style={styles.statsRow}>
          <View style={styles.statCell}>
            <ThemedText style={[styles.statNumber, { color: colors.text }]}>
              {collections.length}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>
              コレクション
            </ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.separator }]} />
          <View style={styles.statCell}>
            <ThemedText style={[styles.statNumber, { color: colors.text }]}>
              {cards.length}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>
              カード
            </ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.separator }]} />
          <View style={styles.statCell}>
            <ThemedText style={[styles.statNumber, { color: StatusColors.decided }]}>
              {cards.filter((c) => c.status === 'decided').length}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>
              決定済み
            </ThemedText>
          </View>
        </View>
      </View>

      {/* ---- Theme ---- */}
      <SectionHeader label="テーマ" />
      <View style={[styles.group, { backgroundColor: colors.card }]}>
        {/* iOS-style segmented control */}
        <View style={styles.themeSegmentWrap}>
          <View style={[styles.themeSegment, { backgroundColor: colors.groupBackground }]}>
            {(['system', 'light', 'dark'] as ThemeMode[]).map((mode) => (
              <Pressable
                key={mode}
                style={[
                  styles.themeSegmentBtn,
                  themeMode === mode && { backgroundColor: colors.card },
                  themeMode === mode && styles.themeSegmentBtnActive,
                ]}
                onPress={() => handleThemeChange(mode)}
              >
                <ThemedText
                  style={[
                    styles.themeSegmentText,
                    {
                      color: themeMode === mode ? colors.text : colors.textSecondary,
                      fontWeight: themeMode === mode ? '600' : '400',
                    },
                  ]}
                >
                  {getThemeLabel(mode)}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {/* ---- Data management ---- */}
      <SectionHeader label="データ管理" />
      <View style={[styles.group, styles.groupStacked, { backgroundColor: colors.card }]}>
        <Cell label="データをエクスポート" onPress={handleExport} showChevron />
        <View style={[styles.cellSeparator, { backgroundColor: colors.separator, marginLeft: Spacing.screenHorizontal }]} />
        <Cell label="データをインポート" onPress={handleImport} showChevron />
        <View style={[styles.cellSeparator, { backgroundColor: colors.separator, marginLeft: Spacing.screenHorizontal }]} />
        <Cell label="オンボーディングを再表示" onPress={handleResetOnboarding} showChevron />
      </View>

      <View style={[styles.group, { backgroundColor: colors.card }]}>
        <Cell label="すべてのデータを削除" destructive onPress={handleClearAllData} />
      </View>

      {/* ---- App info ---- */}
      <SectionHeader label="アプリ情報" />
      <View style={[styles.group, styles.groupStacked, { backgroundColor: colors.card }]}>
        <Cell label="バージョン" value="0.1.0" />
        <View style={[styles.cellSeparator, { backgroundColor: colors.separator, marginLeft: Spacing.screenHorizontal }]} />
        <Cell label="フレームワーク" value="Expo + React Native" />
      </View>

      {/* ---- About ---- */}
      <SectionHeader label="Picklyについて" />
      <View style={[styles.group, { backgroundColor: colors.card }]}>
        <ThemedText style={[styles.aboutText, { color: colors.textSecondary }]}>
          Picklyは、「候補集め → 比較 → 決定」を直感的に行えるURL保存＆カード管理アプリです。
          プレゼント探し・旅行の宿比較など、あらゆる「選ぶ」をサポートします。
        </ThemedText>
      </View>

      {/* ---- Legal ---- */}
      <SectionHeader label="法的情報" />
      <View style={[styles.group, { backgroundColor: colors.card }]}>
        <Cell label="プライバシーポリシー" onPress={handleOpenPrivacyPolicy} showChevron />
      </View>

      {/* bottom padding for tab bar */}
      <View style={styles.bottomPad} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingTop: 8,
  },

  // Section header (uppercase, secondary color)
  sectionHeader: {
    fontSize: Typography.footnote.fontSize,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 6,
    marginHorizontal: Spacing.screenHorizontal,
  },

  // Grouped card
  group: {
    marginHorizontal: Spacing.screenHorizontal,
    borderRadius: Spacing.groupRadius,
    overflow: 'hidden',
  },
  groupStacked: {
    // Children are stacked with separators
  },

  // Cell separator inside a group
  cellSeparator: {
    height: StyleSheet.hairlineWidth,
  },

  // Individual cell
  cell: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: Spacing.cellVertical + 2,
    minHeight: 44,
  },
  cellLabel: {
    flex: 1,
    ...Typography.body,
  },
  cellValue: {
    ...Typography.body,
    marginLeft: 8,
  },
  chevron: {
    fontSize: 18,
    marginLeft: 6,
    opacity: 0.5,
  },
  cellPressed: {
    opacity: 0.6,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    paddingVertical: 20,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    ...Typography.caption,
  },

  // Theme segment
  themeSegmentWrap: {
    padding: 8,
  },
  themeSegment: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
  },
  themeSegmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  themeSegmentBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  themeSegmentText: {
    ...Typography.subhead,
  },

  // About text
  aboutText: {
    ...Typography.subhead,
    lineHeight: 22,
    padding: Spacing.screenHorizontal,
  },

  bottomPad: {
    height: 40,
  },
});
