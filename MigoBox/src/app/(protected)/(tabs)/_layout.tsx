import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const TABS = [
  { name: 'home', label: 'Caixinha', emoji: '\uD83D\uDCE6' },
  { name: 'datas', label: 'Datas', emoji: '\uD83D\uDDD3\uFE0F' },
  { name: 'eu', label: 'Eu', emoji: '\uD83D\uDC64' },
] as const;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1CB0F6',
        tabBarInactiveTintColor: '#AAAAAA',
        tabBarButton: (props) => (
          <Pressable {...props as any} />
        ),
        tabBarStyle: styles.tabBar,
      }}>
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.label,
            tabBarIcon: ({ focused }) => (
              <View style={[styles.tabIconWrap, focused && styles.tabIconWrapActive]}>
                <Text style={styles.tabEmoji}>{tab.emoji}</Text>
              </View>
            ),
            tabBarLabel: ({ focused }) => (
              <Text
                style={[
                  styles.tabLabel,
                  focused ? styles.tabLabelActive : styles.tabLabelInactive,
                ]}>
                {tab.label}
              </Text>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 2,
    borderTopColor: '#ECECEC',
    paddingTop: 4,
    height: 60,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 0,
    marginBottom: 6,
  },
  tabLabelActive: {
    fontFamily: 'Nunito_800ExtraBold',
  },
  tabLabelInactive: {
    fontFamily: 'Nunito_700Bold',
  },
  tabIconWrap: {
    width: 44,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapActive: {
    backgroundColor: '#1CB0F611',
  },
  tabEmoji: {
    fontSize: 20,
  },
});
