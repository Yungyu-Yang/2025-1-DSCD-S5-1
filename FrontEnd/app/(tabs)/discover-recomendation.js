/// DiscoverRecomendation 화면: 추천된 헤어 스타일 + 해당 스타일별 추천 미용실 리스트 보여줌

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import api from '../config/api';

export default function DiscoverRecomendation() {
  const router = useRouter();
  const [selectedTab, setselectedTab] = useState('DISCOVER');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hairList, setHairList] = useState([]);
  const [hairshopMap, setHairshopMap] = useState({});
  const [step, setStep] = useState(0);

  const loadRecommendations = () => {
    setLoading(true);
    setError(null);
    setHairList([]);
    setHairshopMap({});
    setStep(0);

    api.get('/user/latest-request-id')
      .then(res => {
        const requestId = res.data.request_id;
        if (!requestId) {
          setError('추천 내역이 없습니다.');
          setLoading(false);
          return;
        }
        api.get(`/user/hair-recommendations/${requestId}`)
          .then(res2 => {
            const hairs = res2.data;
            setHairList(hairs);
            if (hairs.length === 0) {
              setError('추천된 헤어가 없습니다.');
              setLoading(false);
              return;
            }
            Promise.all(
              hairs.map(hair =>
                api.get(`/user/hairshop-recommendations/${hair.hair_rec_id}`)
                  .then(res3 => ({ hair_rec_id: hair.hair_rec_id, shops: res3.data }))
                  .catch(() => ({ hair_rec_id: hair.hair_rec_id, shops: [] }))
              )
            ).then(results => {
              const map = {};
              results.forEach(r => { map[r.hair_rec_id] = r.shops; });
              setHairshopMap(map);
              setLoading(false);
            });
          })
          .catch(() => {
            setError('헤어 추천 정보를 불러오지 못했습니다.');
            setLoading(false);
          });
      })
      .catch(() => {
        setError('최신 요청 정보를 불러오지 못했습니다.');
        setLoading(false);
      });
  };

  const toggleSaveHair = (hairRecId, currentSavedStatus) => {
    api.put(`/user/hair-recommendations/${hairRecId}/toggle-save`)
      .then(res => {
        console.log('[INFO] 헤어 저장 상태 토글 성공:', res.data);
        // hairList 상태 업데이트
        setHairList(prevList =>
          prevList.map(hair =>
            hair.hair_rec_id === hairRecId ? { ...hair, is_saved: res.data.is_saved } : hair
          )
        );
      })
      .catch(err => {
        console.error('[ERROR] 헤어 저장 상태 토글 실패:', err);
        Alert.alert('오류', '헤어 저장 상태 변경에 실패했습니다.');
      });
  };

  const toggleSaveHairshop = (hairshopRecId, currentSavedStatus) => {
    api.put(`/user/hairshop-recommendations/${hairshopRecId}/toggle-save`)
      .then(res => {
        console.log('[INFO] 미용실 저장 상태 토글 성공:', res.data);
        // hairshopMap 상태 업데이트
        setHairshopMap(prevMap => {
          const newMap = { ...prevMap };
          // 현재 hair_rec_id를 찾아서 해당 샵의 is_saved 상태 업데이트
          for (const hairRecId in newMap) {
            newMap[hairRecId] = newMap[hairRecId].map(shop =>
              shop.hairshop_rec_id === hairshopRecId ? { ...shop, is_saved: res.data.is_saved } : shop
            );
          }
          return newMap;
        });
      })
      .catch(err => {
        console.error('[ERROR] 미용실 저장 상태 토글 실패:', err);
        Alert.alert('오류', '미용실 저장 상태 변경에 실패했습니다.');
      });
  };

  useEffect(() => {
    loadRecommendations();
  }, []);

  const totalPages = hairList.length;
  const currentHair = hairList[step] || null;
  const currentHairshops = currentHair ? hairshopMap[currentHair.hair_rec_id] || [] : [];

  const goNext = () => { if (step < totalPages - 1) setStep(step + 1); };
  const goPrev = () => { if (step > 0) setStep(step - 1); };

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/welcome')}>
          <Image source={require('../../assets/logo2.png')} style={styles.logoimage} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/mypage-hairstyle')}>
          <Image source={require('../../assets/mypage.png')} style={styles.mypageimage} />
        </TouchableOpacity>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.buttonContainer}>
          {['DISCOVER', 'SIMULATION', 'HAIRSHOP'].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => {
                setselectedTab(tab);
                if (tab === 'DISCOVER') router.push('/home-discover');
                else if (tab === 'SIMULATION') router.push('/home-simulation');
                else router.push('/home-hairshop');
              }}
              style={styles.tabItem}>
              <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>
                {tab}
              </Text>
              {selectedTab === tab && <View style={styles.underline} />}
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.horizontalLine} />
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={styles.text}>다음과 같은 헤어를 추천합니다.</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#FFBCC2" style={{ marginTop: 40 }} />
          ) : error ? (
            <>
              <Text style={{ color: 'red', textAlign: 'center', marginTop: 40 }}>{error}</Text>
              <TouchableOpacity
                onPress={loadRecommendations}
                style={{
                  alignSelf: 'center',
                  marginTop: 20,
                  backgroundColor: '#FFBCC2',
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>다시 불러오기</Text>
              </TouchableOpacity>
            </>
          ) : currentHair ? (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}>
                <Text style={styles.styleText}>{currentHair.hair_name}</Text>
                <TouchableOpacity onPress={() => toggleSaveHair(currentHair.hair_rec_id, currentHair.is_saved)} style={{ marginLeft: 10 }}>
                  <Feather
                    name={currentHair.is_saved ? 'bookmark' : 'bookmark'}
                    size={24}
                    color={currentHair.is_saved ? '#FFBCC2' : '#ccc'}
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.imageContainer}>
                {(!currentHair.simulation_image_url || currentHair.simulation_image_url === 'dummy.jpg') ? (
                  <View style={{ width: 325, height: 300, backgroundColor: 'transparent' }} />
                ) : (
                  <Image source={{ uri: currentHair.simulation_image_url }} style={styles.exampleImage} />
                )}
              </View>
              <Text style={styles.resultText}>{currentHair.description}</Text>
              <Text style={{ color: '#FFBCC2', textAlign: 'center', marginTop: 10 }}>추천 미용실</Text>
              {currentHairshops.length === 0 ? (
                <Text style={{ textAlign: 'center', color: '#888', marginTop: 10 }}>추천 미용실이 없습니다.</Text>
              ) : (
                currentHairshops.map((shop, idx) => (
                  <View key={idx} style={styles.hairshopBox}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.hairshopName}>{shop.hairshop}</Text>
                      <TouchableOpacity onPress={() => toggleSaveHairshop(shop.hairshop_rec_id, shop.is_saved)}>
                        <Feather
                          name={shop.is_saved ? 'bookmark' : 'bookmark'}
                          size={20}
                          color={shop.is_saved ? '#FFBCC2' : '#ccc'}
                        />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.hairshopInfo}>리뷰수: {shop.review_count} | 평점: {shop.mean_score?.toFixed(2)}</Text>
                  </View>
                ))
              )}
              <View style={{ alignItems: 'center', marginTop: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: 300 }}>
                  <TouchableOpacity onPress={goPrev} disabled={step === 0}>
                    <Feather name='chevron-left' size={20} color={step === 0 ? '#ccc' : '#FFBC22'} />
                  </TouchableOpacity>
                  <Text style={{ marginHorizontal: 20, color: '#FFBCC2' }}>{step + 1}/{totalPages}</Text>
                  <TouchableOpacity onPress={goNext} disabled={step === totalPages - 1}>
                    <Feather name='chevron-right' size={20} color={step === totalPages - 1 ? '#ccc' : '#FFBCC2'} />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          ) : null}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: 'white',
    alignItems: 'center',
  },
  logoimage: {
    width: 110,
    height: 40,
    resizeMode: 'contain',
  },
  mypageimage: {
    width: 30,
    height: 30,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: 'white',
  },
  tabItem: {
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  tabText: {
    fontSize: 14,
    color: '#aaa',
  },
  activeTabText: {
    fontWeight: 'bold',
    color: '#FFBCC2',
  },
  underline: {
    marginTop: 3,
    height: 2,
    backgroundColor: '#FFBCC2',
    width: '100%',
  },
  horizontalLine: {
    height: 1,
    backgroundColor: '#eee',
    marginHorizontal: 20,
  },
  text: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  styleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFBCC2',
    textAlign: 'center',
    marginBottom: 10,
  },
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  exampleImage: {
    width: 325,
    height: 300,
    resizeMode: 'cover',
    borderRadius: 12,
  },
  resultText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  hairshopBox: {
    marginHorizontal: 30,
    marginVertical: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FFBCC2',
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  hairshopName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#FFBCC2',
    marginBottom: 4,
  },
  hairshopInfo: {
    fontSize: 13,
    color: '#777',
  },
});
