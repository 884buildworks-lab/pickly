import {
  StyleSheet,
  ScrollView,
  Pressable,
  View,
  LayoutChangeEvent,
  Image,
  Alert,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, Link, router } from 'expo-router';
import { useState, useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCollectionStore, useCardStore, useCacheStore } from '@/store';
import { Colors, Typography, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { hapticWarning, hapticLight, hapticSuccess } from '@/utils/haptics';
import {
  findDuplicates,
  checkAllUrls,
  type UrlCheckResult,
  type DuplicateGroup,
} from '@/utils/url-checker';
import type { Card } from '@/types';
import AdBanner from '@/components/ad-banner';

type SortType = 'createdAt' | 'title';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'grid' | 'grid2' | 'list' | 'headline';

const HORIZONTAL_PADDING = Spacing.screenHorizontal;
const CARD_GAP = 8;

export default function CollectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [containerWidth, setContainerWidth] = useState(0);
  const [sortBy, setSortBy] = useState<SortType>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [labelFilters, setLabelFilters] = useState<Set<string>>(new Set());
  const [domainFilter, setDomainFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [showIssuesPanel, setShowIssuesPanel] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [brokenLinks, setBrokenLinks] = useState<UrlCheckResult[]>([]);
  const [isCheckingLinks, setIsCheckingLinks] = useState(false);
  const [checkProgress, setCheckProgress] = useState({ completed: 0, total: 0 });

  const cardWidth =
    containerWidth > 0
      ? Math.floor((containerWidth - HORIZONTAL_PADDING * 2 - CARD_GAP) / 2)
      : 150;

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  }, []);

  const collection = useCollectionStore((state) =>
    state.collections.find((c) => c.id === id)
  );
  const setLastUsedCollectionId = useCollectionStore(
    (state) => state.setLastUsedCollectionId
  );

  const allCards = useCardStore(
    useShallow((state) => state.cards.filter((c) => c.collectionId === id))
  );
  const cacheEntries = useCacheStore((state) => state.entries);

  const collectionLabels = useMemo(() => {
    const labels = new Set<string>();
    allCards.forEach((card) => { card.labels.forEach((l) => labels.add(l)); });
    return Array.from(labels).sort();
  }, [allCards]);

  const getDomain = (url: string | undefined): string | null => {
    if (!url) return null;
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace('www.', '');
    } catch {
      return null;
    }
  };

  const collectionDomains = useMemo(() => {
    const domains = new Map<string, number>();
    allCards.forEach((card) => {
      const domain = getDomain(card.url);
      if (domain) domains.set(domain, (domains.get(domain) || 0) + 1);
    });
    return Array.from(domains.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([domain]) => domain);
  }, [allCards]);

  const typeFilters = [
    { key: 'hasUrl',        label: 'URLあり',          filter: (c: Card) => !!c.url },
    { key: 'hasMemo',       label: 'メモあり',          filter: (c: Card) => !!c.memo },
    { key: 'hasImages',     label: '画像あり',          filter: (c: Card) => c.images.length > 0 },
    { key: 'hasLabels',     label: 'ラベルあり',        filter: (c: Card) => c.labels.length > 0 },
    { key: 'hasChecklist',  label: 'チェックリストあり', filter: (c: Card) => c.checklist.length > 0 },
    { key: 'hasCachedContent', label: 'DL済',          filter: (c: Card) => !!cacheEntries[c.id] },
  ];

  const activeFilterCount =
    labelFilters.size +
    (domainFilter ? 1 : 0) +
    (typeFilter ? 1 : 0);

  const handleClearAllFilters = () => {
    setLabelFilters(new Set());
    setDomainFilter(null);
    setTypeFilter(null);
    hapticLight();
  };

  const toggleLabelFilter = (label: string) => {
    setLabelFilters((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
    hapticLight();
  };

  const sortedCards = useMemo(() => {
    let filtered = allCards;
    if (labelFilters.size > 0) filtered = filtered.filter((c) => [...labelFilters].every((l) => c.labels.includes(l)));
    if (domainFilter) filtered = filtered.filter((c) => getDomain(c.url) === domainFilter);
    if (typeFilter) {
      const fn = typeFilters.find((t) => t.key === typeFilter)?.filter;
      if (fn) filtered = filtered.filter(fn);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.title.toLowerCase().includes(query) ||
          c.memo.toLowerCase().includes(query) ||
          c.url?.toLowerCase().includes(query) ||
          c.labels.some((l) => l.toLowerCase().includes(query))
      );
    }
    return [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'createdAt': comparison = a.createdAt - b.createdAt; break;
        case 'title':     comparison = a.title.localeCompare(b.title); break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [allCards, labelFilters, domainFilter, typeFilter, searchQuery, sortBy, sortOrder, cacheEntries]);

  const getSortLabel = (sort: SortType) => {
    switch (sort) {
      case 'createdAt': return '作成日';
      case 'title':     return 'タイトル';
    }
  };

  const getViewModeIcon = (mode: ViewMode) => {
    switch (mode) {
      case 'grid':     return '▤';
      case 'grid2':    return '▦';
      case 'list':     return '☰';
      case 'headline': return '≡';
    }
  };

  const handleSortChange = (sort: SortType) => {
    if (sortBy === sort) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(sort);
      setSortOrder('desc');
    }
    setShowSortMenu(false);
    hapticLight();
  };

  const handleViewModeChange = () => {
    const modes: ViewMode[] = ['grid', 'grid2', 'list', 'headline'];
    setViewMode(modes[(modes.indexOf(viewMode) + 1) % modes.length]);
    hapticLight();
  };

  const deleteCard = useCardStore((state) => state.deleteCard);

  const handleAddCard = useCallback(() => {
    if (id) setLastUsedCollectionId(id);
    router.push('/save-modal');
  }, [id, setLastUsedCollectionId]);

  const handleCardLongPress = useCallback(
    (card: Card) => {
      if (isSelectMode) return;
      hapticLight();
      Alert.alert(card.title || 'カード', undefined, [
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            Alert.alert('削除確認', 'このカードを削除しますか？', [
              { text: 'キャンセル', style: 'cancel' },
              {
                text: '削除する',
                style: 'destructive',
                onPress: () => {
                  deleteCard(card.id);
                  hapticWarning();
                },
              },
            ]);
          },
        },
        {
          text: '複数選択',
          onPress: () => {
            setIsSelectMode(true);
            setSelectedCardIds(new Set([card.id]));
          },
        },
        { text: 'キャンセル', style: 'cancel' },
      ]);
    },
    [isSelectMode, deleteCard]
  );

  const handleCardPress = useCallback(
    (card: Card) => {
      if (!isSelectMode) return false;
      setSelectedCardIds((prev) => {
        const next = new Set(prev);
        if (next.has(card.id)) next.delete(card.id); else next.add(card.id);
        hapticLight();
        return next;
      });
      return true;
    },
    [isSelectMode]
  );

  const handleSelectAll = useCallback(() => {
    setSelectedCardIds(new Set(sortedCards.map((c) => c.id)));
    hapticLight();
  }, [sortedCards]);

  const handleDeselectAll = useCallback(() => {
    setSelectedCardIds(new Set());
    hapticLight();
  }, []);

  const handleExitSelectMode = useCallback(() => {
    setIsSelectMode(false);
    setSelectedCardIds(new Set());
    hapticLight();
  }, []);

  const handleBulkDelete = useCallback(() => {
    if (selectedCardIds.size === 0) return;
    Alert.alert('一括削除', `選択した${selectedCardIds.size}件のカードを削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => {
          selectedCardIds.forEach((cardId) => deleteCard(cardId));
          setIsSelectMode(false);
          setSelectedCardIds(new Set());
          hapticWarning();
        },
      },
    ]);
  }, [selectedCardIds, deleteCard]);

  const handleCheckIssues = useCallback(async () => {
    setShowIssuesPanel(true);
    const dups = findDuplicates(allCards);
    setDuplicates(dups);
    setIsCheckingLinks(true);
    setBrokenLinks([]);
    setCheckProgress({ completed: 0, total: allCards.filter((c) => c.url).length });
    try {
      const results = await checkAllUrls(allCards, (completed, total) => {
        setCheckProgress({ completed, total });
      });
      setBrokenLinks(results.filter((r) => r.status === 'broken' || r.status === 'error'));
    } finally {
      setIsCheckingLinks(false);
    }
    hapticSuccess();
  }, [allCards]);

  const getCardTitle = useCallback(
    (cardId: string) => allCards.find((c) => c.id === cardId)?.title || 'タイトルなし',
    [allCards]
  );

  // ---- Card renderers ----

  const renderGrid1Card = (item: Card) => {
    const isSelected = selectedCardIds.has(item.id);
    const cardContent = (
      <Pressable
        style={({ pressed }) => [
          styles.grid1Card,
          { backgroundColor: colors.card },
          isSelectMode && isSelected && { borderWidth: 2, borderColor: colors.tint },
          pressed && !isSelectMode && styles.pressedOpacity,
        ]}
        onLongPress={() => handleCardLongPress(item)}
        onPress={() => isSelectMode && handleCardPress(item)}
        delayLongPress={500}
      >
        {isSelectMode && (
          <View
            style={[
              styles.selectCheckbox,
              { backgroundColor: isSelected ? colors.tint : 'transparent', borderColor: colors.tint },
            ]}
          >
            {isSelected && <ThemedText style={styles.checkmark}>✓</ThemedText>}
          </View>
        )}
        {item.thumbnail ? (
          <View style={[styles.grid1ThumbWrap, { backgroundColor: colors.groupBackground }]}>
            <Image source={{ uri: item.thumbnail }} style={styles.grid1Thumb} resizeMode="contain" />
          </View>
        ) : (
          <View style={[styles.grid1ThumbWrap, { backgroundColor: colors.groupBackground }]}>
            <ThemedText style={styles.thumbEmoji}>🔗</ThemedText>
          </View>
        )}
        <View style={styles.grid1Content}>
          <ThemedText style={[styles.grid1Title, { color: colors.text }]} numberOfLines={2}>
            {item.title || 'タイトルなし'}
          </ThemedText>
          <View style={styles.cardMeta}>
{cacheEntries[item.id] && (
              <View style={styles.dlBadge}>
                <ThemedText style={styles.dlBadgeText}>DL</ThemedText>
              </View>
            )}
          </View>
          {item.memo && (
            <ThemedText style={[styles.cardMemo, { color: colors.textSecondary }]} numberOfLines={2}>
              {item.memo}
            </ThemedText>
          )}
        </View>
      </Pressable>
    );
    if (isSelectMode) return <View key={item.id}>{cardContent}</View>;
    return (
      <Link key={item.id} href={`/card/${item.id}`} asChild>
        {cardContent}
      </Link>
    );
  };

  const renderGrid2Card = (item: Card, index: number) => {
    const isSelected = selectedCardIds.has(item.id);
    const cardContent = (
      <Pressable
        style={({ pressed }) => [
          styles.grid2CardInner,
          { backgroundColor: colors.card },
          isSelectMode && isSelected && { borderWidth: 2, borderColor: colors.tint },
          pressed && !isSelectMode && styles.pressedOpacity,
        ]}
        onLongPress={() => handleCardLongPress(item)}
        onPress={() => isSelectMode && handleCardPress(item)}
        delayLongPress={500}
      >
        {isSelectMode && (
          <View
            style={[
              styles.selectCheckboxSmall,
              { backgroundColor: isSelected ? colors.tint : 'transparent', borderColor: colors.tint },
            ]}
          >
            {isSelected && <ThemedText style={styles.checkmarkSmall}>✓</ThemedText>}
          </View>
        )}
        {item.thumbnail ? (
          <View style={[styles.thumbPlaceholder, { backgroundColor: colors.groupBackground }]}>
            <Image source={{ uri: item.thumbnail }} style={styles.thumbImage} resizeMode="contain" />
          </View>
        ) : (
          <View style={[styles.thumbPlaceholder, { backgroundColor: colors.groupBackground }]}>
            <ThemedText style={styles.thumbEmoji}>🔗</ThemedText>
          </View>
        )}
        <View style={styles.cardContent}>
          <ThemedText style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
            {item.title || 'タイトルなし'}
          </ThemedText>
          <View style={styles.cardMeta}>
{cacheEntries[item.id] && (
              <View style={styles.dlBadge}>
                <ThemedText style={styles.dlBadgeText}>DL</ThemedText>
              </View>
            )}
          </View>
          {item.memo && (
            <ThemedText style={[styles.cardMemo, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.memo}
            </ThemedText>
          )}
        </View>
      </Pressable>
    );
    if (isSelectMode) return <View key={item.id} style={styles.grid2Wrapper}>{cardContent}</View>;
    return (
      <View key={item.id} style={styles.grid2Wrapper}>
        <Link href={`/card/${item.id}`} asChild>{cardContent}</Link>
      </View>
    );
  };

  const renderListCard = (item: Card) => {
    const isSelected = selectedCardIds.has(item.id);
    const cardContent = (
      <Pressable
        style={({ pressed }) => [
          styles.listCardInner,
          isSelectMode && isSelected && { backgroundColor: colors.tint + '20' },
          pressed && !isSelectMode && styles.pressedOpacity,
        ]}
        onLongPress={() => handleCardLongPress(item)}
        onPress={() => isSelectMode && handleCardPress(item)}
        delayLongPress={500}
      >
        {isSelectMode && (
          <View
            style={[
              styles.selectCheckboxList,
              { backgroundColor: isSelected ? colors.tint : 'transparent', borderColor: colors.tint },
            ]}
          >
            {isSelected && <ThemedText style={styles.checkmarkSmall}>✓</ThemedText>}
          </View>
        )}
        {item.thumbnail ? (
          <Image
            source={{ uri: item.thumbnail }}
            style={styles.listThumb}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.listThumbPlaceholder, { backgroundColor: colors.groupBackground }]}>
            <ThemedText style={styles.listThumbText}>🔗</ThemedText>
          </View>
        )}
        <View style={styles.listCardContent}>
          <ThemedText style={[styles.listCardTitle, { color: colors.text }]} numberOfLines={1}>
            {item.title || 'タイトルなし'}
          </ThemedText>
          <View style={styles.listCardMeta}>
{cacheEntries[item.id] && (
              <View style={styles.dlBadge}>
                <ThemedText style={styles.dlBadgeText}>DL</ThemedText>
              </View>
            )}
          </View>
        </View>
        <ThemedText style={[styles.chevron, { color: colors.textSecondary }]}>›</ThemedText>
      </Pressable>
    );
    if (isSelectMode) {
      return (
        <View key={item.id} style={[styles.listCard, { backgroundColor: colors.card }]}>
          {cardContent}
        </View>
      );
    }
    return (
      <View key={item.id} style={[styles.listCard, { backgroundColor: colors.card }]}>
        <Link href={`/card/${item.id}`} asChild>{cardContent}</Link>
      </View>
    );
  };

  const renderHeadlineCard = (item: Card) => {
    const isSelected = selectedCardIds.has(item.id);
    const cardContent = (
      <Pressable
        style={({ pressed }) => [
          styles.headlineCardInner,
          isSelectMode && isSelected && { backgroundColor: colors.tint + '20' },
          pressed && !isSelectMode && styles.pressedOpacity,
        ]}
        onLongPress={() => handleCardLongPress(item)}
        onPress={() => isSelectMode && handleCardPress(item)}
        delayLongPress={500}
      >
        {isSelectMode && (
          <View
            style={[
              styles.selectCheckboxHeadline,
              { backgroundColor: isSelected ? colors.tint : 'transparent', borderColor: colors.tint },
            ]}
          >
            {isSelected && <ThemedText style={styles.checkmarkSmall}>✓</ThemedText>}
          </View>
        )}
        <ThemedText style={[styles.headlineTitle, { color: colors.text }]} numberOfLines={1}>
          {item.title || 'タイトルなし'}
        </ThemedText>
        {cacheEntries[item.id] && (
          <View style={styles.dlBadge}>
            <ThemedText style={styles.dlBadgeText}>DL</ThemedText>
          </View>
        )}
        <ThemedText style={[styles.chevron, { color: colors.textSecondary }]}>›</ThemedText>
      </Pressable>
    );
    if (isSelectMode) {
      return (
        <View key={item.id} style={[styles.headlineCard, { backgroundColor: colors.card }]}>
          {cardContent}
        </View>
      );
    }
    return (
      <View key={item.id} style={[styles.headlineCard, { backgroundColor: colors.card }]}>
        <Link href={`/card/${item.id}`} asChild>{cardContent}</Link>
      </View>
    );
  };

  const renderCard = (item: Card, index: number) => {
    switch (viewMode) {
      case 'grid':     return renderGrid1Card(item);
      case 'grid2':    return renderGrid2Card(item, index);
      case 'list':     return renderListCard(item);
      case 'headline': return renderHeadlineCard(item);
    }
  };

  const renderEmptyState = () => (
    <ThemedView style={styles.emptyContainer}>
      <ThemedText style={styles.emptyIcon}>📝</ThemedText>
      <ThemedText style={[styles.emptyTitle, { color: colors.text }]}>
        カードがありません
      </ThemedText>
      {allCards.length === 0 && (
        <>
          <ThemedText style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            URLやスクリーンショットを{'\n'}保存してみましょう
          </ThemedText>
          <Pressable
            style={({ pressed }) => [
              styles.createButton,
              { backgroundColor: colors.tint },
              pressed && styles.pressedOpacity,
            ]}
            onPress={handleAddCard}
          >
            <ThemedText style={styles.createButtonText}>カードを追加</ThemedText>
          </Pressable>
        </>
      )}
    </ThemedView>
  );

  const renderSearchBar = () => (
    <View style={[styles.searchWrap, { backgroundColor: colors.groupBackground }]}>
      <View style={[styles.searchInner, { backgroundColor: colors.card }]}>
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="検索..."
          placeholderTextColor={colors.textSecondary}
        />
      </View>
    </View>
  );

  const renderToolbar = () => (
    <View style={[styles.toolbarContainer, { backgroundColor: colors.groupBackground }]}>
      {/* View mode */}
      <Pressable
        style={({ pressed }) => [
          styles.toolbarBtn,
          { backgroundColor: colors.card },
          pressed && styles.pressedOpacity,
        ]}
        onPress={handleViewModeChange}
      >
        <ThemedText style={[styles.toolbarBtnText, { color: colors.text }]}>
          {getViewModeIcon(viewMode)}
        </ThemedText>
      </Pressable>

      {/* Filter */}
      <Pressable
        style={({ pressed }) => [
          styles.toolbarBtn,
          { backgroundColor: activeFilterCount > 0 ? colors.tint : colors.card },
          pressed && styles.pressedOpacity,
        ]}
        onPress={() => { setShowFilterPanel(!showFilterPanel); setShowSortMenu(false); }}
      >
        <ThemedText
          style={[
            styles.toolbarBtnText,
            { color: activeFilterCount > 0 ? '#fff' : colors.text },
          ]}
        >
          絞り込み{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </ThemedText>
      </Pressable>

      {/* Issues */}
      <Pressable
        style={({ pressed }) => [
          styles.toolbarBtn,
          { backgroundColor: colors.card },
          pressed && styles.pressedOpacity,
        ]}
        onPress={handleCheckIssues}
      >
        <ThemedText style={[styles.toolbarBtnText, { color: colors.text }]}>🔍</ThemedText>
      </Pressable>

      {/* Sort */}
      <Pressable
        style={({ pressed }) => [
          styles.toolbarBtn,
          styles.sortBtn,
          { backgroundColor: colors.card },
          pressed && styles.pressedOpacity,
        ]}
        onPress={() => { setShowSortMenu(!showSortMenu); setShowFilterPanel(false); }}
      >
        <ThemedText style={[styles.toolbarBtnText, { color: colors.text }]}>
          {getSortLabel(sortBy)} {sortOrder === 'asc' ? '↑' : '↓'}
        </ThemedText>
      </Pressable>
    </View>
  );

  const renderSelectToolbar = () =>
    isSelectMode && (
      <View
        style={[
          styles.selectToolbar,
          { backgroundColor: colors.card, borderBottomColor: colors.separator },
        ]}
      >
        <Pressable style={styles.selectToolbarButton} onPress={handleExitSelectMode}>
          <ThemedText style={[styles.selectToolbarButtonText, { color: colors.tint }]}>
            キャンセル
          </ThemedText>
        </Pressable>
        <ThemedText style={[styles.selectCount, { color: colors.text }]}>
          {selectedCardIds.size}件選択
        </ThemedText>
        <View style={styles.selectToolbarActions}>
          {selectedCardIds.size < sortedCards.length ? (
            <Pressable style={styles.selectToolbarButton} onPress={handleSelectAll}>
              <ThemedText style={[styles.selectToolbarButtonText, { color: colors.tint }]}>
                全選択
              </ThemedText>
            </Pressable>
          ) : (
            <Pressable style={styles.selectToolbarButton} onPress={handleDeselectAll}>
              <ThemedText style={[styles.selectToolbarButtonText, { color: colors.tint }]}>
                選択解除
              </ThemedText>
            </Pressable>
          )}
        </View>
      </View>
    );

  const renderBulkActionBar = () =>
    isSelectMode &&
    selectedCardIds.size > 0 && (
      <View
        style={[
          styles.bulkActionBar,
          { backgroundColor: colors.background, borderTopColor: colors.separator },
        ]}
      >
        <Pressable
          style={[styles.bulkActionButton, { backgroundColor: colors.destructive }]}
          onPress={handleBulkDelete}
        >
          <ThemedText style={styles.bulkActionText}>削除</ThemedText>
        </Pressable>
      </View>
    );

  const renderIssuesPanel = () =>
    showIssuesPanel && (
      <View style={[styles.issuesPanel, { backgroundColor: colors.card }]}>
        <View style={styles.issuesPanelHeader}>
          <ThemedText style={[styles.issuesPanelTitle, { color: colors.text }]}>問題検出</ThemedText>
          <Pressable onPress={() => setShowIssuesPanel(false)}>
            <ThemedText style={[styles.closeButton, { color: colors.tint }]}>閉じる</ThemedText>
          </Pressable>
        </View>

        <View style={styles.issueSection}>
          <ThemedText style={[styles.issueSectionTitle, { color: colors.text }]}>
            重複URL ({duplicates.length}件)
          </ThemedText>
          {duplicates.length === 0 ? (
            <ThemedText style={[styles.noIssues, { color: colors.textSecondary }]}>重複はありません</ThemedText>
          ) : (
            duplicates.map((group) => (
              <View key={group.url} style={[styles.issueItem, { borderBottomColor: colors.separator }]}>
                <ThemedText style={[styles.issueUrl, { color: colors.textSecondary }]} numberOfLines={1}>
                  {group.url}
                </ThemedText>
                <ThemedText style={[styles.issueDetail, { color: colors.text }]}>
                  {group.cardIds.map((cid) => getCardTitle(cid)).join(', ')}
                </ThemedText>
              </View>
            ))
          )}
        </View>

        <View style={styles.issueSection}>
          <ThemedText style={[styles.issueSectionTitle, { color: colors.text }]}>
            リンク切れ (
            {isCheckingLinks
              ? `${checkProgress.completed}/${checkProgress.total}`
              : `${brokenLinks.length}件`}
            )
          </ThemedText>
          {isCheckingLinks ? (
            <ThemedText style={[styles.noIssues, { color: colors.textSecondary }]}>チェック中...</ThemedText>
          ) : brokenLinks.length === 0 ? (
            <ThemedText style={[styles.noIssues, { color: colors.textSecondary }]}>リンク切れはありません</ThemedText>
          ) : (
            brokenLinks.map((result) => (
              <View key={result.cardId} style={[styles.issueItem, { borderBottomColor: colors.separator }]}>
                <ThemedText style={[styles.issueCardTitle, { color: colors.text }]}>
                  {getCardTitle(result.cardId)}
                </ThemedText>
                <ThemedText style={[styles.issueStatus, { color: colors.destructive }]}>
                  {result.statusCode
                    ? `HTTP ${result.statusCode}`
                    : result.errorMessage || 'エラー'}
                </ThemedText>
              </View>
            ))
          )}
        </View>
      </View>
    );

  const renderSortMenu = () =>
    showSortMenu && (
      <View style={[styles.sortMenu, { backgroundColor: colors.card }]}>
        {(['createdAt', 'title'] as SortType[]).map((sort) => (
          <Pressable
            key={sort}
            style={[
              styles.sortMenuItem,
              sortBy === sort && { backgroundColor: colors.tint + '18' },
            ]}
            onPress={() => handleSortChange(sort)}
          >
            <ThemedText style={[styles.sortMenuText, { color: colors.text }]}>
              {getSortLabel(sort)} {sortBy === sort && (sortOrder === 'asc' ? '↑' : '↓')}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    );

  const renderFilterPanel = () =>
    showFilterPanel && (
      <View style={[styles.filterPanel, { backgroundColor: colors.card }]}>
        <View style={styles.filterPanelHeader}>
          <ThemedText style={[styles.filterPanelTitle, { color: colors.text }]}>絞り込み</ThemedText>
          {activeFilterCount > 0 && (
            <Pressable onPress={handleClearAllFilters}>
              <ThemedText style={[styles.filterPanelClear, { color: colors.tint }]}>
                すべてクリア
              </ThemedText>
            </Pressable>
          )}
        </View>

        {/* Labels */}
        {collectionLabels.length > 0 && (
          <View style={styles.filterPanelSection}>
            <ThemedText style={[styles.filterPanelSectionTitle, { color: colors.textSecondary }]}>
              ラベル
            </ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterRow}>
                {collectionLabels.map((label) => {
                  const isActive = labelFilters.has(label);
                  return (
                    <Pressable
                      key={label}
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor: isActive ? colors.tint : 'transparent',
                          borderColor: colors.tint,
                        },
                      ]}
                      onPress={() => toggleLabelFilter(label)}
                    >
                      <ThemedText
                        style={[
                          styles.filterChipText,
                          { color: isActive ? '#fff' : colors.tint },
                        ]}
                      >
                        {label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Domains */}
        {collectionDomains.length > 0 && (
          <View style={styles.filterPanelSection}>
            <ThemedText style={[styles.filterPanelSectionTitle, { color: colors.textSecondary }]}>
              ドメイン
            </ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterRow}>
                {collectionDomains.slice(0, 10).map((domain) => (
                  <Pressable
                    key={domain}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: domainFilter === domain ? '#6B7280' : 'transparent',
                        borderColor: '#6B7280',
                      },
                    ]}
                    onPress={() => setDomainFilter(domainFilter === domain ? null : domain)}
                  >
                    <ThemedText
                      style={[
                        styles.filterChipText,
                        { color: domainFilter === domain ? '#fff' : '#6B7280' },
                      ]}
                    >
                      {domain}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Type */}
        <View style={styles.filterPanelSection}>
          <ThemedText style={[styles.filterPanelSectionTitle, { color: colors.textSecondary }]}>
            タイプ
          </ThemedText>
          <View style={[styles.filterRow, { flexWrap: 'wrap' }]}>
            {typeFilters.map((tf) => (
              <Pressable
                key={tf.key}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: typeFilter === tf.key ? '#8B5CF6' : 'transparent',
                    borderColor: '#8B5CF6',
                  },
                ]}
                onPress={() => setTypeFilter(typeFilter === tf.key ? null : tf.key)}
              >
                <ThemedText
                  style={[
                    styles.filterChipText,
                    { color: typeFilter === tf.key ? '#fff' : '#8B5CF6' },
                  ]}
                >
                  {tf.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    );

  if (!collection) {
    return (
      <ThemedView style={[styles.container, styles.centerContent]}>
        <ThemedText>コレクションが見つかりません</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: colors.groupBackground }]}
      onLayout={handleLayout}
    >
      {/* Select or normal header */}
      {isSelectMode ? (
        renderSelectToolbar()
      ) : (
        <View style={[styles.headerBar, { borderBottomColor: colors.separator, backgroundColor: colors.background }]}>
          <ThemedText style={[styles.headerTitle, { color: colors.text }]}>
            {collection.icon} {collection.name}
          </ThemedText>
          <Pressable
            style={({ pressed }) => [styles.headerButton, pressed && styles.pressedOpacity]}
            onPress={handleAddCard}
          >
            <ThemedText style={[styles.headerButtonText, { color: colors.tint }]}>+</ThemedText>
          </Pressable>
        </View>
      )}

      {!isSelectMode && renderSearchBar()}
      {!isSelectMode && (
        <View style={styles.toolbarRow}>{renderToolbar()}</View>
      )}
      {!isSelectMode && renderFilterPanel()}
      {renderSortMenu()}
      {renderIssuesPanel()}

      <ScrollView contentContainerStyle={styles.listContent}>
        {sortedCards.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={viewMode === 'grid2' ? styles.cardGrid : styles.cardList}>
            {sortedCards.map(renderCard)}
          </View>
        )}
      </ScrollView>

      {renderBulkActionBar()}
      {!isSelectMode && <AdBanner />}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContent: { justifyContent: 'center', alignItems: 'center' },

  // Header
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    ...Typography.headline,
    flex: 1,
  },
  headerButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  headerButtonText: {
    fontSize: 28,
    fontWeight: '300',
  },

  // Search
  searchWrap: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: 8,
  },
  searchInner: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  searchInput: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...Typography.subhead,
  },

  // Toolbar
  toolbarRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  toolbarContainer: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: 6,
  },
  toolbarBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Spacing.buttonRadiusSm,
  },
  sortBtn: { minWidth: 80 },
  toolbarBtnText: {
    ...Typography.footnote,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Filter panel
  filterRow: { flexDirection: 'row', gap: 6 },
  filterPanel: {
    marginHorizontal: HORIZONTAL_PADDING,
    marginBottom: 8,
    borderRadius: Spacing.groupRadius,
    padding: HORIZONTAL_PADDING,
  },
  filterPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  filterPanelTitle: { ...Typography.headline },
  filterPanelClear: { ...Typography.subhead, fontWeight: '500' },
  filterPanelSection: { marginBottom: 14 },
  filterPanelSectionTitle: {
    ...Typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  filterChipText: { ...Typography.caption, fontWeight: '500' },

  // Sort menu
  sortMenu: {
    marginHorizontal: HORIZONTAL_PADDING,
    marginBottom: 6,
    borderRadius: Spacing.groupRadius,
    overflow: 'hidden',
  },
  sortMenuItem: { padding: 12 },
  sortMenuText: { ...Typography.subhead },

  // List content
  listContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: 8,
    paddingBottom: 24,
    flexGrow: 1,
  },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  cardList: { gap: CARD_GAP },

  // Grid 1 card
  grid1Card: {
    marginBottom: CARD_GAP,
    borderRadius: Spacing.cardRadius,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  grid1ThumbWrap: {
    width: '100%',
    aspectRatio: 4 / 3,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  grid1Thumb: { width: '100%', aspectRatio: 4 / 3 },
  grid1Content: { padding: HORIZONTAL_PADDING },
  grid1Title: { ...Typography.headline, marginBottom: 6 },

  // Grid 2 card
  grid2Wrapper: { width: '48%', marginBottom: CARD_GAP },
  grid2CardInner: {
    borderRadius: Spacing.cardRadius,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  // Shared thumbnail
  thumbPlaceholder: {
    width: '100%',
    aspectRatio: 4 / 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbImage: { width: '100%', aspectRatio: 4 / 3 },
  thumbEmoji: { fontSize: 28 },
  cardContent: { padding: 10 },
  cardTitle: { ...Typography.footnote, fontWeight: '600', marginBottom: 4 },

  // Shared meta row
  cardMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  dlBadge: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 4,
  },
  dlBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  cardMemo: { ...Typography.caption, marginTop: 2 },

  // List card
  listCard: {
    borderRadius: Spacing.cardRadius,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  listCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: Spacing.cellVertical,
    minHeight: 72,
  },
  listThumb: { width: 56, height: 56, borderRadius: 8, flexShrink: 0 },
  listThumbPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  listThumbText: { fontSize: 20 },
  listCardContent: { flex: 1, marginLeft: 12, justifyContent: 'center', overflow: 'hidden' },
  listCardTitle: { ...Typography.subhead, fontWeight: '600' },
  listCardMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  chevron: { fontSize: 20, marginLeft: 8, opacity: 0.4 },

  // Headline card
  headlineCard: { borderRadius: 8, overflow: 'hidden' },
  headlineCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    height: 44,
  },
  headlineTitle: { flex: 1, ...Typography.subhead, marginHorizontal: 8 },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { ...Typography.title2, marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { ...Typography.subhead, textAlign: 'center', marginBottom: 28 },
  createButton: {
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: Spacing.buttonRadiusMd,
  },
  createButtonText: { color: '#fff', ...Typography.headline },

  // Select toolbar
  selectToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  selectToolbarButton: { paddingVertical: 4, paddingHorizontal: 8 },
  selectToolbarButtonText: { ...Typography.body, fontWeight: '500' },
  selectCount: { ...Typography.headline },
  selectToolbarActions: { flexDirection: 'row', gap: 8 },

  // Select checkboxes
  selectCheckbox: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  selectCheckboxSmall: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  selectCheckboxList: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectCheckboxHeadline: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkmark: { color: '#fff', fontSize: 16, fontWeight: '700' },
  checkmarkSmall: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Bulk action bar
  bulkActionBar: {
    flexDirection: 'row',
    gap: 10,
    padding: HORIZONTAL_PADDING,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  bulkActionButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  bulkActionText: { color: '#fff', ...Typography.subhead, fontWeight: '600' },

  // Issues panel
  issuesPanel: {
    marginHorizontal: HORIZONTAL_PADDING,
    marginBottom: 8,
    borderRadius: Spacing.groupRadius,
    padding: HORIZONTAL_PADDING,
  },
  issuesPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  issuesPanelTitle: { ...Typography.headline },
  closeButton: { ...Typography.subhead, fontWeight: '500' },
  issueSection: { marginBottom: 14 },
  issueSectionTitle: { ...Typography.subhead, fontWeight: '600', marginBottom: 8 },
  noIssues: { ...Typography.footnote },
  issueItem: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  issueUrl: { ...Typography.footnote, marginBottom: 2 },
  issueDetail: { ...Typography.caption },
  issueCardTitle: { ...Typography.subhead, marginBottom: 2 },
  issueStatus: { ...Typography.footnote, fontWeight: '600' },

  pressedOpacity: { opacity: 0.7 },
});
