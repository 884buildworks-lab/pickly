import { File, Paths } from 'expo-file-system/next';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useCollectionStore } from '@/store/collection-store';
import { useCardStore } from '@/store/card-store';

interface ExportData {
  version: 1;
  exportedAt: number;
  collections: ReturnType<typeof useCollectionStore.getState>['collections'];
  cards: ReturnType<typeof useCardStore.getState>['cards'];
}

/**
 * Export all data as a JSON file and share it
 */
export async function exportData(): Promise<boolean> {
  try {
    const collections = useCollectionStore.getState().collections;
    const cards = useCardStore.getState().cards;

    const data: ExportData = {
      version: 1,
      exportedAt: Date.now(),
      collections,
      cards,
    };

    const json = JSON.stringify(data, null, 2);
    const fileName = `pickly-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File(Paths.cache, fileName);

    if (file.exists) {
      file.delete();
    }
    file.create();
    file.write(json);

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: 'Picklyデータをエクスポート',
      });
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Import data from a JSON file
 */
export async function importData(): Promise<{ collections: number; cards: number } | null> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) {
      return null;
    }

    const fileUri = result.assets[0].uri;
    const pickedFile = new File(fileUri);
    const json = await pickedFile.text();

    const data = JSON.parse(json) as ExportData;

    if (!data.version || !Array.isArray(data.collections) || !Array.isArray(data.cards)) {
      throw new Error('Invalid data format');
    }

    // Merge imported data with existing data
    const existingCollections = useCollectionStore.getState().collections;
    const existingCards = useCardStore.getState().cards;

    const existingCollectionIds = new Set(existingCollections.map((c) => c.id));
    const existingCardIds = new Set(existingCards.map((c) => c.id));

    const newCollections = data.collections.filter((c) => !existingCollectionIds.has(c.id));
    const newCards = data.cards.filter((c) => !existingCardIds.has(c.id));

    if (newCollections.length > 0) {
      useCollectionStore.setState({
        collections: [...existingCollections, ...newCollections],
      });
    }

    if (newCards.length > 0) {
      useCardStore.setState({
        cards: [...existingCards, ...newCards],
      });
    }

    return { collections: newCollections.length, cards: newCards.length };
  } catch {
    return null;
  }
}
