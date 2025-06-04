import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScrollView 
      style={{ flex: 1 }}
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ flex: 1 }}>
        {/* 위쪽 절반 */}
        <View style={{ flex: 1.5, backgroundColor: '#FFBCC2', justifyContent: 'center', alignItems: 'center' }}>
          <Image source={require('../../assets/logo.png')} style={styles.image} />
        </View>

        {/* 아래쪽 절반 */}
        <View style={{
          flex: 1,
          backgroundColor: 'white',
          justifyContent: 'flex-start',
          alignItems: 'center',
          gap: 25,
          paddingBottom: 30
        }}>
          <Text style={{ fontSize: 30, marginTop: 40, fontWeight: 'bold', color: '#3F414E' }}>
            We are What we do
          </Text>
          <Text style={{ color: "#A1A4B2", fontSize: 16 }}>
            Crafting Your Perfect Hair Style with AI
          </Text>

          <TouchableOpacity style={styles.button} onPress={() => router.push('/signup')}>
            <Text style={styles.buttonText}>SIGN UP</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', marginTop: 10 }}>
            <Text style={{ color: '#A1A4B2', fontSize: 14 }}>ALREADY HAVE AN ACCOUNT?</Text>
            <TouchableOpacity onPress={() => router.push('/signin')}>
              <Text style={{ color: '#FFBCC2', fontSize: 14, fontWeight: '500' }}>  LOG IN</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '90%',
    backgroundColor: '#FFBCC2',
    paddingVertical: 17,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#F6F1FB',
    fontSize: 16,
    fontWeight: '500',
  },
  image: {
    width: 220,
    height: 220,
    resizeMode: 'contain',
  },
});
