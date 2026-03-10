import { BottomTabBar, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import AdBanner from '@/components/ad-banner';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

function TabBarWithAd(props: BottomTabBarProps) {
  return (
    <View>
      <AdBanner />
      <BottomTabBar {...props} />
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Tabs
      tabBar={(props) => <TabBarWithAd {...props} />}
      screenOptions={{
        tabBarActiveTintColor: colors.tabIconSelected,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarButton: HapticTab,
        headerShown: true,
        tabBarStyle: {
          backgroundColor: colorScheme === 'dark'
            ? 'rgba(0,0,0,0.85)'
            : 'rgba(255,255,255,0.85)',
          borderTopColor: colors.separator,
          borderTopWidth: StyleSheet.hairlineWidth,
          ...Platform.select({
            android: { elevation: 8 },
          }),
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          letterSpacing: 0.1,
        },
        headerStyle: {
          backgroundColor: colorScheme === 'dark'
            ? 'rgba(0,0,0,0.85)'
            : 'rgba(255,255,255,0.85)',
          borderBottomColor: colors.separator,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
        headerTitleStyle: {
          fontSize: 17,
          fontWeight: '600',
          color: colors.text,
        },
        headerTintColor: colors.tint,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'ホーム',
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '設定',
          headerTitle: '設定',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="gearshape.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
