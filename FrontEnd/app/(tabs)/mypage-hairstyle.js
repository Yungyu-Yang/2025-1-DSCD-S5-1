import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { authService } from '../services/authService';
import api from '../config/api';
import { Feather } from '@expo/vector-icons';

export default function MyPageHairstyle() {
  const router = useRouter();
  const pathname = usePathname();
  const [userProfile, setUserProfile] = useState(null);
  const [savedHairstyles, setSavedHairstyles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserProfile();
    loadSavedHairstyles();
  }, []);

  const loadUserProfile = async () => {
    try {
      setIsLoading(true);
      const profile = await authService.getProfile();
      setUserProfile(profile);
    } catch (error) {
      Alert.alert('오류', '프로필 정보를 불러오는데 실패했습니다.');
      // 로그인되지 않은 경우 로그인 화면으로 이동
      if (error.response?.status === 401) {
        router.push('/signin');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadSavedHairstyles = async () => {
    try {
      const response = await api.get('/user/saved-hairstyles');
      setSavedHairstyles(response.data);
    } catch (error) {
      console.error('[ERROR] 저장된 헤어스타일 불러오기 실패:', error);
      Alert.alert('오류', '저장된 헤어스타일 목록을 불러오는데 실패했습니다.');
    }
  };

  // 헤어스타일 저장 상태를 토글하는 함수
  const toggleSaveHair = async (hairRecId) => {
    try {
      const response = await api.put(`/user/hair-recommendations/${hairRecId}/toggle-save`);
      console.log('[INFO] 헤어 저장 상태 토글 성공:', response.data);
      // 저장 해제 시 목록에서 제거
      if (!response.data.is_saved) {
        setSavedHairstyles(prevList => prevList.filter(hair => hair.hair_rec_id !== hairRecId));
      }
      // 저장 시에는 이미 목록에 있으므로 별도 추가 로직 불필요 (loadSavedHairstyles에서 가져옴)
    } catch (error) {
      console.error('[ERROR] 헤어 저장 상태 토글 실패:', error);
      Alert.alert('오류', '헤어 저장 상태 변경에 실패했습니다.');
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      Alert.alert('알림', '로그아웃되었습니다.');
      router.push('/signin');
    } catch (error) {
      Alert.alert('오류', '로그아웃에 실패했습니다.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/home-discover')}>
          <Feather name="chevron-left" size={24} color="white" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/welcome')}>
          <Image source={require('../../assets/logo2.png')} style={styles.logoimage} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/mypage-hairstyle')}>
          <Image source={require('../../assets/mypage.png')} style={styles.mypageimage} />
        </TouchableOpacity>
      </View>
      <Text style={{ fontSize: 20, marginTop: 40, left: 20 }}>마이페이지</Text>

      <View style={styles.profile}></View>

      {/* 마이페이지 카드 */}
      <View style={styles.profileCard}>
        <Image source={require('../../assets/profile.png')} style={styles.profileIcon} />
        <View>
          {userProfile ? (
            <>
              <Text style={styles.profileText}>{userProfile.nickname}</Text>
              <Text style={styles.profileText}>{userProfile.email}</Text>
            </>
          ) : (
            <Text style={styles.profileText}>로딩 중...</Text>
          )}
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      </View>

      {/* 탭 버튼 */}
      <View style={styles.tabs}>
        <TouchableOpacity onPress={() => router.push('/mypage-hairstyle')}
          style={styles.tabItem}>
          <Text style={[styles.tabText, pathname === '/mypage-hairstyle' && styles.activeTab]}>Hairstyle</Text>
          {pathname === '/mypage-hairstyle' && <View style={styles.underline} />}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('./mypage-hairshop')}
          style={styles.tabItem}>
          <Text style={[styles.tabText, pathname === 'mypage-hairshop' && styles.activeTab]}>Hairshop</Text>
          {pathname === '/mypage-hairshop' && <View style={styles.underline} />}
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />
      <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#FFBCC2" style={{ marginTop: 40 }} />
        ) : savedHairstyles.length === 0 ? (
          <Text style={{ textAlign: 'center', marginTop: 20, color: '#888' }}>저장된 헤어스타일이 없습니다.</Text>
        ) : (
          savedHairstyles.map((style) => (
            <View key={style.hair_rec_id} style={styles.styleCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingHorizontal: 10 }}>
                 <Text style={styles.styleName}>{style.hair_name}</Text>
                 <TouchableOpacity onPress={() => toggleSaveHair(style.hair_rec_id)}>
                   <Feather
                     name={'bookmark'} // 저장된 항목이므로 항상 채워진 북마크 아이콘
                     size={24}
                     color={'#FFBCC2'}
                   />
                 </TouchableOpacity>
               </View>
              <Image
                source={{ uri: style.simulation_image_url || '../../assets/style_example.png' }}
                style={styles.styleImage}
              />
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 55,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    alignItems: 'center',
    backgroundColor: '#FFBCC2'
  },
  logoimage: {
    width: 160,
    height: 45,
    resizeMode: 'contain',
  },
  mypageimage: {
    width: 34,
    height: 33,
    resizeMode: 'contain',
  },

  profileCard: {
    backgroundColor: '#FFEFF1',
    borderRadius: 10,
    margin: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  profileIcon: {
    width: 70,
    height: 70,
    resizeMode: 'contain',
    borderRadius: 10
  },
  profileText: {
    fontSize: 16,
    color: '#3F414E',
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
    gap: 15,
  },
  tabText: {
    fontSize: 16,
    color: '#FF8994',
  },
  activeTab: {
    color: '#FF8994',
  },
  divider: {
    height: 1,
    backgroundColor: '#D9D9D9',
    marginHorizontal: 20,
    marginBottom: 10,
  },
  imageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center'
  },
  styleImage1: {
    width: 103,
    height: 106,
    alignSelf: 'center',
    marginBottom: 15
  },
  styleCard1: {
    backgroundColor: '#FFEEEF',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 15,
    borderRadius: 10,
    width: 152,
    height: 188
  },
  underline: {
    marginTop: 3,
    top: 8,
    height: 2,
    width: '100%',
    backgroundColor: '#CCCCCC',
  },
  tabItem: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  logoutButton: {
    position: 'absolute',
    right: 20,
    top: 20,
    padding: 8,
  },
  logoutText: {
    color: '#FF8994',
    fontSize: 14,
  },
  styleCard: {
    backgroundColor: '#FFEEEF',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  styleImage: {
    width: 150,
    height: 150,
    resizeMode: 'cover',
    borderRadius: 8,
    marginBottom: 10,
  },
  styleName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3F414E',
  },
});

