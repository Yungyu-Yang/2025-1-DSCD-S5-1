import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* 위쪽 영역 */}
      <View style={styles.topSection}>
        <Image source={require('../../assets/logo.png')} style={styles.image} />
        <Text style={styles.WelcomeText}>
          안녕하세요 사용자님,{'\n'}
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
        <TouchableOpacity style={styles.button} onPress={() => router.push('/home-discover')}>
          <Text style={styles.buttonText}>GET STARTED</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFBCC2',
    alignItems: 'center',
  },
  topSection: {
    flex: 2.2,
    backgroundColor: '#FFBCC2',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  bottomSection: {
    flex: 0.5,
    backgroundColor: '#FFABB3',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 20,
    width: '100%',
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
    marginTop: 180,
    marginBottom: -60,
    // overflow: 'hidden'
  },
  circle: {
    position: 'absolute',
  },
  button: {
    width:'90%',
    backgroundColor: '#EBEAEC',
    paddingVertical: 20,
    paddingHorizontal: 135,
    borderRadius: 10,
    marginTop: 50,
  },
  buttonText: {
    color: '#3F414E',
    fontSize: 14,
    fontWeight: '400',
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
