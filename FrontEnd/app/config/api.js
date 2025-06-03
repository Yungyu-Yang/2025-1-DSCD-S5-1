import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API 기본 URL 설정
// const API_BASE_URL = 'http://10.0.2.2:8000';  // Android 에뮬레이터용
// const API_BASE_URL = 'http://localhost:8000';  // iOS 시뮬레이터용
// const API_BASE_URL = 'http://127.0.0.1:8000';  // 웹용
// const API_BASE_URL = 'http://43.202.9.255:8000'; // 인스턴스 A의 퍼블릭 IP 사용
const API_BASE_URL = 'http://43.201.129.41:8000'; // 본인 ip 주소로 변경하면 됩니다. ipconfig 명령어로 확인.

console.log('API Base URL:', API_BASE_URL);

// axios 인스턴스 생성
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 10000, // 10초 타임아웃 설정
  withCredentials: true, // CORS 요청에 credentials 포함
});

// 요청 인터셉터 - 토큰 추가
api.interceptors.request.use(
  async (config) => {
    console.log('API Request:', {
      url: config.url,
      method: config.method,
      data: config.data,
      headers: config.headers,
    });
    
    const token = await AsyncStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - 에러 처리
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      status: response.status,
      data: response.data,
    });
    return response;
  },
  async (error) => {
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout');
      return Promise.reject({ message: '요청 시간이 초과되었습니다.' });
    }

    if (!error.response) {
      console.error('Network Error:', error);
      return Promise.reject({ message: '서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.' });
    }

    console.error('API Response Error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('access_token');
    }
    
    const errorMessage = error.response?.data?.detail || 
                        error.response?.data?.message || 
                        error.message;
    return Promise.reject({ message: errorMessage });
  }
);

export default api; 