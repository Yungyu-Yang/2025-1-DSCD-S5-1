import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../config/api';

export default function DiscoverResult() {
  const router = useRouter();
  const localSearchParams = useLocalSearchParams();
  const [selectedTab, setselectedTab] = useState('DISCOVER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(() => {
    if (localSearchParams?.resultData) {
      try {
        return JSON.parse(localSearchParams.resultData);
      } catch (e) {
        console.error('분석 결과 데이터 파싱 오류:', e);
        setError('분석 결과를 불러오는데 실패했습니다.');
        return null;
      }
    } else {
      setError('분석 결과 데이터가 없습니다.');
      return null;
    }
  });
  const [isRecommendationReady, setIsRecommendationReady] = useState(false);
  const [checkingRecommendations, setCheckingRecommendations] = useState(false);

  useEffect(() => {
    let checkInterval;

    if (checkingRecommendations && result?.request_id && !isRecommendationReady) {
      console.log('[INFO] 추천 결과 준비 확인 시작');
      checkInterval = setInterval(async () => {
        try {
          const response = await api.get(`/user/hair-recommendations/${result.request_id}`);
          console.log('[DEBUG] 추천 확인 응답:', response.data);
          if (response.data && response.data.length > 0) {
            console.log('[INFO] 추천 결과 준비 완료.');
            setIsRecommendationReady(true);
            setCheckingRecommendations(false);
            clearInterval(checkInterval);
          }
        } catch (err) {
          console.error('[ERROR] 추천 확인 중 오류:', err);
          if (err.response?.status === 404) {
            console.log('[INFO] 아직 추천 결과 없음 (404). 계속 확인.');
          } else {
          }
        }
      }, 5000);
    }

    return () => {
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, [checkingRecommendations, result?.request_id, isRecommendationReady]);

  useEffect(() => {
    if (result?.request_id) {
      setCheckingRecommendations(true);
    } else if (!error) {
      setError('분석 결과 데이터가 없습니다.');
    }
  }, [result?.request_id, error]);

  const handleTriggerRecommendation = () => {
    if (!result?.user_id || !result?.request_id) {
      const msg = 'user_id 또는 request_id가 없습니다.';
      console.error('[ERROR]', msg);
      setError(msg);
      return;
    }

    const payload = {
      user_id: result.user_id,
      request_id: result.request_id,
    };

    console.log('[DEBUG] 추천 요청 payload:', payload);

    Alert.alert(
      '추천 요청 시작',
      `현재 user_id: ${payload.user_id}, request_id: ${payload.request_id}\n\n합성이미지 생성에 평균적으로 3분 정도 소요됩니다.`,
      [
        {
          text: '확인',
          onPress: () => sendStableHairRequest(payload),
        },
        {
          text: '취소',
          style: 'cancel',
        }
      ]
    );
  };

  const sendGraphRAGRequest = (payload) => {
    api.post('/run-recommendation/', payload)
      .then(() => {
        console.log('[INFO] GraphRAG 추천 요청 성공');
        Alert.alert('성공', '추천이 생성되었습니다. 잠시 후 추천 결과를 확인해주세요.');
      })
      .catch(err => {
        const msg = err?.response?.data?.detail || err.message || '추천 요청 실패';
        console.error('[ERROR] GraphRAG 추천 요청 실패:', msg);
        setError(msg);
      });
  };

  const sendStableHairRequest = (payload) => {
    api.post('/run-stablehair/', payload)
      .then(() => {
        console.log('[INFO] 추천 요청 성공');
        Alert.alert('성공', '합성 요청을 성공적으로 보냈습니다. 잠시 후 추천 가져오기 버튼을 눌러 결과를 확인해주세요.');
      })
      .catch(err => {
        const msg = err?.response?.data?.detail || err.message || '추천 요청 실패';
        console.error('[ERROR] 추천 요청 실패:', msg);
        console.warn('[WARN] 합성 요청 중 오류 발생 (표시 안함):', err);
      });
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
          <TouchableOpacity
            onPress={() => {
              setselectedTab('DISCOVER');
              router.push('/home-discover');
            }}
            style={styles.tabItem}>
            <Text style={[styles.tabText, selectedTab === 'DISCOVER' && styles.activeTabText]}>
              DISCOVER
            </Text>
            {selectedTab === 'DISCOVER' && <View style={styles.underline} />}
          </TouchableOpacity>
        </View>
        <View style={styles.horizontalLine} />
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={styles.text}>얼굴형 분석을 완료했습니다.</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#FFBCC2" style={{ marginTop: 40 }} />
          ) : error ? (
            <>
              <Text style={{ color: 'red', textAlign: 'center', marginTop: 40 }}>{error}</Text>
              <TouchableOpacity
                onPress={() => router.push('/discover-camera')}
                style={{
                  alignSelf: 'center',
                  marginTop: 20,
                  backgroundColor: '#FFBCC2',
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 8
                }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>다시 불러오기</Text>
              </TouchableOpacity>
            </>
          ) : result ? (
            <>
              <View style={styles.imageContainer}>
                <Image source={{ uri: result.user_image_url }} style={styles.exampleImage} />
              </View>
              <View style={styles.resultBox}>
                <Text style={styles.resultText}><Text style={styles.resultLabel}>성별:</Text> {result.sex}</Text>
                <Text style={styles.resultText}><Text style={styles.resultLabel}>얼굴형:</Text> {result.face_type}</Text>
                <View style={styles.colorSection}>
                  <View style={styles.skinToneContainer}>
                    <Text style={[styles.resultText, styles.skinToneText]}><Text style={styles.resultLabel}>피부톤:</Text> {result.skin_tone}</Text>
                    <View style={[styles.colorBlock, { backgroundColor: result.skin_tone }]} />
                  </View>
                </View>
                <View style={styles.colorSection}>
                  <Text style={styles.resultText}><Text style={styles.resultLabel}>추천 염색:</Text></Text>
                  <View style={styles.colorBlocksContainer}>
                    {result.rec_color.split(',').map((color, index) => {
                      const colorMap = {
                        'Dark Choco': '#4B2E2B',
                        'Whale Deep Blue': '#002E5D',
                        'Dark Ash': '#3B3B3B',
                        'Dusty Ash': '#6E6E6E',
                        'Ash Taupe Gray': '#8B8589',
                        'Ash Rose': '#C48B9F',
                        'Matt Brown': '#5C4033',
                        'Ferry Violet': '#7F60A0',
                        'Ash Beige': '#D3C6B3',
                        'Milk Tea Gray': '#C2B7A3',
                        'Deep Bordo Rose': '#7A2937',
                        'Rose Pink': '#F4838A',
                        'Sunset Orange': '#FF7043',
                        'Ash Black': '#1B1B1B',
                        'Gold Brown': '#A67B2E',
                        'Ash Blue': '#607D8B',
                        'Pink Red': '#E53935',
                        'Red Brown': '#8B2500',
                        'Burgundy': '#800020',
                        'Red Wine': '#722F37'
                      };
                      return (
                        <View key={index} style={styles.colorItem}>
                          <Text style={styles.colorName}>{color.trim()}</Text>
                          <View 
                            style={[styles.colorBlock, { backgroundColor: colorMap[color.trim()] || '#000000' }]} 
                          />
                        </View>
                      );
                    })}
                  </View>
                </View>
                <Text style={styles.resultText}><Text style={styles.resultLabel}>요약:</Text> {result.summary}</Text>
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  onPress={() => router.push('/discover-recomendation')}
                  style={[styles.secondaryButton, !isRecommendationReady && { opacity: 0.5 }]}
                  disabled={!isRecommendationReady}
                >
                  <Text style={styles.buttonText}>추천 결과 확인하기</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleTriggerRecommendation}
                  style={[styles.primaryButton, !isRecommendationReady && { opacity: 0.5 }]}
                  disabled={!isRecommendationReady}
                >
                  <Text style={styles.buttonText}>추천 헤어 합성하기</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : null}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { height: 55, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15, alignItems: 'center', backgroundColor: '#FFBCC2' },
  logoimage: { width: 160, height: 45, resizeMode: 'contain' },
  mypageimage: { width: 34, height: 33, resizeMode: 'contain' },
  horizontalLine: { height: 1, backgroundColor: '#B7B7B7', width: '100%', marginTop: 0, bottom: 5 },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    gap: 12,
  },
  tabItem: { alignItems: 'center', paddingBottom: 5, marginHorizontal: 15 },
  tabText: { fontSize: 14, color: '#3F414E', fontWeight: '400' },
  activeTabText: { fontWeight: 'bold' },
  underline: { marginTop: 15, height: 2, width: '100%', backgroundColor: '#A3A3A3' },
  text: { fontSize: 16, fontWeight: '400', textAlign: 'center', top: 20 },
  imageContainer: { 
    width: '90%', 
    height: 400,
    top: 30, 
    borderColor: '#FFBCC2', 
    borderWidth: 2, 
    justifyContent: 'center', 
    alignItems: 'center', 
    alignSelf: 'center', 
    marginVertical: 20, 
    position: 'relative' 
  },
  exampleImage: { 
    resizeMode: 'cover', 
    width: '100%', 
    height: '100%' 
  },
  primaryButton: {
    backgroundColor: '#FFBCC2',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  secondaryButton: {
    backgroundColor: '#D6A7B1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  resultBox: {
    backgroundColor: '#F6F1FB',
    borderRadius: 15,
    marginHorizontal: 20,
    marginTop: 10,
    padding: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  resultText: {
    textAlign: 'center',
    marginTop: 25,
    fontSize: 16,
    lineHeight: 24,
  },
  resultLabel: {
    fontWeight: 'bold',
    color: '#FFBCC2',
  },
  colorSection: {
    alignItems: 'center',
    marginTop: 25,
    marginBottom: 5,
  },
  colorItem: {
    alignItems: 'center',
    marginHorizontal: 5,
  },
  colorName: {
    fontSize: 14,
    color: '#3F414E',
    marginBottom: 5,
  },
  colorBlock: {
    width: 40,
    height: 40,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  colorBlocksContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    gap: 20,
    paddingHorizontal: 10,
  },
  skinToneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  skinToneText: {
    marginTop: 0,
  },
});
