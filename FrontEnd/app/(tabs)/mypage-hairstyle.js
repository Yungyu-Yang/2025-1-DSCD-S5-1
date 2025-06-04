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
      console.log('[INFO] 헤어 저장 상태 토글 성공:', response.data); // { "hair_rec_id": ..., "is_saved": true/false }

      // 상태 업데이트: 해당 항목의 is_saved 상태만 변경
      setSavedHairstyles(prevList =>
        prevList.map(hair =>
          hair.hair_rec_id === hairRecId ? { ...hair, is_saved: response.data.is_saved } : hair
        )
      );
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
        <TouchableOpacity onPress={() => router.back()}>
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
          <Text style={[styles.tabText, pathname === '/mypage-hairstyle' && styles.activeTabText]}>Hairstyle</Text>
          {pathname === '/mypage-hairstyle' && <View style={styles.underline} />}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('./mypage-hairshop')}
          style={styles.tabItem}>
          <Text style={[styles.tabText, pathname === 'mypage-hairshop' && styles.activeTabText]}>Hairshop</Text>
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
          <View style={styles.hairstyleListContainer}>
            {savedHairstyles.map((style) => (
              <View key={style.hair_rec_id} style={styles.styleCard}>
                <View style={styles.styleCardHeader}>
                  <Text style={styles.styleName}>{style.hair_name}</Text>
                  <TouchableOpacity onPress={() => toggleSaveHair(style.hair_rec_id)}>
                    <Feather
                      name={'bookmark'}
                      size={24}
                      color={style.is_saved ? "#FF6B7A" : "#FFD6DB"}
                    />
                  </TouchableOpacity>
                </View>
                <Image
                  source={{ uri: style.simulation_image_url || '../../assets/style_example.png' }}
                  style={styles.styleImage}
                />
              </View>
            ))}
          </View>
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
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
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
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: 'white',
    marginHorizontal: 0,
    marginBottom: 0,
    marginTop: 10,
  },
  tabText: {
    fontSize: 14,
    color: '#aaa',
  },
  activeTabText: {
    fontWeight: 'bold',
    color: '#FFBCC2',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginHorizontal: 0,
    marginBottom: 10,
  },
  imageContainer: {
    alignSelf: 'center'
  },
  styleCard: {
    backgroundColor: '#FFEEEF',
    marginHorizontal: '1.5%',
    marginBottom: 15,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    width: '47%',
  },
  styleImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
    borderRadius: 8,
    marginBottom: 10,
  },
  styleName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'black',
    textAlign: 'center',
    flex: 1,
  },
  underline: {
    marginTop: 3,
    top: 8,
    height: 2,
    backgroundColor: '#FFBCC2',
    width: '100%',
  },
  tabItem: {
    alignItems: 'center',
    paddingHorizontal: 10,
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
  hairstyleListContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  styleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 5,
    marginBottom: 5,
  },
});

