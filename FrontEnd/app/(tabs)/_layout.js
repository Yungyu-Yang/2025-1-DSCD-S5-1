import { Tabs } from 'expo-router';
import { LogBox } from 'react-native';

LogBox.ignoreAllLogs(); 


console.log = () => {};
console.info = () => {};
console.warn = () => {};
// console.error = () => {};


export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerTitle: '',
        headerLeft: () => null,
        headerRight: () => null,
        headerStyle: {
          height: 40,
        },
        tabBarStyle: {
          height: 0,
        },
        tabBarButton: () => null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="welcome"
        options={{
          title: 'Welcome',
        }}
      />
      <Tabs.Screen
        name="signin"
        options={{
          title: 'Signin',
        }}
      />
      <Tabs.Screen
        name="signup"
        options={{
          title: 'Signup',
        }}
      />
      <Tabs.Screen
        name="home-discover"
        options={{
          title: 'Home Discover',
        }}
      />
       <Tabs.Screen
        name="home-simulation"
        options={{
          title: 'Home Simulation',
        }}
      />
       <Tabs.Screen
        name="home-hairshop"
        options={{
          title: 'Home Hairshop',
        }}
      />
      <Tabs.Screen
        name="discover-recomendation"
        options={{
          title: 'Discover Recomendation',
        }}
      />
       <Tabs.Screen
        name="discover-result"
        options={{
          title: 'Discover Result',
        }}
      />
       <Tabs.Screen
        name="discover-camera"
        options={{
          title: 'Discover Camera',
        }}
      />
       <Tabs.Screen
        name="discover-survey"
        options={{
          title: 'Discover Survey',
        }}
      />
       <Tabs.Screen
        name="mypage-hairstyle"
        options={{
          title: 'MyPage Hairstyle',
        }}
      />
       <Tabs.Screen
        name="mypage-hairshop"
        options={{
          title: 'MyPage Hairshop',
        }}
      />
    </Tabs>
    // null // 탭 레이아웃을 비활성화하기 위해 null 반환 또는 다른 레이아웃 반환
  );
}
