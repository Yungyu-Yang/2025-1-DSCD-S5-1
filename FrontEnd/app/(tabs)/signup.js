import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Image, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import Checkbox from 'expo-checkbox';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../services/authService';

function TermsCheck({ isChecked, setChecked }) {
  return (
    <View style={styles.checkboxRow}>
      <Text style={styles.policyText}>
        i have read the <Text style={styles.linkText}> Privace Policy</Text>
      </Text>
      <Checkbox
        value={isChecked}
        onValueChange={setChecked}
        color={isChecked ? '#FFBCC2' : '#A1A4B2'}
      />
    </View>
  );
}

export default function SignUpScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isChecked, setChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isValidName = (name) => name.trim().length >= 2;

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSignUp = async () => {
    if (!email.trim()) {
      Alert.alert('알림', '이메일을 입력해 주세요.');
      return;
    }
    if (!isValidEmail(email)) {
      Alert.alert('알림', '이메일 형식이 올바르지 않습니다.');
      return;
    }
    if (!name.trim()) {
      Alert.alert('알림', '이름을 입력해 주세요.');
      return;
    }
    if (!isValidName(name)) {
      Alert.alert('알림', '이름은 2자 이상이어야 합니다.');
      return;
    }
    if (!password.trim()) {
      Alert.alert('알림', '비밀번호를 입력해 주세요.');
      return;
    }
    if (!isChecked) {
      Alert.alert('알림', '개인정보 처리방침에 동의해 주세요.');
      return;
    }

    try {
      setIsLoading(true);
      console.log('회원가입 시도:', { email, password, name });
      const response = await authService.signup(email, password, name);
      console.log('회원가입 응답:', response);
      Alert.alert('성공', '회원가입이 완료되었습니다.');
      router.push('/signin');
    } catch (error) {
      console.error('회원가입 에러:', error);
      Alert.alert('오류', error.detail || error.message || '회원가입에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const [isPasswordVisible, setPasswordVisible] = useState(false);

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

          <Text style={styles.title}>Create your account</Text>

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
                placeholder="Name"
                style={styles.inputField}
                value={name}
                onChangeText={setName}
              />
              {isValidName(name) && (
                <Ionicons name="checkmark-circle" size={15} color="green" />
              )}
            </View>
            <View style={[styles.inputWithIcon, {marginTop: 15}]}>
              <TextInput
                placeholder="Email"
                style={styles.inputField}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
              {isValidEmail(email) && (
                <Ionicons name="checkmark-circle" size={15} color="green" />
              )}
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

          <View style={styles.termsContainer}>
            <TermsCheck isChecked={isChecked} setChecked={setChecked} />
          </View>
          
          <TouchableOpacity onPress={handleSignUp} style={styles.submitButton}>
            <Text style={styles.submitButtonText}>GET STARTED</Text>
          </TouchableOpacity>
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
  termsContainer: {
    width: '90%',
    marginBottom: 20,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  policyText: {
    color: '#A1A4B2',
    fontSize: 14,
  },
  linkText: {
    color: '#FFBCC2',
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
});
