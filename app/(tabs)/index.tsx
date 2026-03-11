import {
  StyleSheet,
  ScrollView,
  Pressable,
  View,
  Image,
  Animated,
  Dimensions,
  Modal,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { useState, useMemo, useCallback, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCollectionStore, useCardStore, useAppStore, useCacheStore } from '@/store';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { hapticLight, hapticWarning } from '@/utils/haptics';
import { UNCATEGORIZED_ID, UNCATEGORIZED_ICON, UNCATEGORIZED_LABEL } from '@/constants/collections';
import AdBanner from '@/components/ad-banner';
import type { Card, Collection } from '@/types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DRAWER_WIDTH = SCREEN_WIDTH * 0.75;
const GRID_PADDING = Spacing.screenHorizontal;
const GRID_GAP = 8;
const GRID2_CARD_WIDTH = Math.floor((SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP) / 2);

// List thumbnail dimensions per iOS HIG (72 pt)
const LIST_THUMB_SIZE = 72;
const LIST_THUMB_RADIUS = 8;

type ViewMode = 'grid1' | 'grid2' | 'list';

const VIEW_MODE_ICONS: Record<ViewMode, string> = {
  grid1: '▤',
  grid2: '⊞',
  list: '≡',
};

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  const selectedCollectionId = useAppStore((state) => state.selectedCollectionId);
  const setSelectedCollectionId = useAppStore((state) => state.setSelectedCollectionId);

  const collections = useCollectionStore((state) => state.collections);
  const allCards = useCardStore((state) => state.cards);
  const deleteCard = useCardStore((state) => state.deleteCard);
  const cacheEntries = useCacheStore((state) => state.entries);

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid1');
  const [labelFilters, setLabelFilters] = useState<Set<string>>(new Set());
  const [labelModalVisible, setLabelModalVisible] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  // Collect all labels from visible cards
  const availableLabels = useMemo(() => {
    const base = selectedCollectionId
      ? allCards.filter((c) => c.collectionId === selectedCollectionId)
      : allCards;
    const labels = new Set<string>();
    base.forEach((c) => c.labels.forEach((l) => labels.add(l)));
    return Array.from(labels).sort();
  }, [allCards, selectedCollectionId]);

  const toggleLabelFilter = useCallback((label: string) => {
    setLabelFilters((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
    hapticLight();
  }, []);

  // Filter cards by selected collection + labels
  const filteredCards = useMemo(() => {
    let cards: typeof allCards;
    if (!selectedCollectionId) {
      cards = allCards;
    } else {
      cards = allCards.filter((c) => c.collectionId === selectedCollectionId);
    }
    if (labelFilters.size > 0) {
      cards = cards.filter((c) => [...labelFilters].every((l) => c.labels.includes(l)));
    }
    return [...cards].sort((a, b) => b.createdAt - a.createdAt);
  }, [allCards, selectedCollectionId, labelFilters]);

  const selectedCollection = useMemo(() => {
    if (!selectedCollectionId) return null;
    if (selectedCollectionId === UNCATEGORIZED_ID) {
      return { icon: UNCATEGORIZED_ICON, name: UNCATEGORIZED_LABEL } as Collection;
    }
    return collections.find((c) => c.id === selectedCollectionId) ?? null;
  }, [collections, selectedCollectionId]);

  const sortedCollections = useMemo(() => {
    const sorted = [...collections].sort((a, b) => a.order - b.order);
    const result: (Collection & { depth: number })[] = [];
    const addChildren = (parentId: string | null, depth: number) => {
      sorted
        .filter((c) => (c.parentId ?? null) === parentId)
        .forEach((c) => {
          result.push({ ...c, depth });
          addChildren(c.id, depth + 1);
        });
    };
    addChildren(null, 0);
    return result;
  }, [collections]);

  const getCardCount = useCallback(
    (collectionId: string | null) => {
      if (!collectionId) return allCards.length;
      return allCards.filter((c) => c.collectionId === collectionId).length;
    },
    [allCards]
  );

  const uncategorizedCount = useMemo(
    () => allCards.filter((c) => c.collectionId === UNCATEGORIZED_ID).length,
    [allCards]
  );

  const openDrawer = useCallback(() => {
    setDrawerVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const closeDrawer = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: -DRAWER_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setDrawerVisible(false);
    });
  }, [slideAnim]);

  const handleSelectCollection = useCallback(
    (id: string | null) => {
      setSelectedCollectionId(id);
      setLabelFilters(new Set());
      hapticLight();
      closeDrawer();
    },
    [setSelectedCollectionId, closeDrawer]
  );

  const getCollectionForCard = useCallback(
    (collectionId: string) => collections.find((c) => c.id === collectionId),
    [collections]
  );

  const toggleSelectCard = useCallback((cardId: string) => {
    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  }, []);

  const exitSelectMode = useCallback(() => {
    setIsSelectMode(false);
    setSelectedCardIds(new Set());
  }, []);

  const handleBulkDelete = useCallback(() => {
    if (selectedCardIds.size === 0) return;
    Alert.alert(
      '削除確認',
      `${selectedCardIds.size}件のカードを削除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除する',
          style: 'destructive',
          onPress: () => {
            selectedCardIds.forEach((id) => deleteCard(id));
            hapticWarning();
            exitSelectMode();
          },
        },
      ]
    );
  }, [selectedCardIds, deleteCard, exitSelectMode]);

  const handleCardLongPress = useCallback(
    (card: Card) => {
      hapticLight();
      if (!isSelectMode) {
        setIsSelectMode(true);
        setSelectedCardIds(new Set([card.id]));
      }
    },
    [isSelectMode]
  );

  // --- Card renderers ---

  const renderCard = (item: Card) => {
    const collection = getCollectionForCard(item.collectionId);
    const isSelected = selectedCardIds.has(item.id);
    const cardContent = (
        <Pressable
          style={({ pressed }) => [
            styles.card,
            { backgroundColor: colors.card },
            isSelectMode && isSelected && { borderColor: colors.tint, borderWidth: 2 },
            pressed && styles.pressedOpacity,
          ]}
          onPress={isSelectMode ? () => toggleSelectCard(item.id) : undefined}
          onLongPress={() => handleCardLongPress(item)}
          delayLongPress={500}
        >
          {isSelectMode && (
            <View style={[styles.selectBadge, { backgroundColor: isSelected ? colors.tint : colors.border }]}>
              {isSelected && <ThemedText style={styles.selectBadgeCheck}>✓</ThemedText>}
            </View>
          )}
          {item.thumbnail ? (
            <View style={[styles.cardThumbnailWrap, { backgroundColor: colors.groupBackground }]}>
              <Image source={{ uri: item.thumbnail }} style={styles.cardThumbnail} resizeMode="cover" />
            </View>
          ) : item.favicon ? (
            <View style={[styles.cardThumbnailWrap, { backgroundColor: colors.groupBackground }]}>
              <Image source={{ uri: item.favicon }} style={styles.faviconIcon} resizeMode="contain" />
            </View>
          ) : (
            <View style={[styles.cardThumbnailWrap, { backgroundColor: colors.groupBackground }]}>
              <ThemedText style={styles.placeholderEmoji}>{collection?.icon ?? '🔗'}</ThemedText>
            </View>
          )}
          <View style={styles.cardBody}>
            <ThemedText style={styles.cardTitle} numberOfLines={2}>
              {item.title || 'タイトルなし'}
            </ThemedText>
            <View style={styles.cardMeta}>
{cacheEntries[item.id] && (
                <View style={styles.dlBadge}>
                  <ThemedText style={styles.dlBadgeText}>DL</ThemedText>
                </View>
              )}
            </View>
            {!selectedCollectionId && (
              <ThemedText style={[styles.collectionLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.collectionId === UNCATEGORIZED_ID
                  ? `${UNCATEGORIZED_ICON} ${UNCATEGORIZED_LABEL}`
                  : collection
                  ? `${collection.icon} ${collection.name}`
                  : `${UNCATEGORIZED_ICON} ${UNCATEGORIZED_LABEL}`}
              </ThemedText>
            )}
          </View>
        </Pressable>
    );
    if (isSelectMode) return <View key={item.id}>{cardContent}</View>;
    return <Link key={item.id} href={`/card/${item.id}`} asChild>{cardContent}</Link>;
  };

  const renderGrid2Card = (item: Card) => {
    const collection = getCollectionForCard(item.collectionId);
    return (
      <View key={item.id} style={{ width: GRID2_CARD_WIDTH }}>
        {isSelectMode ? (
          <Pressable
            style={({ pressed }) => [
              styles.grid2Card,
              { backgroundColor: colors.card },
              selectedCardIds.has(item.id) && { borderColor: colors.tint, borderWidth: 2 },
              pressed && styles.pressedOpacity,
            ]}
            onPress={() => toggleSelectCard(item.id)}
            onLongPress={() => handleCardLongPress(item)}
            delayLongPress={500}
          >
            <View style={[styles.selectBadgeSmall, { backgroundColor: selectedCardIds.has(item.id) ? colors.tint : colors.border }]}>
              {selectedCardIds.has(item.id) && <ThemedText style={styles.selectBadgeCheckSmall}>✓</ThemedText>}
            </View>
            {item.thumbnail ? (
              <View style={[styles.grid2Thumb, { backgroundColor: colors.groupBackground }]}>
                <Image source={{ uri: item.thumbnail }} style={styles.grid2ThumbImg} resizeMode="cover" />
              </View>
            ) : item.favicon ? (
              <View style={[styles.grid2Thumb, { backgroundColor: colors.groupBackground }]}>
                <Image source={{ uri: item.favicon }} style={styles.faviconIconSmall} resizeMode="contain" />
              </View>
            ) : (
              <View style={[styles.grid2Thumb, { backgroundColor: colors.groupBackground }]}>
                <ThemedText style={styles.grid2PlaceholderEmoji}>{collection?.icon ?? '🔗'}</ThemedText>
              </View>
            )}
            <View style={styles.grid2Body}>
              <ThemedText style={styles.grid2Title} numberOfLines={2}>
                {item.title || 'タイトルなし'}
              </ThemedText>
              <View style={styles.cardMeta}>
{cacheEntries[item.id] && (
                  <View style={styles.dlBadge}>
                    <ThemedText style={styles.dlBadgeText}>DL</ThemedText>
                  </View>
                )}
              </View>
              {!selectedCollectionId && (
                <ThemedText style={[styles.collectionLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.collectionId === UNCATEGORIZED_ID
                    ? `${UNCATEGORIZED_ICON} ${UNCATEGORIZED_LABEL}`
                    : collection
                    ? `${collection.icon} ${collection.name}`
                    : `${UNCATEGORIZED_ICON} ${UNCATEGORIZED_LABEL}`}
                </ThemedText>
              )}
            </View>
          </Pressable>
        ) : (
        <Link href={`/card/${item.id}`} asChild>
          <Pressable
            style={({ pressed }) => [
              styles.grid2Card,
              { backgroundColor: colors.card },
              pressed && styles.pressedOpacity,
            ]}
            onLongPress={() => handleCardLongPress(item)}
            delayLongPress={500}
          >
            {item.thumbnail ? (
              <View style={[styles.grid2Thumb, { backgroundColor: colors.groupBackground }]}>
                <Image source={{ uri: item.thumbnail }} style={styles.grid2ThumbImg} resizeMode="cover" />
              </View>
            ) : item.favicon ? (
              <View style={[styles.grid2Thumb, { backgroundColor: colors.groupBackground }]}>
                <Image source={{ uri: item.favicon }} style={styles.faviconIconSmall} resizeMode="contain" />
              </View>
            ) : (
              <View style={[styles.grid2Thumb, { backgroundColor: colors.groupBackground }]}>
                <ThemedText style={styles.grid2PlaceholderEmoji}>{collection?.icon ?? '🔗'}</ThemedText>
              </View>
            )}
            <View style={styles.grid2Body}>
              <ThemedText style={styles.grid2Title} numberOfLines={2}>
                {item.title || 'タイトルなし'}
              </ThemedText>
              <View style={styles.cardMeta}>
{cacheEntries[item.id] && (
                  <View style={styles.dlBadge}>
                    <ThemedText style={styles.dlBadgeText}>DL</ThemedText>
                  </View>
                )}
              </View>
              {!selectedCollectionId && (
                <ThemedText style={[styles.collectionLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.collectionId === UNCATEGORIZED_ID
                    ? `${UNCATEGORIZED_ICON} ${UNCATEGORIZED_LABEL}`
                    : collection
                    ? `${collection.icon} ${collection.name}`
                    : `${UNCATEGORIZED_ICON} ${UNCATEGORIZED_LABEL}`}
                </ThemedText>
              )}
            </View>
          </Pressable>
        </Link>
        )}
      </View>
    );
  };

  const renderListCard = (item: Card) => {
    const collection = getCollectionForCard(item.collectionId);
    const isSelected = selectedCardIds.has(item.id);
    const cardContent = (
        <Pressable
          style={({ pressed }) => [
            styles.listCard,
            { backgroundColor: colors.card },
            isSelectMode && isSelected && { borderColor: colors.tint, borderWidth: 2 },
            pressed && styles.pressedOpacity,
          ]}
          onPress={isSelectMode ? () => toggleSelectCard(item.id) : undefined}
          onLongPress={() => handleCardLongPress(item)}
          delayLongPress={500}
        >
          <View style={styles.listCardInner}>
            {isSelectMode && (
              <View style={[styles.selectBadgeList, { backgroundColor: isSelected ? colors.tint : colors.border }]}>
                {isSelected && <ThemedText style={styles.selectBadgeCheckSmall}>✓</ThemedText>}
              </View>
            )}
            {item.thumbnail ? (
              <Image
                source={{ uri: item.thumbnail }}
                style={[styles.listThumb, { backgroundColor: colors.groupBackground }]}
                resizeMode="cover"
              />
            ) : item.favicon ? (
              <View style={[styles.listThumbPlaceholder, { backgroundColor: colors.groupBackground }]}>
                <Image source={{ uri: item.favicon }} style={styles.faviconIconSmall} resizeMode="contain" />
              </View>
            ) : (
              <View style={[styles.listThumbPlaceholder, { backgroundColor: colors.groupBackground }]}>
                <ThemedText style={styles.listPlaceholderEmoji}>{collection?.icon ?? '🔗'}</ThemedText>
              </View>
            )}
            <View style={styles.listBody}>
              <ThemedText style={styles.listTitle} numberOfLines={2}>
                {item.title || 'タイトルなし'}
              </ThemedText>
              <View style={styles.cardMeta}>
{cacheEntries[item.id] && (
                  <View style={styles.dlBadge}>
                    <ThemedText style={styles.dlBadgeText}>DL</ThemedText>
                  </View>
                )}
              </View>
              {!selectedCollectionId && (
                <ThemedText style={[styles.collectionLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.collectionId === UNCATEGORIZED_ID
                    ? `${UNCATEGORIZED_ICON} ${UNCATEGORIZED_LABEL}`
                    : collection
                    ? `${collection.icon} ${collection.name}`
                    : `${UNCATEGORIZED_ICON} ${UNCATEGORIZED_LABEL}`}
                </ThemedText>
              )}
            </View>
            {/* iOS-style disclosure chevron */}
            <ThemedText style={[styles.listChevron, { color: colors.textSecondary }]}>›</ThemedText>
          </View>
        </Pressable>
    );
    if (isSelectMode) return <View key={item.id}>{cardContent}</View>;
    return <Link key={item.id} href={`/card/${item.id}`} asChild>{cardContent}</Link>;
  };

  const renderEmptyState = () => (
    <ThemedView style={styles.emptyContainer}>
      <ThemedText style={styles.emptyIcon}>📝</ThemedText>
      <ThemedText style={[styles.emptyTitle, { color: colors.text }]}>
        {selectedCollectionId ? 'このコレクションにカードがありません' : 'カードがありません'}
      </ThemedText>
      <ThemedText style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        URLやスクリーンショットを{'\n'}保存してみましょう
      </ThemedText>
      <Pressable
        style={[styles.createButton, { backgroundColor: colors.tint }]}
        onPress={() => router.push('/save-modal')}
      >
        <ThemedText style={styles.createButtonText}>カードを追加</ThemedText>
      </Pressable>
    </ThemedView>
  );

  const renderDrawer = () => (
    <Modal
      visible={drawerVisible}
      transparent
      animationType="none"
      onRequestClose={closeDrawer}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Pressable style={styles.drawerBackdrop} onPress={closeDrawer}>
        <View />
      </Pressable>

      {/* Drawer panel */}
      <Animated.View
        style={[
          styles.drawerPanel,
          {
            backgroundColor: colors.groupBackground,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <View
          style={[
            styles.drawerHeader,
            { borderBottomColor: colors.separator, paddingTop: insets.top + 16 },
          ]}
        >
          <ThemedText style={[styles.drawerTitle, { color: colors.text }]}>コレクション</ThemedText>
          <Pressable
            style={[styles.drawerAddButton, { backgroundColor: colors.tint }]}
            onPress={() => {
              closeDrawer();
              router.push('/collection-modal');
            }}
          >
            <ThemedText style={styles.drawerAddButtonText}>+</ThemedText>
          </Pressable>
        </View>

        <ScrollView style={styles.drawerList}>
          {/* All cards */}
          <Pressable
            style={[
              styles.drawerItem,
              selectedCollectionId === null && { backgroundColor: colors.tint + '18' },
            ]}
            onPress={() => handleSelectCollection(null)}
          >
            <ThemedText style={styles.drawerItemIcon}>📋</ThemedText>
            <ThemedText
              style={[
                styles.drawerItemName,
                { color: colors.text },
                selectedCollectionId === null && { color: colors.tint, fontWeight: '700' },
              ]}
              numberOfLines={1}
            >
              すべて
            </ThemedText>
            <ThemedText style={[styles.drawerItemCount, { color: colors.textSecondary }]}>
              {getCardCount(null)}
            </ThemedText>
          </Pressable>

          <View style={[styles.drawerDivider, { backgroundColor: colors.separator }]} />

          {/* 未分類 */}
          <Pressable
            style={[
              styles.drawerItem,
              selectedCollectionId === UNCATEGORIZED_ID && { backgroundColor: colors.tint + '18' },
            ]}
            onPress={() => handleSelectCollection(UNCATEGORIZED_ID)}
          >
            <ThemedText style={styles.drawerItemIcon}>{UNCATEGORIZED_ICON}</ThemedText>
            <ThemedText
              style={[
                styles.drawerItemName,
                { color: colors.text },
                selectedCollectionId === UNCATEGORIZED_ID && { color: colors.tint, fontWeight: '700' },
              ]}
              numberOfLines={1}
            >
              {UNCATEGORIZED_LABEL}
            </ThemedText>
            <ThemedText style={[styles.drawerItemCount, { color: colors.textSecondary }]}>
              {uncategorizedCount}
            </ThemedText>
          </Pressable>

          {sortedCollections.length > 0 && (
            <View style={[styles.drawerDivider, { backgroundColor: colors.separator }]} />
          )}

          {/* Collection list */}
          {sortedCollections.map((item) => (
            <Pressable
              key={item.id}
              style={[
                styles.drawerItem,
                { paddingLeft: Spacing.screenHorizontal + item.depth * 20 },
                selectedCollectionId === item.id && { backgroundColor: colors.tint + '18' },
              ]}
              onPress={() => handleSelectCollection(item.id)}
            >
              <ThemedText style={styles.drawerItemIcon}>{item.icon}</ThemedText>
              <ThemedText
                style={[
                  styles.drawerItemName,
                  { color: colors.text },
                  selectedCollectionId === item.id && { color: colors.tint, fontWeight: '700' },
                ]}
                numberOfLines={1}
              >
                {item.name}
              </ThemedText>
              <ThemedText style={[styles.drawerItemCount, { color: colors.textSecondary }]}>
                {getCardCount(item.id)}
              </ThemedText>
            </Pressable>
          ))}

          {sortedCollections.length === 0 && (
            <View style={styles.drawerEmpty}>
              <ThemedText style={[styles.drawerEmptyText, { color: colors.textSecondary }]}>
                コレクションがありません
              </ThemedText>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </Modal>
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.groupBackground }]}>
      {/* Header bar – Large Title iOS style */}
      <View
        style={[
          styles.headerBar,
          {
            backgroundColor: colorScheme === 'dark'
              ? 'rgba(0,0,0,0.88)'
              : 'rgba(255,255,255,0.88)',
            borderBottomColor: colors.separator,
            paddingTop: insets.top + 8,
          },
        ]}
      >
        {/* Hamburger menu */}
        <Pressable
          style={({ pressed }) => [styles.hamburgerButton, pressed && styles.pressedOpacity]}
          onPress={openDrawer}
        >
          <ThemedText style={[styles.hamburgerIcon, { color: colors.tint }]}>☰</ThemedText>
        </Pressable>

        {/* Large Title */}
        <ThemedText style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {selectedCollection
            ? `${selectedCollection.icon} ${selectedCollection.name}`
            : 'すべて'}
        </ThemedText>

        {/* Segment control – view mode */}
        <View style={[styles.segmentControl, { backgroundColor: colors.groupBackground }]}>
          {(['grid1', 'grid2', 'list'] as ViewMode[]).map((mode) => (
            <Pressable
              key={mode}
              style={[
                styles.segmentButton,
                viewMode === mode && { backgroundColor: colors.card },
                viewMode === mode && styles.segmentButtonActive,
              ]}
              onPress={() => { setViewMode(mode); hapticLight(); }}
            >
              <ThemedText
                style={[
                  styles.segmentIcon,
                  { color: viewMode === mode ? colors.text : colors.textSecondary },
                ]}
              >
                {VIEW_MODE_ICONS[mode]}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {/* + Button */}
        <Pressable
          style={({ pressed }) => [styles.addButton, pressed && styles.pressedOpacity]}
          onPress={() => router.push('/save-modal')}
        >
          <ThemedText style={[styles.addButtonText, { color: colors.tint }]}>+</ThemedText>
        </Pressable>
      </View>

      {/* Label filter bar */}
      {availableLabels.length > 0 && (
        <View style={[styles.labelFilterBar, { borderBottomColor: colors.separator }]}>
          <Pressable
            style={({ pressed }) => [
              styles.labelFilterButton,
              { backgroundColor: labelFilters.size > 0 ? colors.tint : colors.card },
              pressed && styles.pressedOpacity,
            ]}
            onPress={() => setLabelModalVisible(true)}
          >
            <ThemedText
              style={[
                styles.labelFilterButtonText,
                { color: labelFilters.size > 0 ? '#fff' : colors.text },
              ]}
            >
              タグ絞り込み{labelFilters.size > 0 ? ` (${labelFilters.size})` : ''}
            </ThemedText>
          </Pressable>
          {labelFilters.size > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activeLabelsScroll}>
              {[...labelFilters].map((label) => (
                <View key={label} style={[styles.activeLabelChip, { backgroundColor: colors.tint + '18' }]}>
                  <ThemedText style={[styles.activeLabelText, { color: colors.tint }]}>{label}</ThemedText>
                  <Pressable onPress={() => toggleLabelFilter(label)} hitSlop={8}>
                    <ThemedText style={[styles.activeLabelRemove, { color: colors.tint }]}>✕</ThemedText>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* Label selection modal */}
      <Modal
        visible={labelModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLabelModalVisible(false)}
      >
        <View style={styles.labelModalOverlay}>
          <View style={[styles.labelModalContent, { backgroundColor: colors.groupBackground }]}>
            <View style={[styles.labelModalHeader, { borderBottomColor: colors.separator }]}>
              <ThemedText style={[styles.labelModalTitle, { color: colors.text }]}>
                タグで絞り込み
              </ThemedText>
              <Pressable onPress={() => setLabelModalVisible(false)}>
                <ThemedText style={[styles.labelModalDone, { color: colors.tint }]}>完了</ThemedText>
              </Pressable>
            </View>
            <ScrollView style={styles.labelModalList}>
              {availableLabels.map((label) => {
                const isActive = labelFilters.has(label);
                return (
                  <Pressable
                    key={label}
                    style={[styles.labelModalRow, { backgroundColor: colors.card }]}
                    onPress={() => toggleLabelFilter(label)}
                  >
                    <ThemedText style={[styles.labelModalLabel, { color: colors.text }]}>
                      {label}
                    </ThemedText>
                    <View
                      style={[
                        styles.labelModalCheck,
                        {
                          backgroundColor: isActive ? colors.tint : 'transparent',
                          borderColor: isActive ? colors.tint : colors.border,
                        },
                      ]}
                    >
                      {isActive && (
                        <ThemedText style={styles.labelModalCheckmark}>✓</ThemedText>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
            {labelFilters.size > 0 && (
              <Pressable
                style={[styles.labelModalClear, { borderTopColor: colors.separator }]}
                onPress={() => { setLabelFilters(new Set()); hapticLight(); }}
              >
                <ThemedText style={[styles.labelModalClearText, { color: colors.destructive }]}>
                  すべてクリア
                </ThemedText>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>

      {/* Select mode toolbar */}
      {isSelectMode && (
        <View style={[styles.selectToolbar, { backgroundColor: colors.card, borderBottomColor: colors.separator }]}>
          <Pressable onPress={exitSelectMode} style={styles.selectToolbarBtn}>
            <ThemedText style={[styles.selectToolbarBtnText, { color: colors.tint }]}>キャンセル</ThemedText>
          </Pressable>
          <ThemedText style={[styles.selectToolbarCount, { color: colors.text }]}>
            {selectedCardIds.size}件選択中
          </ThemedText>
          <Pressable
            onPress={handleBulkDelete}
            style={({ pressed }) => [styles.selectToolbarBtn, pressed && styles.pressedOpacity]}
            disabled={selectedCardIds.size === 0}
          >
            <ThemedText style={[styles.selectToolbarBtnText, { color: selectedCardIds.size > 0 ? colors.destructive : colors.textSecondary }]}>
              削除
            </ThemedText>
          </Pressable>
        </View>
      )}

      {/* Card feed */}
      <ScrollView contentContainerStyle={styles.feedContent}>
        {filteredCards.length === 0 ? (
          renderEmptyState()
        ) : viewMode === 'grid2' ? (
          <View style={styles.grid2Container}>
            {filteredCards.map(renderGrid2Card)}
          </View>
        ) : viewMode === 'list' ? (
          <View style={styles.listContainer}>
            {filteredCards.map(renderListCard)}
          </View>
        ) : (
          <View style={styles.cardList}>
            {filteredCards.map(renderCard)}
          </View>
        )}
      </ScrollView>

      <AdBanner />
      {renderDrawer()}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ---- Label filter bar ----
  labelFilterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  labelFilterButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    flexShrink: 0,
  },
  labelFilterButtonText: {
    ...Typography.footnote,
    fontWeight: '600',
  },
  activeLabelsScroll: {
    flexShrink: 1,
  },
  activeLabelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginRight: 6,
    gap: 4,
  },
  activeLabelText: {
    ...Typography.caption,
    fontWeight: '500',
  },
  activeLabelRemove: {
    fontSize: 10,
    fontWeight: '600',
  },

  // ---- Label selection modal ----
  labelModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  labelModalContent: {
    maxHeight: '70%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  labelModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  labelModalTitle: {
    ...Typography.headline,
  },
  labelModalDone: {
    ...Typography.body,
    fontWeight: '600',
  },
  labelModalList: {
    paddingVertical: 8,
  },
  labelModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: 13,
    marginHorizontal: Spacing.screenHorizontal,
    marginVertical: 2,
    borderRadius: 10,
  },
  labelModalLabel: {
    ...Typography.body,
    flex: 1,
  },
  labelModalCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelModalCheckmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  labelModalClear: {
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  labelModalClearText: {
    ...Typography.body,
    fontWeight: '500',
  },

  // ---- Header ----
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  hamburgerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  hamburgerIcon: {
    fontSize: 22,
  },
  headerTitle: {
    flex: 1,
    ...Typography.title2,
    marginHorizontal: 6,
  },
  addButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  addButtonText: {
    fontSize: 28,
    fontWeight: '300',
  },

  // Segment control (view mode)
  segmentControl: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
    marginRight: 2,
  },
  segmentButton: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },
  segmentButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentIcon: {
    fontSize: 14,
  },

  // ---- Feed ----
  feedContent: {
    padding: Spacing.screenHorizontal,
    paddingBottom: 24,
    flexGrow: 1,
  },
  cardList: {
    gap: 12,
  },

  // ---- Grid 1 card ----
  card: {
    borderRadius: Spacing.cardRadius,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardThumbnailWrap: {
    width: '100%',
    aspectRatio: 4 / 3,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardThumbnail: {
    width: '100%',
    height: '100%',
  },
  faviconIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  faviconIconSmall: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  placeholderEmoji: {
    fontSize: 40,
    lineHeight: 50,
  },
  cardBody: {
    padding: 14,
  },
  cardTitle: {
    fontSize: Typography.headline.fontSize,
    fontWeight: Typography.headline.fontWeight,
    lineHeight: Typography.headline.lineHeight,
    marginBottom: 6,
  },

  // ---- Grid 2 card ----
  grid2Container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  grid2Card: {
    borderRadius: Spacing.cardRadius,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  grid2Thumb: {
    width: '100%',
    aspectRatio: 4 / 3,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  grid2ThumbImg: {
    width: '100%',
    height: '100%',
  },
  grid2PlaceholderEmoji: {
    fontSize: 28,
    lineHeight: 36,
  },
  grid2Body: {
    padding: 10,
  },
  grid2Title: {
    fontSize: Typography.footnote.fontSize,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 4,
  },

  // ---- List card ----
  listContainer: {
    borderRadius: Spacing.groupRadius,
    overflow: 'hidden',
    gap: 0,
  },
  listCard: {
    // No individual radius — container clips
  },
  listCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: Spacing.cellVertical,
    minHeight: LIST_THUMB_SIZE + Spacing.cellVertical * 2,
  },
  listThumb: {
    width: LIST_THUMB_SIZE,
    height: LIST_THUMB_SIZE,
    borderRadius: LIST_THUMB_RADIUS,
    flexShrink: 0,
  },
  listThumbPlaceholder: {
    width: LIST_THUMB_SIZE,
    height: LIST_THUMB_SIZE,
    borderRadius: LIST_THUMB_RADIUS,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  listPlaceholderEmoji: {
    fontSize: 28,
    lineHeight: 36,
  },
  listBody: {
    flex: 1,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  listTitle: {
    fontSize: Typography.subhead.fontSize,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 4,
  },
  listChevron: {
    fontSize: 20,
    marginLeft: 4,
    opacity: 0.4,
  },

  // ---- Shared meta row ----
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  dlBadge: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  dlBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  collectionLabel: {
    fontSize: Typography.caption.fontSize,
    marginTop: 2,
  },

  // ---- Select mode ----
  selectToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  selectToolbarBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  selectToolbarBtnText: {
    ...Typography.body,
    fontWeight: '600',
  },
  selectToolbarCount: {
    ...Typography.headline,
  },
  selectBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  selectBadgeSmall: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  selectBadgeList: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  selectBadgeCheck: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  selectBadgeCheckSmall: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  // ---- Pressed state ----
  pressedOpacity: {
    opacity: 0.7,
  },

  // ---- Empty state ----
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    ...Typography.title2,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...Typography.subhead,
    textAlign: 'center',
    marginBottom: 28,
  },
  createButton: {
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: Spacing.buttonRadiusMd,
  },
  createButtonText: {
    color: '#fff',
    ...Typography.headline,
  },

  // ---- Drawer ----
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  drawerPanel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 10,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  drawerTitle: {
    ...Typography.title2,
  },
  drawerAddButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawerAddButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '400',
  },
  drawerList: {
    flex: 1,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: 13,
  },
  drawerItemIcon: {
    fontSize: 20,
    lineHeight: 26,
    marginRight: 12,
    width: 28,
    textAlign: 'center',
  },
  drawerItemName: {
    flex: 1,
    ...Typography.subhead,
    fontWeight: '500',
  },
  drawerItemCount: {
    ...Typography.footnote,
    marginLeft: 8,
  },
  drawerDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.screenHorizontal,
    marginVertical: 2,
  },
  drawerEmpty: {
    padding: 32,
    alignItems: 'center',
  },
  drawerEmptyText: {
    ...Typography.footnote,
  },
});
