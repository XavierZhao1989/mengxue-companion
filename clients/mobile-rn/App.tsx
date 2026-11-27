import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { HomeScreen } from './src/screens/HomeScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { ReaderScreen } from './src/screens/ReaderScreen';
import { COLORS } from './src/theme';

type TabId = 'home' | 'library' | 'profile';

const TAB_TITLES: Record<TabId, string> = {
  home: '今日伴读',
  library: '蒙学馆',
  profile: '伴学档案',
};

export default function App() {
  const [tab, setTab] = useState<TabId>('home');
  const [readerState, setReaderState] = useState<{ lessonId: string; childId: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <SafeAreaProvider>
      <StatusBar style='dark' />
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        {readerState ? (
          <ReaderScreen
            lessonId={readerState.lessonId}
            childId={readerState.childId}
            onBack={() => setReaderState(null)}
            onCheckedIn={() => setRefreshKey((k) => k + 1)}
          />
        ) : (
          <>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>{TAB_TITLES[tab]}</Text>
            </View>

            <View style={styles.content}>
              {tab === 'home' && (
                <HomeScreen
                  refreshKey={refreshKey}
                  onOpenReader={(lessonId, childId) => setReaderState({ lessonId, childId })}
                  onGoLibrary={() => setTab('library')}
                />
              )}
              {tab === 'library' && (
                <LibraryScreen
                  onOpenReader={(lessonId, childId) => setReaderState({ lessonId, childId })}
                  onMutated={() => setRefreshKey((k) => k + 1)}
                />
              )}
              {tab === 'profile' && <ProfileScreen refreshKey={refreshKey} />}
            </View>

            <View style={styles.tabBar}>
              {(['home', 'library', 'profile'] as TabId[]).map((id) => {
                const active = tab === id;
                return (
                  <Pressable key={id} onPress={() => setTab(id)} style={styles.tabItem}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: active ? '700' : '500',
                        color: active ? COLORS.brandPrimary : COLORS.textMuted,
                      }}
                    >
                      {TAB_TITLES[id]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bgCanvas },
  header: {
    height: 48,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  content: { flex: 1 },
  tabBar: {
    height: 54,
    flexDirection: 'row',
    backgroundColor: COLORS.bgSurface,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
