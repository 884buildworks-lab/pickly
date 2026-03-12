import { StyleSheet, TextInput, Pressable, View, ScrollView, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCollectionStore, useCardStore, useCacheStore } from '@/store';
import { Colors, Typography, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { hapticSuccess, hapticWarning } from '@/utils/haptics';
import { useResponsive } from '@/hooks/use-responsive';

const EMOJI_LIST = [
  '📁', '⭐', '❤️', '🎁', '✈️', '🏠', '🍽️', '👕',
  '📚', '🎬', '🎵', '🎮', '💼', '🛒', '💡', '🔧',
  '📱', '💻', '📷', '🎨', '🏃', '🌟', '🔥', '💎',
  '🌈', '🎯', '🏆', '🎉', '💰', '🔑', '📌', '✨',
];

export default function CollectionModal() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const responsive = useResponsive();

  const collection = useCollectionStore((state) =>
    id ? state.collections.find((c) => c.id === id) : undefined
  );
  const addCollection = useCollectionStore((state) => state.addCollection);
  const updateCollection = useCollectionStore((state) => state.updateCollection);
  const deleteCollection = useCollectionStore((state) => state.deleteCollection);
  const deleteCardsByCollectionId = useCardStore((state) => state.deleteCardsByCollectionId);
  const clearCacheEntries = useCacheStore((state) => state.clearCacheEntries);
  const collections = useCollectionStore(
    useShallow((state) => state.collections.filter((c) => c.id !== id))
  );

  const [name, setName] = useState(collection?.name || '');
  const [icon, setIcon] = useState(collection?.icon || '📁');
  const [parentId, setParentId] = useState<string | null>(collection?.parentId ?? null);

  const isEditing = !!id && !!collection;

  useEffect(() => {
    if (collection) {
      setName(collection.name);
      setIcon(collection.icon);
      setParentId(collection.parentId ?? null);
    }
  }, [collection]);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('エラー', 'コレクション名を入力してください');
      return;
    }
    if (isEditing) {
      updateCollection(id!, { name: name.trim(), icon, parentId });
    } else {
      addCollection({ name: name.trim(), icon, parentId });
    }
    hapticSuccess();
    router.back();
  };

  const handleDelete = () => {
    if (!isEditing) return;
    Alert.alert(
      'コレクションを削除',
      'このコレクションと、含まれるすべてのカードを削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            const cardIds = useCardStore.getState().getCardsByCollectionId(id!).map((c) => c.id);
            clearCacheEntries(cardIds);
            deleteCardsByCollectionId(id!);
            deleteCollection(id!);
            hapticWarning();
            router.back();
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.groupBackground }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* ---- Icon selection ---- */}
      <ThemedText style={[styles.sectionHeader, { color: colors.textSecondary }]}>アイコン</ThemedText>

      {/* Large preview of selected icon */}
      <View style={styles.iconPreviewWrap}>
        <ThemedText style={styles.iconPreview}>{icon}</ThemedText>
      </View>

      {/* Emoji grid – iOS picker style */}
      <View style={[styles.emojiGridCard, { backgroundColor: colors.card }]}>
        <View style={styles.emojiGrid}>
          {EMOJI_LIST.map((emoji) => (
            <Pressable
              key={emoji}
              style={({ pressed }) => [
                styles.emojiButton,
                {
                  width: responsive.emojiButtonSize,
                  height: responsive.emojiButtonSize,
                  backgroundColor:
                    icon === emoji ? colors.tint + '22' : 'transparent',
                },
                icon === emoji && styles.emojiButtonSelected,
                pressed && styles.pressedOpacity,
              ]}
              onPress={() => setIcon(emoji)}
            >
              <ThemedText style={styles.emoji}>{emoji}</ThemedText>
              {icon === emoji && (
                <View style={[styles.emojiSelectedRing, { borderColor: colors.tint }]} />
              )}
            </Pressable>
          ))}
        </View>
      </View>

      {/* ---- Name ---- */}
      <ThemedText style={[styles.sectionHeader, { color: colors.textSecondary }]}>コレクション名</ThemedText>
      <View style={[styles.formGroup, { backgroundColor: colors.card }]}>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          value={name}
          onChangeText={setName}
          placeholder="例: 旅行の候補"
          placeholderTextColor={colors.textSecondary}
          autoFocus={!isEditing}
        />
      </View>

      {/* ---- Parent collection ---- */}
      <ThemedText style={[styles.sectionHeader, { color: colors.textSecondary }]}>親コレクション</ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.parentChips}>
        <Pressable
          style={({ pressed }) => [
            styles.parentChip,
            {
              backgroundColor: parentId === null ? colors.tint : colors.card,
            },
            pressed && styles.pressedOpacity,
          ]}
          onPress={() => setParentId(null)}
        >
          <ThemedText
            style={[styles.parentChipText, { color: parentId === null ? '#fff' : colors.text }]}
          >
            なし（トップレベル）
          </ThemedText>
        </Pressable>

        {collections.map((c) => (
          <Pressable
            key={c.id}
            style={({ pressed }) => [
              styles.parentChip,
              {
                backgroundColor: parentId === c.id ? colors.tint : colors.card,
              },
              pressed && styles.pressedOpacity,
            ]}
            onPress={() => setParentId(c.id)}
          >
            <ThemedText
              style={[styles.parentChipText, { color: parentId === c.id ? '#fff' : colors.text }]}
            >
              {c.icon} {c.name}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      {/* ---- Save Button ---- */}
      <Pressable
        style={({ pressed }) => [
          styles.saveButton,
          { backgroundColor: colors.tint },
          pressed && styles.pressedOpacity,
        ]}
        onPress={handleSave}
      >
        <ThemedText style={styles.saveButtonText}>
          {isEditing ? '保存' : '作成'}
        </ThemedText>
      </Pressable>

      {/* ---- Delete Button (edit mode) ---- */}
      {isEditing && (
        <Pressable
          style={({ pressed }) => [styles.deleteButton, pressed && styles.pressedOpacity]}
          onPress={handleDelete}
        >
          <ThemedText style={[styles.deleteButtonText, { color: colors.destructive }]}>
            コレクションを削除
          </ThemedText>
        </Pressable>
      )}

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

  sectionHeader: {
    fontSize: Typography.footnote.fontSize,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 6,
    marginHorizontal: Spacing.screenHorizontal,
  },

  // Large icon preview
  iconPreviewWrap: {
    alignItems: 'center',
    marginBottom: 12,
  },
  iconPreview: {
    fontSize: 72,
    lineHeight: 86,
  },

  // Emoji grid card
  emojiGridCard: {
    marginHorizontal: Spacing.screenHorizontal,
    borderRadius: Spacing.groupRadius,
    padding: 12,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  emojiButton: {
    width: 46,
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiButtonSelected: {
    // ring handled by overlay
  },
  emojiSelectedRing: {
    position: 'absolute',
    inset: 0,
    borderRadius: 10,
    borderWidth: 2,
  },
  emoji: {
    fontSize: 22,
  },

  // Form group
  formGroup: {
    marginHorizontal: Spacing.screenHorizontal,
    borderRadius: Spacing.groupRadius,
    overflow: 'hidden',
  },
  input: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: 13,
    fontSize: Typography.body.fontSize,
    lineHeight: Typography.body.lineHeight,
  },

  // Parent chips
  parentChips: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: Spacing.screenHorizontal,
  },
  parentChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
  },
  parentChipText: {
    ...Typography.subhead,
    fontWeight: '500',
  },

  // Save button
  saveButton: {
    marginHorizontal: Spacing.screenHorizontal,
    marginTop: 28,
    paddingVertical: 15,
    borderRadius: Spacing.buttonRadiusMd,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: Typography.headline.fontSize,
    fontWeight: Typography.headline.fontWeight,
  },

  // Delete button
  deleteButton: {
    paddingVertical: 15,
    marginTop: 12,
    alignItems: 'center',
  },
  deleteButtonText: {
    ...Typography.body,
    fontWeight: '500',
  },

  pressedOpacity: {
    opacity: 0.7,
  },

  bottomPad: {
    height: 40,
  },
});
