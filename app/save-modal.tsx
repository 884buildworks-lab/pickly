import {
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  View,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCollectionStore, useCardStore, useAppStore } from '@/store';
import { Colors, Typography, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { fetchUrlMetadata, isValidUrl, simplifyUrlForTitle } from '@/utils/url-metadata';
import { hapticSuccess } from '@/utils/haptics';
import { UNCATEGORIZED_ID, UNCATEGORIZED_ICON, UNCATEGORIZED_LABEL } from '@/constants/collections';

export default function SaveModal() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const collections = useCollectionStore((state) => state.collections);
  const lastUsedCollectionId = useCollectionStore((state) => state.lastUsedCollectionId);
  const setLastUsedCollectionId = useCollectionStore((state) => state.setLastUsedCollectionId);
  const addCard = useCardStore((state) => state.addCard);

  const sharedUrl = useAppStore((state) => state.sharedUrl);
  const setSharedUrl = useAppStore((state) => state.setSharedUrl);

  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [memo, setMemo] = useState('');
  const [thumbnail, setThumbnail] = useState<string | undefined>(undefined);
  const [favicon, setFavicon] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const urlHasValue = url.trim().length > 0;
  const urlIsValid = !urlHasValue || isValidUrl(url.trim());
  const canSave = urlIsValid && (urlHasValue || title.trim().length > 0);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(
    lastUsedCollectionId && collections.some((c) => c.id === lastUsedCollectionId)
      ? lastUsedCollectionId
      : null
  );

  useEffect(() => {
    if (sharedUrl) {
      setUrl(sharedUrl);
      setSharedUrl(null);
    }
  }, [sharedUrl, setSharedUrl]);

  const fetchMetadata = useCallback(async (inputUrl: string) => {
    if (!isValidUrl(inputUrl)) return;
    setIsLoading(true);
    try {
      const metadata = await fetchUrlMetadata(inputUrl);
      if (metadata.title && !title) setTitle(metadata.title);
      if (metadata.image) setThumbnail(metadata.image);
      if (metadata.favicon) setFavicon(metadata.favicon);
    } catch (error) {
      console.warn('Failed to fetch metadata:', error);
    } finally {
      setIsLoading(false);
    }
  }, [title]);

  useEffect(() => {
    if (!url || !isValidUrl(url)) return;
    const id = setTimeout(() => { fetchMetadata(url); }, 500);
    return () => clearTimeout(id);
  }, [url, fetchMetadata]);

  const handleSave = () => {
    const collectionId = selectedCollectionId ?? UNCATEGORIZED_ID;
    addCard({
      collectionId,
      title: title || (url ? simplifyUrlForTitle(url) : '無題'),
      url: url || undefined,
      thumbnail,
      favicon,
      memo,
      labels: [],
      checklist: [],
      images: [],
    });
    if (selectedCollectionId) setLastUsedCollectionId(selectedCollectionId);
    hapticSuccess();
    router.back();
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.groupBackground }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* ---- URL ---- */}
      <ThemedText style={[styles.sectionHeader, { color: colors.textSecondary }]}>URL</ThemedText>
      <View style={[styles.formGroup, { backgroundColor: colors.card }]}>
        <View style={styles.urlRow}>
          <TextInput
            style={[styles.input, styles.urlInput, { color: colors.text }]}
            value={url}
            onChangeText={setUrl}
            placeholder="https://..."
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          {isLoading && (
            <ActivityIndicator style={styles.urlSpinner} size="small" color={colors.tint} />
          )}
        </View>
        {urlHasValue && !urlIsValid && (
          <ThemedText style={[styles.urlError, { color: colors.destructive ?? '#FF3B30' }]}>
            有効なURLを入力してください（例: https://...）
          </ThemedText>
        )}
        {url && isValidUrl(url) && thumbnail && (
          <View style={[styles.previewWrap, { borderTopColor: colors.separator, borderTopWidth: StyleSheet.hairlineWidth }]}>
            <Image source={{ uri: thumbnail }} style={styles.previewImage} resizeMode="cover" />
          </View>
        )}
      </View>

      {/* ---- Title ---- */}
      <ThemedText style={[styles.sectionHeader, { color: colors.textSecondary }]}>
        タイトル
        {isLoading && (
          <ThemedText style={[styles.autoLabel, { color: colors.textSecondary }]}> (取得中...)</ThemedText>
        )}
      </ThemedText>
      <View style={[styles.formGroup, { backgroundColor: colors.card }]}>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          value={title}
          onChangeText={setTitle}
          placeholder="タイトルを入力（空欄で自動取得）"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      {/* ---- Memo ---- */}
      <ThemedText style={[styles.sectionHeader, { color: colors.textSecondary }]}>メモ</ThemedText>
      <View style={[styles.formGroup, { backgroundColor: colors.card }]}>
        <TextInput
          style={[styles.input, styles.memoInput, { color: colors.text }]}
          value={memo}
          onChangeText={setMemo}
          placeholder="メモを入力"
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* ---- Collection ---- */}
      <ThemedText style={[styles.sectionHeader, { color: colors.textSecondary }]}>
        コレクション
        <ThemedText style={[styles.optionalLabel, { color: colors.textSecondary }]}> (任意)</ThemedText>
      </ThemedText>
      <View style={styles.collectionGrid}>
        {/* 未分類 */}
        <Pressable
          style={({ pressed }) => [
            styles.collectionChip,
            {
              backgroundColor:
                selectedCollectionId === null ? colors.tint : colors.card,
            },
            pressed && styles.pressedOpacity,
          ]}
          onPress={() => setSelectedCollectionId(null)}
        >
          <ThemedText style={styles.collectionChipIcon}>{UNCATEGORIZED_ICON}</ThemedText>
          <ThemedText
            style={[
              styles.collectionChipName,
              { color: selectedCollectionId === null ? '#fff' : colors.text },
            ]}
          >
            {UNCATEGORIZED_LABEL}
          </ThemedText>
        </Pressable>

        {collections.map((collection) => (
          <Pressable
            key={collection.id}
            style={({ pressed }) => [
              styles.collectionChip,
              {
                backgroundColor:
                  selectedCollectionId === collection.id ? colors.tint : colors.card,
              },
              pressed && styles.pressedOpacity,
            ]}
            onPress={() => setSelectedCollectionId(collection.id)}
          >
            <ThemedText style={styles.collectionChipIcon}>{collection.icon}</ThemedText>
            <ThemedText
              style={[
                styles.collectionChipName,
                { color: selectedCollectionId === collection.id ? '#fff' : colors.text },
              ]}
            >
              {collection.name}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {/* ---- Save Button ---- */}
      <Pressable
        style={({ pressed }) => [
          styles.saveButton,
          { backgroundColor: colors.tint },
          (isLoading || !canSave) && styles.saveButtonDisabled,
          pressed && styles.pressedOpacity,
        ]}
        onPress={handleSave}
        disabled={isLoading || !canSave}
      >
        <ThemedText style={styles.saveButtonText}>
          {isLoading ? '読み込み中...' : '保存'}
        </ThemedText>
      </Pressable>

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

  // Section header
  sectionHeader: {
    fontSize: Typography.footnote.fontSize,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 6,
    marginHorizontal: Spacing.screenHorizontal,
  },
  autoLabel: {
    fontWeight: '400',
    textTransform: 'none',
  },
  optionalLabel: {
    fontWeight: '400',
    textTransform: 'none',
    fontSize: Typography.footnote.fontSize,
  },

  // Form group (white rounded card)
  formGroup: {
    marginHorizontal: Spacing.screenHorizontal,
    borderRadius: Spacing.groupRadius,
    overflow: 'hidden',
  },

  // Input inside form group
  input: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: 13,
    fontSize: Typography.body.fontSize,
    lineHeight: Typography.body.lineHeight,
  },
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  urlInput: {
    flex: 1,
    paddingRight: 48,
  },
  urlSpinner: {
    position: 'absolute',
    right: 14,
  },
  memoInput: {
    minHeight: 100,
    paddingTop: 13,
  },

  // URL error
  urlError: {
    ...Typography.footnote,
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: 8,
  },

  // Preview image
  previewWrap: {
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    aspectRatio: 16 / 9,
  },

  // Collection chips
  collectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginHorizontal: Spacing.screenHorizontal,
  },
  collectionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
  },
  collectionChipIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  collectionChipName: {
    ...Typography.subhead,
    fontWeight: '500',
  },

  // Save button – full width, iOS primary
  saveButton: {
    marginHorizontal: Spacing.screenHorizontal,
    marginTop: 28,
    paddingVertical: 15,
    borderRadius: Spacing.buttonRadiusMd,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: Typography.headline.fontSize,
    fontWeight: Typography.headline.fontWeight,
  },

  pressedOpacity: {
    opacity: 0.7,
  },

  bottomPad: {
    height: 40,
  },
});
