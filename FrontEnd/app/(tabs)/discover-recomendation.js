/// DiscoverRecomendation 화면: 추천된 헤어 스타일 + 해당 스타일별 추천 미용실 리스트 보여줌

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Linking } from 'react-native';
import api from '../config/api';

export default function DiscoverRecomendation() {
  const router = useRouter();
  const [selectedTab, setselectedTab] = useState('DISCOVER');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hairList, setHairList] = useState([]);
  const [hairshopMap, setHairshopMap] = useState({});
  const [step, setStep] = useState(0);
  const [resultData, setResultData] = useState(null);

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

        api.get(`/user/analysis-results/${requestId}`)
          .then(resultRes => {
            console.log('[DEBUG] 분석 결과 데이터:', resultRes.data);
            if (resultRes.data && resultRes.data.length > 0) {
              setResultData(resultRes.data[0]);
            }
          })
          .catch(resultErr => {
            console.error('[ERROR] 분석 결과 불러오기 실패:', resultErr);
          });

        api.get(`/user/hair-recommendations/${requestId}`)
          .then(res2 => {
            const hairs = res2.data.slice(0, 4); // 최대 4개까지만 가져오기
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

  useEffect(() => {
    loadRecommendations();
  }, []);

  const totalPages = hairList.length;
  const currentHair = hairList[step] || null;
  const currentHairshops = currentHair ? hairshopMap[currentHair.hair_rec_id] || [] : [];

  const goNext = () => { if (step < totalPages - 1) setStep(step + 1); };
  const goPrev = () => { if (step > 0) setStep(step - 1); };

  // 헤어스타일 저장 토글 함수
  const toggleSaveHair = async (hairRecId) => {
    try {
      const response = await api.put(`/user/hair-recommendations/${hairRecId}/toggle-save`);
      // 현재 헤어의 저장 상태 업데이트
      setHairList(prevList => 
        prevList.map(hair => 
          hair.hair_rec_id === hairRecId 
            ? { ...hair, is_saved: response.data.is_saved }
            : hair
        )
      );
    } catch (error) {
      console.error('[ERROR] 헤어 저장 상태 토글 실패:', error);
      Alert.alert('오류', '헤어 저장 상태 변경에 실패했습니다.');
    }
  };

  // 미용실 저장 토글 함수
  const toggleSaveHairshop = async (hairshopRecId) => {
    try {
      const response = await api.put(`/user/hairshop-recommendations/${hairshopRecId}/toggle-save`);
      // 현재 미용실의 저장 상태 업데이트
      setHairshopMap(prevMap => {
        const newMap = { ...prevMap };
        Object.keys(newMap).forEach(hairId => {
          newMap[hairId] = newMap[hairId].map(shop =>
            shop.hairshop_rec_id === hairshopRecId
              ? { ...shop, is_saved: response.data.is_saved }
              : shop
          );
        });
        return newMap;
      });
    } catch (error) {
      console.error('[ERROR] 미용실 저장 상태 토글 실패:', error);
      Alert.alert('오류', '미용실 저장 상태 변경에 실패했습니다.');
    }
  };

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
          {['DISCOVER'].map((tab) => (
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
              <View style={{ alignItems: 'center', marginTop: 10, marginBottom: 20 }}>
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
              <Text style={styles.styleText}>{currentHair.hair_name}</Text>
              <View style={styles.imageContainer}>
                {(!currentHair.simulation_image_url || currentHair.simulation_image_url === 'dummy.jpg') ? (
                  <View style={styles.noImageContainer}>
                    <Text style={styles.noImageText}>이미지 준비 중</Text>
                    <TouchableOpacity 
                      onPress={loadRecommendations}
                      style={styles.refreshButton}
                    >
                      <Text style={styles.refreshButtonText}>새로고침</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Image source={{ uri: currentHair.simulation_image_url }} style={styles.exampleImage} />
                )}
              </View>
              <View style={styles.saveButtonContainer}>
                <TouchableOpacity 
                  onPress={() => toggleSaveHair(currentHair.hair_rec_id)}
                  style={styles.saveButton}
                >
                  <Feather
                    name="bookmark"
                    size={24}
                    color={currentHair.is_saved ? "#FF6B7A" : "#FFD6DB"}
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.resultText}>{currentHair.description}</Text>
              <Text style={{ color: '#FFBCC2', textAlign: 'center', marginTop: 10 }}>추천 미용실</Text>
              {currentHairshops.length === 0 ? (
                <Text style={{ textAlign: 'center', color: '#888', marginTop: 10 }}>추천 미용실이 없습니다.</Text>
              ) : (
                currentHairshops.map((shop, idx) => (
                  <View key={idx} style={styles.hairshopBox}>
                    <View style={styles.hairshopHeader}>
                      <TouchableOpacity
                        onPress={() =>
                          Linking.openURL(`https://map.naver.com/v5/search/${encodeURIComponent(shop.hairshop)}`)
                        }>
                        <Text style={styles.hairshopName}>{shop.hairshop}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => toggleSaveHairshop(shop.hairshop_rec_id)}
                        style={styles.saveButton}
                      >
                        <Feather
                          name="bookmark"
                          size={20}
                          color={shop.is_saved ? "#FF6B7A" : "#FFD6DB"}
                        />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.hairshopInfo}>
                      리뷰수: {shop.review_count} | 평점: {shop.mean_score?.toFixed(2)}
                    </Text>
                    {shop.associated_hair_name && (
                      <Text style={styles.hairshopInfo}>추천 헤어스타일: {shop.associated_hair_name}</Text>
                    )}
                  </View>
                ))
              )}
              <TouchableOpacity
                onPress={() => router.push('/discover-result')}
                style={styles.goToResultButton}
              >
                <Text style={styles.goToResultButtonText}>분석 결과 확인하기</Text>
              </TouchableOpacity>
            </>
          ) : null}
          {/* 설문 링크 섹션 추가 */}
          {!loading && !error && hairList.length > 0 && step === totalPages - 1 && (
            <View style={styles.surveyContainer}>
              <Text style={styles.surveyText}>추천 결과는 만족스러우셨나요?</Text>
              <Text style={styles.surveyText}>서비스 개선을 위한 소중한 의견을 들려주세요!</Text>
              <TouchableOpacity onPress={() => Linking.openURL('https://docs.google.com/forms/d/e/1FAIpQLScYPRMcp8CZA6IQJWplyva7zmJBktZoHuqLrkDZ-InSpCnZKA/viewform?usp=header')}>
                <Text style={styles.surveyLinkText}>✨ 설문 참여하기 ✨</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
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
  buttonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
  },
  tabItem: {
    alignItems: 'center',
    paddingBottom: 5,
    marginHorizontal: 15,
  },
  tabText: {
    fontSize: 14,
    color: '#3F414E',
  },
  activeTabText: {
    fontWeight: 'bold',
  },
  underline: {
    marginTop: 15,
    height: 2,
    backgroundColor: '#A3A3A3',
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
    width: '100%',
    height: 480,
  },
  exampleImage: {
    width: '90%',
    height: 480,
    resizeMode: 'cover',
    borderRadius: 12,
  },
  resultText: {
    fontSize: 16,
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
    textAlign: 'center',
    flex: 1,
  },
  hairshopInfo: {
    fontSize: 13,
    color: '#777',
    textAlign: 'center',
  },
  saveButtonContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  saveButton: {
    padding: 5,
    marginTop: -5,
  },
  hairshopHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
    width: '100%',
  },
  goToResultButton: {
    backgroundColor: '#FFBCC2',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 30,
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  goToResultButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  noImageContainer: {
    width: '90%',
    height: 480,
    backgroundColor: '#F6F1FB',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    gap: 15,
  },
  noImageText: {
    color: '#FFBCC2',
    fontSize: 16,
    fontWeight: 'bold',
  },
  refreshButton: {
    backgroundColor: '#FFBCC2',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  surveyContainer: {
    marginTop: 30,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  surveyText: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    marginBottom: 5,
  },
  surveyLinkText: {
    fontSize: 16,
    color: '#007BFF', // 링크 색상
    textDecorationLine: 'underline', // 밑줄
    marginTop: 10,
    fontWeight: 'bold',
  },
});
