import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

export default function HomeDiscover() {
  const router = useRouter();
  const [selectedTab] = useState('DISCOVER');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/welcome')}>
          <Image source={require('../../assets/logo2.png')} style={styles.logoimage} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/mypage-hairstyle')}>
          <Image source={require('../../assets/mypage.png')} style={styles.mypageimage} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <View style={[styles.tabItem, styles.activeTabItem]}>
          <Text style={[styles.tabText, styles.activeTabText]}>DISCOVER</Text>
        </View>
      </View>
      <View style={styles.horizontalLine} />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.text}>
          얼굴형을 분석하고{'\n'}
          {'\n'}
          최적의 헤어스타일을 탐색해보세요!
        </Text>
        <View style={styles.imageContainer}>
          <Image source={require('../../assets/example.png')} style={styles.exampleImage} />
          {/* 선 1 */}
          <View style={[styles.line, { top: 140, right: 47, width: '25%' }]} />
          {/* 선 2 */}
          <View style={[styles.line, { top: 163, left: 125, transform: [{ rotate: '-50deg' }] }]} />
          {/* 점 1 */}
          <View style={[styles.dot, { top: 185, left: 172 }]} />
          {/* 선 3 */}
          <View style={[styles.line, { top: 110, left: 10 }]} />
          {/* 선 4 */}
          <View style={[styles.line2, { top: 125, left: 62, transform: [{ rotate: '50deg' }] }]} />
          {/* 점 2 */}
          <View style={[styles.dot, { top: 136, left: 90 }]} />
        </View>
        <TouchableOpacity onPress={() => router.push('./discover-survey')} style={styles.startButton}>
          <View style={styles.startButtonContent}>
            <Text style={styles.startButtonText}>GET STARTED</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingTop: 15,
    paddingBottom: 5,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabItem: {
    borderBottomColor: '#A3A3A3',
  },
  tabText: {
    fontSize: 14,
    color: '#3F414E',
    fontWeight: '400',
  },
  activeTabText: {
    fontWeight: 'bold',
  },
  horizontalLine: {
    height: 1,
    backgroundColor: '#B7B7B7',
    width: '100%',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  text: {
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  imageContainer: {
    width: '90%',
    height: 350,
    backgroundColor: '#FFE0E3',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginVertical: 20,
    borderRadius: 20,
  },
  exampleImage: {
    resizeMode: 'cover',
    width: 200,
    height: 300,
  },
  startButton: {
    width: '90%',
    backgroundColor: '#FFBCC2',
    paddingVertical: 17,
    borderRadius: 10,
    marginTop: 20,
    marginHorizontal: 20,
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F6F1FB',
  },
  startButtonContent: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  line: {
    position: 'absolute',
    width: 60,
    height: 2,
    backgroundColor: 'white',
  },
  line2: {
    position: 'absolute',
    width: 40,
    height: 2,
    backgroundColor: 'white',
  },
  dot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
  },
});
