import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Screen } from '@/presentation/screens/Screen';
import { useTheme } from '@/presentation/theme';
import { Text, Button, Card, Icon } from '@/presentation/components';
import { useServices } from '@/presentation/services';
import { asWordId } from '@/domain/index';
import type { SavedWordListItem } from '@/domain/index';

// Saved words list (WORD_FEEDBACK_PLAN §2). Keyset-paginated (saved_at DESC,
// word id ASC) read of the learner's bookmarked words, each row showing the word
// + gloss and a bookmark-check control to remove it. Reached from the Progress
// tab's "Saved words" section. No TextInput.

const PAGE = 20;

export interface SavedWordsScreenProps {
  onExit: () => void;
}

interface Cursor {
  savedAt: number;
  wordId: string;
}

export function SavedWordsScreen({ onExit }: SavedWordsScreenProps): React.JSX.Element {
  const { spacing, colors } = useTheme();
  const { queries } = useServices();

  const [items, setItems] = useState<SavedWordListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const cursor = useRef<Cursor | null>(null);
  const loadingMore = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingMore.current) return;
    loadingMore.current = true;
    try {
      const page = await queries.listSavedWordsPage(
        cursor.current?.savedAt ?? null,
        cursor.current?.wordId ?? null,
        PAGE,
      );
      setItems((prev) => [...prev, ...page]);
      setHasMore(page.length === PAGE);
      const last = page[page.length - 1];
      if (last !== undefined) {
        cursor.current = { savedAt: last.savedAt, wordId: last.word.id };
      }
    } catch {
      // Offline-first: a read failure just stops pagination, never errors out.
      setHasMore(false);
    } finally {
      loadingMore.current = false;
      setLoading(false);
    }
  }, [queries]);

  useEffect(() => {
    void loadMore();
  }, [loadMore]);

  const handleRemove = useCallback(
    (wordId: string) => {
      // Optimistic: drop the row, then persist. A failure is non-fatal (the row
      // reappears on next open if the delete didn't land).
      setItems((prev) => prev.filter((i) => i.word.id !== wordId));
      void queries.unsaveWord(asWordId(wordId)).catch(() => undefined);
    },
    [queries],
  );

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s3 }}>
        <Button label="Back" variant="tertiary" onPress={onExit} accessibilityLabel="Back" />
        <Text variant="title" color="textPrimary" accessibilityRole="header">
          Saved words
        </Text>
      </View>

      {!loading && items.length === 0 ? (
        <View style={{ gap: spacing.s3, flex: 1, justifyContent: 'center' }}>
          <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
            No saved words yet.
          </Text>
          <Text variant="caption" color="textTertiary" style={{ textAlign: 'center' }}>
            Tap the bookmark on a word to save it for later.
          </Text>
        </View>
      ) : (
        <>
          {items.map((item) => (
            <Card key={item.word.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s3 }}>
                <View style={{ flex: 1, gap: spacing.s1 }}>
                  <Text variant="bodyLg" color="textPrimary">
                    {item.word.word}
                  </Text>
                  <Text variant="body" color="textSecondary">
                    {item.word.definition}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${item.word.word} from saved`}
                  onPress={() => handleRemove(item.word.id)}
                  hitSlop={8}
                  style={{ padding: spacing.s2 }}
                >
                  <Icon name="bookmark-check" size={24} colorValue={colors.accent} />
                </Pressable>
              </View>
            </Card>
          ))}

          {hasMore && (
            <Button label="Load more" variant="secondary" fullWidth onPress={() => void loadMore()} />
          )}
        </>
      )}
    </Screen>
  );
}
