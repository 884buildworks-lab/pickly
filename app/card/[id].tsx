import {
  StyleSheet,
  ScrollView,
  View,
  Pressable,
  Linking,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useMemo, useCallback } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { WebView } from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCardStore, useCollectionStore, useCacheStore } from '@/store';
import { Colors, Typography, Spacing, StatusColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { CardStatus, CardPriority } from '@/types';
import { hapticLight, hapticSuccess, hapticWarning } from '@/utils/haptics';
import { pickImages, takePhoto, showImagePickerOptions } from '@/utils/image-picker';
import { fetchPageContent, wrapWithBase } from '@/utils/content-cache';
import { UNCATEGORIZED_ID, UNCATEGORIZED_ICON, UNCATEGORIZED_LABEL } from '@/constants/collections';
import AdBanner from '@/components/ad-banner';

// Status configuration
const STATUS_CONFIG: Record<CardStatus, { label: string; color: string }> = {
  thinking: { label: '検討中', color: StatusColors.thinking },
  decided:  { label: '決定',   color: StatusColors.decided },
  rejected: { label: '却下',   color: StatusColors.rejected },
};

const PRIORITY_LABELS: Record<CardPriority, string> = {
  1: '★',
  2: '★★',
  3: '★★★',
};

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const card = useCardStore((state) => state.cards.find((c) => c.id === id));
  const updateCard = useCardStore((state) => state.updateCard);
  const deleteCard = useCardStore((state) => state.deleteCard);
  const getAllLabels = useCardStore((state) => state.getAllLabels);
  const collections = useCollectionStore((state) => state.collections);

  const cacheEntry = useCacheStore((state) => id ? state.entries[id] : undefined);
  const setCacheEntry = useCacheStore((state) => state.setCacheEntry);
  const clearCacheEntry = useCacheStore((state) => state.clearCacheEntry);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingMemo, setIsEditingMemo] = useState(false);
  const [editTitle, setEditTitle] = useState(card?.title || '');
  const [editMemo, setEditMemo] = useState(card?.memo || '');
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [editingChecklistText, setEditingChecklistText] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [showLabelSuggestions, setShowLabelSuggestions] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showCachedContent, setShowCachedContent] = useState(false);

  const allLabels = useMemo(() => getAllLabels(), [getAllLabels]);

  const labelSuggestions = useMemo(() => {
    if (!card) return [];
    const query = newLabel.trim().toLowerCase();
    if (!query) {
      return allLabels.filter((label) => !card.labels.includes(label)).slice(0, 5);
    }
    return allLabels
      .filter((label) => label.toLowerCase().includes(query) && !card.labels.includes(label))
      .slice(0, 5);
  }, [newLabel, allLabels, card]);

  if (!card) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>カードが見つかりません</ThemedText>
      </ThemedView>
    );
  }

  const isUncategorized = card.collectionId === UNCATEGORIZED_ID;
  const currentCollection = isUncategorized
    ? null
    : collections.find((c) => c.id === card.collectionId);

  const handleStatusChange = (newStatus: CardStatus) => {
    updateCard(card.id, { status: newStatus });
    if (newStatus === 'decided') hapticSuccess(); else hapticLight();
  };

  const handlePriorityChange = (newPriority: CardPriority) => {
    updateCard(card.id, { priority: newPriority });
    hapticLight();
  };

  const handleOpenUrl = () => {
    if (card.url) Linking.openURL(card.url);
  };

  const handlePreviewUrl = async () => {
    if (card.url) {
      await WebBrowser.openBrowserAsync(card.url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        controlsColor: colors.tint,
      });
    }
  };

  const handleSaveTitle = () => {
    updateCard(card.id, { title: editTitle.trim() || '無題' });
    setIsEditingTitle(false);
  };

  const handleSaveMemo = () => {
    updateCard(card.id, { memo: editMemo });
    setIsEditingMemo(false);
  };

  const handleCollectionChange = (collectionId: string) => {
    updateCard(card.id, { collectionId });
    setShowCollectionPicker(false);
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    useCardStore.getState().addChecklistItem(card.id, newChecklistItem.trim());
    setNewChecklistItem('');
    hapticLight();
  };

  const handleEditChecklistItem = (itemId: string, text: string) => {
    setEditingChecklistId(itemId);
    setEditingChecklistText(text);
  };

  const handleSaveChecklistItem = () => {
    if (editingChecklistId && editingChecklistText.trim()) {
      useCardStore.getState().updateChecklistItem(
        card.id,
        editingChecklistId,
        editingChecklistText.trim()
      );
    }
    setEditingChecklistId(null);
    setEditingChecklistText('');
  };

  const handleDeleteChecklistItem = (itemId: string) => {
    Alert.alert('項目を削除', 'この項目を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => {
          useCardStore.getState().removeChecklistItem(card.id, itemId);
          hapticLight();
        },
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert('カードを削除', 'このカードを削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => {
          clearCacheEntry(card.id);
          deleteCard(card.id);
          hapticWarning();
          router.back();
        },
      },
    ]);
  };

  const handleAddImages = () => {
    showImagePickerOptions(
      async () => {
        const images = await pickImages(true);
        if (images.length > 0) {
          updateCard(card.id, { images: [...card.images, ...images.map((img) => img.uri)] });
          hapticSuccess();
        }
      },
      async () => {
        const photo = await takePhoto();
        if (photo) {
          updateCard(card.id, { images: [...card.images, photo.uri] });
          hapticSuccess();
        }
      }
    );
  };

  const handleRemoveImage = (index: number) => {
    Alert.alert('画像を削除', 'この画像を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => {
          updateCard(card.id, { images: card.images.filter((_, i) => i !== index) });
          hapticLight();
        },
      },
    ]);
  };

  const handleAddLabel = () => {
    const trimmedLabel = newLabel.trim();
    if (!trimmedLabel) return;
    if (card.labels.includes(trimmedLabel)) {
      Alert.alert('エラー', 'このラベルは既に追加されています');
      return;
    }
    updateCard(card.id, { labels: [...card.labels, trimmedLabel] });
    setNewLabel('');
    hapticLight();
  };

  const handleRemoveLabel = (label: string) => {
    updateCard(card.id, { labels: card.labels.filter((l) => l !== label) });
    hapticLight();
  };

  const handleDownloadContent = useCallback(async () => {
    if (!card.url) return;
    setIsDownloading(true);
    try {
      const html = await fetchPageContent(card.url);
      setCacheEntry(card.id, html);
      hapticSuccess();
      Alert.alert('完了', 'コンテンツをダウンロードしました');
    } catch {
      Alert.alert('エラー', 'コンテンツのダウンロードに失敗しました');
    } finally {
      setIsDownloading(false);
    }
  }, [card.id, card.url, setCacheEntry]);

  const handleDeleteCache = useCallback(() => {
    Alert.alert('キャッシュを削除', 'ダウンロード済みコンテンツを削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => {
          clearCacheEntry(card.id);
          setShowCachedContent(false);
          hapticLight();
        },
      },
    ]);
  }, [card.id, clearCacheEntry]);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.groupBackground }]}>
      {/* Hero thumbnail */}
      {card.thumbnail ? (
        <View style={[styles.heroWrap, { backgroundColor: colors.card }]}>
          <Image source={{ uri: card.thumbnail }} style={styles.heroImage} resizeMode="contain" />
        </View>
      ) : card.favicon ? (
        <View style={[styles.heroWrap, styles.heroPlaceholder, { backgroundColor: colors.card }]}>
          <Image source={{ uri: card.favicon }} style={styles.heroFavicon} resizeMode="contain" />
        </View>
      ) : (
        <View style={[styles.heroWrap, styles.heroPlaceholder, { backgroundColor: colors.card }]}>
          <ThemedText style={styles.heroEmoji}>🔗</ThemedText>
        </View>
      )}

      <View style={styles.content}>
        {/* Title */}
        <Pressable
          onPress={() => { setEditTitle(card.title); setIsEditingTitle(true); }}
          style={({ pressed }) => [pressed && { opacity: 0.7 }]}
        >
          {isEditingTitle ? (
            <TextInput
              style={[styles.titleInput, { backgroundColor: colors.card, color: colors.text }]}
              value={editTitle}
              onChangeText={setEditTitle}
              autoFocus
              onBlur={handleSaveTitle}
              onSubmitEditing={handleSaveTitle}
            />
          ) : (
            <ThemedText style={[styles.title, { color: colors.text }]}>
              {card.title || 'タイトルなし'}
            </ThemedText>
          )}
        </Pressable>

        {/* URL */}
        {card.url && (
          <View style={[styles.groupCard, { backgroundColor: colors.card }]}>
            <ThemedText style={[styles.urlText, { color: colors.tint }]} numberOfLines={2}>
              {card.url}
            </ThemedText>
            <View style={[styles.separator, { backgroundColor: colors.separator }]} />
            <View style={styles.urlActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.urlBtn,
                  { backgroundColor: colors.tint },
                  pressed && styles.pressedOpacity,
                ]}
                onPress={handlePreviewUrl}
              >
                <ThemedText style={styles.urlBtnText}>プレビュー</ThemedText>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.urlBtn,
                  { backgroundColor: colors.groupBackground },
                  pressed && styles.pressedOpacity,
                ]}
                onPress={handleOpenUrl}
              >
                <ThemedText style={[styles.urlBtnTextSecondary, { color: colors.tint }]}>
                  ブラウザで開く
                </ThemedText>
              </Pressable>
            </View>

            {/* Offline content */}
            <View style={[styles.separator, { backgroundColor: colors.separator }]} />
            <View style={styles.offlineRow}>
              {cacheEntry ? (
                <>
                  <ThemedText style={[styles.dlBadgeLabel, { color: StatusColors.decided }]}>
                    DL済 ({new Date(cacheEntry.cachedAt).toLocaleDateString('ja-JP')})
                  </ThemedText>
                  <View style={styles.offlineActions}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.offlineBtn,
                        { backgroundColor: colors.tint },
                        pressed && styles.pressedOpacity,
                      ]}
                      onPress={() => setShowCachedContent(!showCachedContent)}
                    >
                      <ThemedText style={styles.offlineBtnText}>
                        {showCachedContent ? '閉じる' : 'オフライン表示'}
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.offlineBtn,
                        { backgroundColor: colors.groupBackground },
                        pressed && styles.pressedOpacity,
                      ]}
                      onPress={handleDownloadContent}
                      disabled={isDownloading}
                    >
                      {isDownloading ? (
                        <ActivityIndicator size="small" color={colors.textSecondary} />
                      ) : (
                        <ThemedText style={[styles.offlineBtnTextSec, { color: colors.text }]}>再取得</ThemedText>
                      )}
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.offlineBtn,
                        { backgroundColor: colors.groupBackground },
                        pressed && styles.pressedOpacity,
                      ]}
                      onPress={handleDeleteCache}
                    >
                      <ThemedText style={[styles.offlineBtnTextSec, { color: StatusColors.rejected }]}>削除</ThemedText>
                    </Pressable>
                  </View>
                  {showCachedContent && (
                    <View style={[styles.webviewWrap, { borderColor: colors.separator }]}>
                      <WebView
                        source={{ html: wrapWithBase(cacheEntry.html, card.url!) }}
                        style={styles.webview}
                        scrollEnabled={false}
                        nestedScrollEnabled
                      />
                    </View>
                  )}
                </>
              ) : (
                <Pressable
                  style={({ pressed }) => [
                    styles.downloadBtn,
                    { backgroundColor: colors.groupBackground },
                    pressed && styles.pressedOpacity,
                  ]}
                  onPress={handleDownloadContent}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <View style={styles.downloadingRow}>
                      <ActivityIndicator size="small" color={colors.tint} />
                      <ThemedText style={[styles.downloadingText, { color: colors.textSecondary }]}>
                        ダウンロード中...
                      </ThemedText>
                    </View>
                  ) : (
                    <ThemedText style={[styles.downloadBtnText, { color: colors.textSecondary }]}>
                      オフライン用にダウンロード
                    </ThemedText>
                  )}
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* Collection picker */}
        <ThemedText style={[styles.sectionLabel, { color: colors.textSecondary }]}>コレクション</ThemedText>
        <Pressable
          style={({ pressed }) => [
            styles.groupCard,
            { backgroundColor: colors.card },
            pressed && styles.pressedOpacity,
          ]}
          onPress={() => setShowCollectionPicker(!showCollectionPicker)}
        >
          <View style={styles.collectionRow}>
            <ThemedText style={[styles.collectionRowText, { color: colors.text }]}>
              {currentCollection
                ? `${currentCollection.icon} ${currentCollection.name}`
                : `${UNCATEGORIZED_ICON} ${UNCATEGORIZED_LABEL}`}
            </ThemedText>
            <ThemedText style={[styles.chevron, { color: colors.textSecondary }]}>
              {showCollectionPicker ? '⌃' : '⌄'}
            </ThemedText>
          </View>
        </Pressable>
        {showCollectionPicker && (
          <View style={[styles.collectionPickerCard, { backgroundColor: colors.card }]}>
            <Pressable
              style={[
                styles.collectionOption,
                card.collectionId === UNCATEGORIZED_ID && { backgroundColor: colors.tint + '18' },
              ]}
              onPress={() => handleCollectionChange(UNCATEGORIZED_ID)}
            >
              <ThemedText style={[styles.collectionOptionText, { color: card.collectionId === UNCATEGORIZED_ID ? colors.tint : colors.text }]}>
                {UNCATEGORIZED_ICON} {UNCATEGORIZED_LABEL}
              </ThemedText>
            </Pressable>
            {collections.map((collection, i) => (
              <View key={collection.id}>
                <View style={[styles.thinSeparator, { backgroundColor: colors.separator, marginLeft: Spacing.screenHorizontal }]} />
                <Pressable
                  style={[
                    styles.collectionOption,
                    card.collectionId === collection.id && { backgroundColor: colors.tint + '18' },
                  ]}
                  onPress={() => handleCollectionChange(collection.id)}
                >
                  <ThemedText style={[styles.collectionOptionText, { color: card.collectionId === collection.id ? colors.tint : colors.text }]}>
                    {collection.icon} {collection.name}
                  </ThemedText>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Status – iOS Segmented Control */}
        <ThemedText style={[styles.sectionLabel, { color: colors.textSecondary }]}>ステータス</ThemedText>
        <View style={[styles.groupCard, styles.segmentGroupCard, { backgroundColor: colors.card }]}>
          <View style={[styles.segmentControl, { backgroundColor: colors.groupBackground }]}>
            {(['thinking', 'decided', 'rejected'] as CardStatus[]).map((status) => (
              <Pressable
                key={status}
                style={[
                  styles.segmentBtn,
                  card.status === status && {
                    backgroundColor: STATUS_CONFIG[status].color,
                  },
                  card.status === status && styles.segmentBtnActive,
                ]}
                onPress={() => handleStatusChange(status)}
              >
                <ThemedText
                  style={[
                    styles.segmentBtnText,
                    {
                      color: card.status === status ? '#fff' : colors.text,
                      fontWeight: card.status === status ? '600' : '400',
                    },
                  ]}
                >
                  {STATUS_CONFIG[status].label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Priority – iOS Segmented Control */}
        <ThemedText style={[styles.sectionLabel, { color: colors.textSecondary }]}>優先度</ThemedText>
        <View style={[styles.groupCard, styles.segmentGroupCard, { backgroundColor: colors.card }]}>
          <View style={[styles.segmentControl, { backgroundColor: colors.groupBackground }]}>
            {([1, 2, 3] as CardPriority[]).map((p) => (
              <Pressable
                key={p}
                style={[
                  styles.segmentBtn,
                  card.priority === p && { backgroundColor: colors.tint },
                  card.priority === p && styles.segmentBtnActive,
                ]}
                onPress={() => handlePriorityChange(p)}
              >
                <ThemedText
                  style={[
                    styles.segmentBtnText,
                    {
                      color: card.priority === p ? '#fff' : colors.text,
                      fontWeight: card.priority === p ? '600' : '400',
                    },
                  ]}
                >
                  {PRIORITY_LABELS[p]}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Labels */}
        <ThemedText style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          ラベル {card.labels.length > 0 && `(${card.labels.length})`}
        </ThemedText>
        <View style={[styles.groupCard, { backgroundColor: colors.card }]}>
          {card.labels.length > 0 && (
            <View style={styles.labelsWrap}>
              {card.labels.map((label) => (
                <Pressable
                  key={label}
                  style={[styles.labelTag, { backgroundColor: colors.tint + '18', borderColor: colors.tint + '40' }]}
                  onPress={() => handleRemoveLabel(label)}
                >
                  <ThemedText style={[styles.labelTagText, { color: colors.tint }]}>{label}</ThemedText>
                  <ThemedText style={[styles.labelTagRemove, { color: colors.tint }]}>×</ThemedText>
                </Pressable>
              ))}
            </View>
          )}
          <View style={[card.labels.length > 0 && styles.thinSeparator, card.labels.length > 0 && { backgroundColor: colors.separator }]} />
          <View style={styles.addLabelRow}>
            <TextInput
              style={[styles.addLabelInput, { color: colors.text }]}
              value={newLabel}
              onChangeText={setNewLabel}
              placeholder="新しいラベルを追加..."
              placeholderTextColor={colors.textSecondary}
              onSubmitEditing={handleAddLabel}
              onFocus={() => setShowLabelSuggestions(true)}
              onBlur={() => setTimeout(() => setShowLabelSuggestions(false), 200)}
              returnKeyType="done"
            />
            {newLabel.trim() && (
              <Pressable
                style={[styles.addLabelButton, { backgroundColor: colors.tint }]}
                onPress={handleAddLabel}
              >
                <ThemedText style={styles.addLabelButtonText}>+</ThemedText>
              </Pressable>
            )}
          </View>
          {showLabelSuggestions && labelSuggestions.length > 0 && (
            <View style={[styles.suggestionsWrap, { borderTopColor: colors.separator }]}>
              <ThemedText style={[styles.suggestionsTitle, { color: colors.textSecondary }]}>既存のラベル</ThemedText>
              <View style={styles.suggestionsRow}>
                {labelSuggestions.map((label) => (
                  <Pressable
                    key={label}
                    style={[styles.suggestionChip, { borderColor: colors.tint }]}
                    onPress={() => {
                      if (!card.labels.includes(label)) {
                        updateCard(card.id, { labels: [...card.labels, label] });
                        hapticLight();
                      }
                      setShowLabelSuggestions(false);
                    }}
                  >
                    <ThemedText style={[styles.suggestionChipText, { color: colors.tint }]}>
                      + {label}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Memo */}
        <ThemedText style={[styles.sectionLabel, { color: colors.textSecondary }]}>メモ</ThemedText>
        <Pressable
          onPress={() => { setEditMemo(card.memo); setIsEditingMemo(true); }}
          style={({ pressed }) => [pressed && { opacity: 0.7 }]}
        >
          {isEditingMemo ? (
            <TextInput
              style={[styles.memoInput, { backgroundColor: colors.card, color: colors.text }]}
              value={editMemo}
              onChangeText={setEditMemo}
              multiline
              autoFocus
              onBlur={handleSaveMemo}
              placeholder="メモを入力..."
              placeholderTextColor={colors.textSecondary}
            />
          ) : (
            <View style={[styles.groupCard, styles.memoCard, { backgroundColor: colors.card }]}>
              <ThemedText style={[styles.memoText, { color: card.memo ? colors.text : colors.textSecondary }]}>
                {card.memo || 'タップしてメモを追加...'}
              </ThemedText>
            </View>
          )}
        </Pressable>

        {/* Checklist */}
        <ThemedText style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          チェックリスト {card.checklist.length > 0 && `(${card.checklist.filter((i) => i.checked).length}/${card.checklist.length})`}
        </ThemedText>
        <View style={[styles.groupCard, { backgroundColor: colors.card }]}>
          {card.checklist.map((item, i) => (
            <View key={item.id}>
              {i > 0 && (
                <View style={[styles.thinSeparator, { backgroundColor: colors.separator, marginLeft: 44 }]} />
              )}
              <View style={styles.checklistRow}>
                <Pressable
                  onPress={() => {
                    useCardStore.getState().toggleChecklistItem(card.id, item.id);
                    hapticLight();
                  }}
                  style={styles.checkboxBtn}
                >
                  <View style={[
                    styles.checkbox,
                    { borderColor: item.checked ? colors.tint : colors.border },
                    item.checked && { backgroundColor: colors.tint },
                  ]}>
                    {item.checked && (
                      <ThemedText style={styles.checkmark}>✓</ThemedText>
                    )}
                  </View>
                </Pressable>

                {editingChecklistId === item.id ? (
                  <TextInput
                    style={[styles.checklistInput, { color: colors.text }]}
                    value={editingChecklistText}
                    onChangeText={setEditingChecklistText}
                    autoFocus
                    onBlur={handleSaveChecklistItem}
                    onSubmitEditing={handleSaveChecklistItem}
                  />
                ) : (
                  <Pressable
                    style={styles.checklistTextWrap}
                    onPress={() => handleEditChecklistItem(item.id, item.text)}
                    onLongPress={() => handleDeleteChecklistItem(item.id)}
                    delayLongPress={500}
                  >
                    <ThemedText
                      style={[
                        styles.checklistText,
                        { color: colors.text },
                        item.checked && styles.checklistTextDone,
                      ]}
                    >
                      {item.text}
                    </ThemedText>
                  </Pressable>
                )}
              </View>
            </View>
          ))}

          {card.checklist.length > 0 && (
            <View style={[styles.thinSeparator, { backgroundColor: colors.separator, marginLeft: 44 }]} />
          )}

          {/* Add item row */}
          <View style={styles.addChecklistRow}>
            <View style={[styles.addChecklistPlus, { backgroundColor: colors.tint }]}>
              <ThemedText style={styles.addChecklistPlusText}>+</ThemedText>
            </View>
            <TextInput
              style={[styles.addChecklistInput, { color: colors.text }]}
              value={newChecklistItem}
              onChangeText={setNewChecklistItem}
              placeholder="新しい項目を追加..."
              placeholderTextColor={colors.textSecondary}
              onSubmitEditing={handleAddChecklistItem}
              returnKeyType="done"
            />
          </View>
        </View>

        {/* Images */}
        <ThemedText style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          画像 {card.images.length > 0 && `(${card.images.length})`}
        </ThemedText>
        <View style={[styles.groupCard, { backgroundColor: colors.card }]}>
          {card.images.length > 0 && (
            <View style={styles.imageGrid}>
              {card.images.map((uri, index) => (
                <Pressable
                  key={`${uri}-${index}`}
                  style={styles.imageTile}
                  onLongPress={() => handleRemoveImage(index)}
                  delayLongPress={500}
                >
                  <Image source={{ uri }} style={styles.imageTileImg} resizeMode="cover" />
                </Pressable>
              ))}
            </View>
          )}
          {card.images.length > 0 && (
            <View style={[styles.thinSeparator, { backgroundColor: colors.separator }]} />
          )}
          <Pressable
            style={({ pressed }) => [styles.addImageBtn, pressed && { opacity: 0.6 }]}
            onPress={handleAddImages}
          >
            <ThemedText style={[styles.addImageBtnText, { color: colors.tint }]}>+ 画像を追加</ThemedText>
          </Pressable>
        </View>

        {/* Delete */}
        <Pressable
          style={({ pressed }) => [styles.deleteBtn, pressed && styles.pressedOpacity]}
          onPress={handleDelete}
        >
          <ThemedText style={[styles.deleteBtnText, { color: StatusColors.rejected }]}>
            カードを削除
          </ThemedText>
        </Pressable>
      </View>

      <AdBanner />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Hero thumbnail
  heroWrap: {
    width: '100%',
    aspectRatio: 4 / 3,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroPlaceholder: {},
  heroImage: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  heroFavicon: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  heroEmoji: {
    fontSize: 64,
    lineHeight: 78,
  },

  content: {
    padding: Spacing.screenHorizontal,
    paddingBottom: 32,
  },

  // Title
  title: {
    ...Typography.title1,
    marginBottom: 16,
  },
  titleInput: {
    ...Typography.title1,
    padding: 10,
    borderRadius: Spacing.buttonRadiusSm,
    marginBottom: 16,
  },

  // Section label
  sectionLabel: {
    fontSize: Typography.footnote.fontSize,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 6,
  },

  // Grouped card
  groupCard: {
    borderRadius: Spacing.groupRadius,
    overflow: 'hidden',
  },
  segmentGroupCard: {
    padding: 6,
  },

  // Separator
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.screenHorizontal,
  },
  thinSeparator: {
    height: StyleSheet.hairlineWidth,
  },

  // URL section
  urlText: {
    ...Typography.footnote,
    padding: Spacing.screenHorizontal,
    paddingBottom: 12,
  },
  urlActions: {
    flexDirection: 'row',
    padding: Spacing.screenHorizontal,
    gap: 8,
  },
  urlBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Spacing.buttonRadiusSm,
  },
  urlBtnText: {
    color: '#fff',
    ...Typography.subhead,
    fontWeight: '500',
  },
  urlBtnTextSecondary: {
    ...Typography.subhead,
    fontWeight: '500',
  },

  // Offline
  offlineRow: {
    padding: Spacing.screenHorizontal,
    gap: 8,
  },
  dlBadgeLabel: {
    ...Typography.footnote,
    fontWeight: '600',
  },
  offlineActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  offlineBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Spacing.buttonRadiusSm,
    minWidth: 68,
    alignItems: 'center',
  },
  offlineBtnText: {
    color: '#fff',
    ...Typography.footnote,
    fontWeight: '500',
  },
  offlineBtnTextSec: {
    ...Typography.footnote,
    fontWeight: '500',
  },
  webviewWrap: {
    marginTop: 10,
    height: 400,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  webview: {
    flex: 1,
  },
  downloadBtn: {
    paddingVertical: 12,
    paddingHorizontal: Spacing.screenHorizontal,
    borderRadius: Spacing.buttonRadiusSm,
    alignItems: 'center',
  },
  downloadBtnText: {
    ...Typography.subhead,
  },
  downloadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  downloadingText: {
    ...Typography.subhead,
  },

  // Collection picker
  collectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.screenHorizontal,
    paddingVertical: 13,
  },
  collectionRowText: {
    flex: 1,
    ...Typography.body,
  },
  chevron: {
    fontSize: 16,
    marginLeft: 8,
  },
  collectionPickerCard: {
    borderRadius: Spacing.groupRadius,
    overflow: 'hidden',
    marginTop: 6,
  },
  collectionOption: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: 12,
  },
  collectionOptionText: {
    ...Typography.body,
  },

  // Segmented control
  segmentControl: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 7,
    alignItems: 'center',
  },
  segmentBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentBtnText: {
    ...Typography.subhead,
  },

  // Labels
  labelsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: Spacing.screenHorizontal,
    paddingBottom: 12,
  },
  labelTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  labelTagText: {
    ...Typography.footnote,
    fontWeight: '500',
  },
  labelTagRemove: {
    fontSize: 14,
    opacity: 0.7,
  },
  addLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenHorizontal,
  },
  addLabelInput: {
    flex: 1,
    ...Typography.body,
    paddingVertical: 12,
  },
  addLabelButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addLabelButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '400',
  },
  suggestionsWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: Spacing.screenHorizontal,
  },
  suggestionsTitle: {
    ...Typography.caption,
    marginBottom: 8,
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  suggestionChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  suggestionChipText: {
    ...Typography.footnote,
    fontWeight: '500',
  },

  // Memo
  memoCard: {
    minHeight: 80,
  },
  memoInput: {
    padding: Spacing.screenHorizontal,
    borderRadius: Spacing.groupRadius,
    minHeight: 100,
    ...Typography.body,
    textAlignVertical: 'top',
  },
  memoText: {
    ...Typography.body,
    lineHeight: 24,
    padding: Spacing.screenHorizontal,
    paddingVertical: 13,
  },

  // Checklist
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: 11,
    minHeight: 44,
  },
  checkboxBtn: {
    padding: 4,
    marginRight: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  checklistTextWrap: {
    flex: 1,
    paddingVertical: 2,
  },
  checklistText: {
    ...Typography.body,
  },
  checklistTextDone: {
    textDecorationLine: 'line-through',
    opacity: 0.45,
  },
  checklistInput: {
    flex: 1,
    ...Typography.body,
    padding: 4,
  },
  addChecklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: 11,
    minHeight: 44,
  },
  addChecklistPlus: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  addChecklistPlusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 18,
  },
  addChecklistInput: {
    flex: 1,
    ...Typography.body,
  },

  // Images
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    padding: 4,
  },
  imageTile: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 6,
    overflow: 'hidden',
  },
  imageTileImg: {
    width: '100%',
    height: '100%',
  },
  addImageBtn: {
    padding: Spacing.screenHorizontal,
    paddingVertical: 13,
    alignItems: 'center',
  },
  addImageBtnText: {
    ...Typography.body,
    fontWeight: '500',
  },

  // Delete
  deleteBtn: {
    paddingVertical: 15,
    marginTop: 28,
    alignItems: 'center',
  },
  deleteBtnText: {
    ...Typography.body,
    fontWeight: '500',
  },

  pressedOpacity: {
    opacity: 0.7,
  },
});
