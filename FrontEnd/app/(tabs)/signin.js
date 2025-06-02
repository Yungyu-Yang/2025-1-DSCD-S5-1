// app/signup.js
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Image, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SigninScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  const [isPasswordVisible, setPasswordVisible] = useState(false);
  
  const handleSignin = async () => {
    if (!email.trim()) {
      Alert.alert('알림', '이메일을 입력해 주세요.');
      return;
    }
    if (!isValidEmail(email)) {
      Alert.alert('알림', '이메일 형식이 올바르지 않습니다.');
      return;
    }
    if (!password.trim()) {
      Alert.alert('알림', '비밀번호를 입력해 주세요.');
      return;
    }

    try {
      setIsLoading(true);
      const response = await authService.login(email, password);
      
      // 토큰 저장
      if (response.token) {
        await AsyncStorage.setItem('userToken', response.token);
        Alert.alert('성공', '로그인되었습니다.');
        router.replace('/welcome');
      } else {
        throw new Error('토큰이 없습니다.');
      }
    } catch (error) {
      console.error('로그인 에러:', error);
      Alert.alert('오류', error.detail || '로그인에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/')}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Welcome Back!</Text>

          <TouchableOpacity style={styles.socialButton} onPress={() => console.log('Facebook')}>
            <View style={styles.socialButtonContent}>
              <Image source={require('../../assets/fblogo.png')} style={styles.socialIcon} />
              <Text style={styles.socialButtonText}>CONTINUE WITH FACEBOOK</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.socialButtonOutline} onPress={() => console.log('Google')}>
            <View style={styles.socialButtonContent}>
              <Image source={require('../../assets/Gglogo.png')} style={styles.socialIcon} />
              <Text style={styles.socialButtonTextOutline}>CONTINUE WITH GOOGLE</Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.dividerText}>
            OR LOGIN WITH EMAIL
          </Text>

          <View style={styles.inputContainer}>
            <View style={styles.inputWithIcon}>
              <TextInput
                placeholder="Email"
                style={styles.inputField}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
              {isValidEmail(email) && <Ionicons name="checkmark-circle" size={15} color="green" />}
            </View>
            <View style={[styles.inputWithIcon, {marginTop: 15}]}>
              <TextInput
                placeholder="Password"
                style={styles.inputField}
                secureTextEntry={!isPasswordVisible}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={()=> setPasswordVisible(prev => !prev)} style={{padding:8}}>
                <Ionicons
                  name={isPasswordVisible ? 'eye' : 'eye-off'}
                  size={20}
                  color='#A1A4B2'
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity onPress={handleSignin} style={styles.submitButton}>
            <Text style={styles.submitButtonText}>LOG IN</Text>
          </TouchableOpacity>

          <Text style={styles.forgotPassword}>Forgot Password?</Text>

          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>DON'T HAVE AN ACCOUNT?</Text>
            <TouchableOpacity onPress={() => router.push('/signup')}>
              <Text style={styles.signupLink}>SIGN UP</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 100,
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingBottom: 20,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 25,
    textAlign: 'center',
    marginBottom: 30,
    color: '#3F414E',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 50,
    height: 50,
    backgroundColor: 'white',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 50,
    borderColor: 'lightgray',
    borderWidth: 1,
    alignItems: 'center',
    zIndex: 1,
  },
  backButtonText: {
    fontSize: 20,
    color: 'black',
    fontWeight: 'bold',
  },
  socialButton: {
    width: '90%',
    backgroundColor: '#FFBCC2',
    paddingVertical: 17,
    borderRadius: 10,
    marginBottom: 15,
  },
  socialButtonOutline: {
    width: '90%',
    paddingVertical: 17,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F2F2F2',
    marginBottom: 20,
  },
  socialButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  socialButtonText: {
    color: '#F6F1FB',
    fontWeight: '500',
    fontSize: 14,
  },
  socialButtonTextOutline: {
    color: '#3F414E',
    fontWeight: '500',
    fontSize: 14,
  },
  dividerText: {
    color: '#A1A4B2',
    fontWeight: '600',
    fontSize: 13,
    marginBottom: 20,
  },
  inputContainer: {
    width: '90%',
    marginBottom: 20,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F3F7',
    paddingHorizontal: 12,
    height: 50,
    borderRadius: 10,
  },
  inputField: {
    flex: 1,
    fontSize: 16,
  },
  submitButton: {
    width: '90%',
    backgroundColor: '#FFBCC2',
    paddingVertical: 17,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#F6F1FB',
    fontSize: 16,
    fontWeight: '500',
  },
  forgotPassword: {
    marginTop: 15,
    fontWeight: '500',
    color: '#3F414E',
    fontSize: 14,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  signupText: {
    color: '#A1A4B2',
    fontWeight: '500',
    fontSize: 14,
  },
  signupLink: {
    color: '#FFBCC2',
    fontWeight: '500',
    fontSize: 14,
    marginLeft: 5,
  },
});
