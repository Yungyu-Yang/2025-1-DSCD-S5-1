import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="signup" options={{ title: 'Sign Up' }} />
      <Tabs.Screen name="signin" options={{ title: 'Sign In' }} />
      <Tabs.Screen name="welcome" options={{ title: 'Welcome' }} />
      <Tabs.Screen name="home-discover" options={{ title: 'Discover' }} />
      <Tabs.Screen name="discover-survey" options={{ title: 'Survey' }} />
      <Tabs.Screen name="mypage-hairstyle" options={{ title: 'My Page' }} />
    </Tabs>
  );
}
