import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../config/api';

export default function DiscoverCamera({ route }) {
  const router = useRouter();
  const pathname = usePathname();
  const [selectedTab, setselectedTab] = useState('DISCOVER');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [photoUri, setPhotoUri] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(null);
  const [surveyData, setSurveyData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoading(true);
        // 설문 데이터 로드
        const storedData = await AsyncStorage.getItem('surveyData');
        console.log('저장된 설문 데이터:', storedData);
        
        if (!storedData) {
          console.log('설문 데이터가 없음');
          Alert.alert('알림', '설문을 먼저 완료해주세요.');
          router.replace('/discover-survey');
          return;
        }

        const parsedData = JSON.parse(storedData);
        console.log('파싱된 설문 데이터:', parsedData);
        
        if (!parsedData || Object.keys(parsedData).length === 0) {
          throw new Error('설문 데이터가 유효하지 않음');
        }
        
        setSurveyData(parsedData);

        // 인증 토큰 확인
        const storedToken = await AsyncStorage.getItem('userToken');
        if (!storedToken) {
          Alert.alert('알림', '로그인이 필요한 서비스입니다.');
          router.replace('/login');
          return;
        }
        setToken(storedToken);
        setIsAuthenticated(true);

        // 카메라 권한 요청
        await requestPermission();
      } catch (error) {
        console.error('초기화 중 오류:', error);
        Alert.alert('오류', '데이터를 불러오는 중 문제가 발생했습니다.');
        router.replace('/discover-survey');
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, []);

  const takePicture = async () => {
    try {
      const currentToken = await AsyncStorage.getItem('userToken');
      if (!currentToken) {
        Alert.alert('알림', '로그인이 필요한 서비스입니다.');
        router.replace('/login');
        return;
      }

      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.5,  // 이미지 품질 조정
          base64: false,
          exif: false,
          skipProcessing: true
        });
        setPhotoUri(photo.uri);
      }
    } catch (error) {
      console.error('사진 촬영 중 오류:', error);
      Alert.alert('오류', '사진 촬영 중 문제가 발생했습니다.');
    }
  };

  const handleAnalyze = async () => {
    try {
      if (!surveyData) {
        console.log('현재 surveyData 상태:', surveyData);
        Alert.alert('오류', '설문 데이터가 없습니다. 설문을 다시 진행해주세요.');
        router.replace('/discover-survey');
        return;
      }

      if (!photoUri) {
        Alert.alert('알림', '이미지를 먼저 촬영해주세요.');
        return;
      }

      const currentToken = await AsyncStorage.getItem('userToken');
      if (!currentToken) {
        Alert.alert('알림', '로그인이 필요한 서비스입니다.');
        router.replace('/login');
        return;
      }

      // 로딩 상태 표시
      Alert.alert('알림', '분석을 시작합니다. 잠시만 기다려주세요...');

      const formData = new FormData();
      // 필수 필드 추가
      formData.append('hair_length', surveyData.hair_length);
      formData.append('hair_type', surveyData.hair_type);
      formData.append('sex', surveyData.sex);
      formData.append('location', surveyData.location);
      formData.append('cheekbone', surveyData.cheekbone);
      formData.append('mood', surveyData.mood);
      formData.append('dyed', surveyData.dyed);
      formData.append('forehead_shape', surveyData.forehead_shape);
      formData.append('difficulty', surveyData.difficulty);
      formData.append('has_bangs', surveyData.has_bangs);
      
      // 이미지 추가
      const imageData = {
        uri: photoUri,
        name: 'user.jpg',
        type: 'image/jpeg',
      };
      formData.append('image', imageData);

      // 요청 데이터 로깅
      console.log('전송할 설문 데이터:', surveyData);
      console.log('이미지 데이터:', {
        uri: photoUri,
        name: 'user.jpg',
        type: 'image/jpeg',
      });

      // API 요청 설정
      const config = {
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30초 타임아웃 설정
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log('업로드 진행률:', percentCompleted + '%');
        },
      };

      console.log('API 요청 시작');
      const response = await api.post('/analyze-face', formData, config);
      console.log('API 응답:', response.data);

      if (response.data.success) {
        // 분석 완료 후 설문 데이터 삭제
        await AsyncStorage.removeItem('surveyData');
        
        Alert.alert('성공', '분석이 완료되었습니다.');
        router.push({
          pathname: '/discover-result',
          params: { 
            resultId: response.data.request_id,
            ...response.data
          }
        });
      } else {
        Alert.alert('오류', '분석 중 문제가 발생했습니다.');
      }
    } catch (error) {
      console.error('분석 중 오류:', error);
      if (error.response?.status === 401) {
        Alert.alert('오류', '인증이 만료되었습니다. 다시 로그인해주세요.');
        router.replace('/login');
      } else if (error.response?.status === 422) {
        Alert.alert('오류', '입력된 데이터가 올바르지 않습니다. 모든 항목을 입력해주세요.');
      } else if (error.message === 'Request timeout') {
        console.error('타임아웃 상세 정보:', {
          error: error,
          message: error.message,
          response: error.response,
        });
        Alert.alert('오류', '서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.');
      } else {
        Alert.alert('오류', '분석 중 문제가 발생했습니다.');
      }
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>로딩 중...</Text>
      </View>
    );
  }

  if (!permission?.granted) {
    return <Text>카메라 권한이 필요합니다.</Text>;
  }

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

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
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

        <View style={styles.cameraContainer}>
          <CameraView style={{ flex: 1 }} ref={cameraRef} facing='front' />
        </View>
        <View style={styles.controls}>
          <View style={styles.previewBox}>
            {photoUri && (
              <Image source={{ uri: photoUri }} style={styles.previewImage} />
            )}
          </View>
          <TouchableOpacity style={styles.shutterOuter} onPress={takePicture}>
          </TouchableOpacity>
        </View>
        <Text style={styles.text}>이마와 눈썹이 잘 보이도록 촬영해주세요.{'\n'}
          그림자가 지지 않도록 사진을 찍어주세요.
        </Text>
        <TouchableOpacity
          style={[styles.primaryButton]}
          onPress={handleAnalyze}
        >
          <Text style={styles.buttonText}>분석하기</Text>
        </TouchableOpacity>
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
  horizontalLine: {
    height: 1,
    backgroundColor: '#B7B7B7',
    width: '100%',
    marginTop: 0,
    bottom: 5
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 15,
  },
  tabItem: {
    alignItems: 'center',
    paddingBottom: 5,
    marginHorizontal: 15
  },
  tabText: {
    fontSize: 14,
    color: '#3F414E',
    fontWeight: '400',
  },
  activeTabText: {
    fontWeight: 'bold',
  },
  underline: {
    marginTop: 15,
    height: 2,
    width: '100%',
    backgroundColor: '#A3A3A3',
  },
  text: {
    fontSize: 15,
    fontWeight: 400,
    textAlign: 'center',
    color: '#666666',
    lineHeight: 22,
    marginTop: 10,
    marginBottom: 20,
  },
  cameraContainer: {
    width: 369,
    height: 400,
    aspectRatio: 3 / 4,
    alignSelf: 'center',
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#B7B7B7',
  },
  camera: {
    flex: 1,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  previewBox: {
    width: 40,
    height: 40,
    backgroundColor: '#000000',
    overflow: 'hidden',
    borderColor: '#FFBCC2',
    borderWidth: 4,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  shutterOuter: {
    width: 70,
    height: 70,
    backgroundColor: '#FFBCC2',
    borderRadius: 35,
    justifyContent: 'center',
    alignSelf: 'center',
    alignItems: 'center',
    borderColor: '#FCE3E6',
    borderWidth: 3,
    marginHorizontal: 100,
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
    marginHorizontal: 20,
    marginBottom: 20,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});