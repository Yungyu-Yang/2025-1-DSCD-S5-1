import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../config/api';

export default function WelcomeScreen() {
  const router = useRouter();
  const [name, setName] = useState('사용자');

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await api.get('/user/info');
        setName(response.data.name);
      } catch (error) {
        console.error('Failed to fetch user info:', error);
      }
    };

    fetchUserInfo();
  }, []);

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* 위쪽 영역 */}
      <View style={styles.topSection}>
        <Image source={require('../../assets/logo.png')} style={styles.image} />
        <Text style={styles.WelcomeText}>
          안녕하세요 {name}님,{'\n'}
          Mohitto에 오신걸 환영해요!
        </Text>

        {/* 겹쳐진 동그라미 */}
        <View style={styles.circleContainer}>
          <View style={[styles.circle, { backgroundColor: '#FF8994', width: 430, height: 430, borderRadius: 215 }]} />
          <View style={[styles.circle, { backgroundColor: '#FFA3AC', width: 380, height: 380, borderRadius: 190 }]} />
          <View style={[styles.circle, { backgroundColor: '#FFBAC1', width: 330, height: 330, borderRadius: 165 }]} />
          <View style={[styles.circle, { backgroundColor: '#FFD0D5', width: 280, height: 280, borderRadius: 140 }]} />
        </View>
      </View>

      {/* 아래쪽 영역 */}
      <View style={styles.bottomSection}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => router.push('/home-discover')}
        >
          <Text style={styles.buttonText}>GET STARTED</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFBCC2',
  },
  scrollContent: {
    flexGrow: 1,
  },
  topSection: {
    flex: 2.2,
    backgroundColor: '#FFBCC2',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: -40,
  },
  bottomSection: {
    flex: 0.5,
    backgroundColor: '#FFABB3',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingBottom: 20,
    marginTop: 0,
    minHeight: 200,
  },
  WelcomeText: {
    color: '#3F4553',
    fontSize: 24,
    fontWeight: '400',
    textAlign: 'center',
  },
  circleContainer: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 160,
    marginBottom: -60,
  },
  circle: {
    position: 'absolute',
  },
  button: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    paddingVertical: 17,
    borderRadius: 10,
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
    color: '#3F414E',
    fontSize: 16,
    fontWeight: '500',
  },
  image: {
    width: 112,
    height: 81,
    top: 31,
    resizeMode: 'contain',
    alignSelf: 'center',
    marginTop: 50,
    marginBottom: 80,
  },
});
