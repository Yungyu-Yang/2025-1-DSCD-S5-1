import React, {  useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView,TextInput,Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Checkbox from 'expo-checkbox';
import {Feather} from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../config/api';

export default function DiscoverSurvey() {
  const [step, setStep] = useState(1);
  const totalPages = 2;
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(null);
  

  const router = useRouter();
  const [selectedTab , setSelectedTab] = useState('DISCOVER');
  const [selectedGender, setSelectedGender] = useState(null);
  const [selectedHairType, setSelectedHairtype] = useState(null);
  const [femaleHairLength,setFemaleHairLength] = useState(null);
  const [maleHairLength, setMaleHairLength] = useState(null);
  const [hasBang, setHasBang] = useState(null);      
  const [isDyed, setIsDyed] = useState(null);
  const [foreheadType, setForeheadType] = useState(null);       
  const [cheekboneType, setCheekboneType] = useState(null);
  const [groomingDifficulty, setGroomingDifficulty] = useState(null);
  const [selectedMood, setSelectedMood] = useState([]);


  const [customInput,setCustomInput] = useState('');
  const mood = ['세련된', '부드러운', '깔끔한','귀여운','단정한','우아한','독특한','사랑스러운','고급스러운', '차분한','따뜻한','강렬한'];
  
  const handleSelect = (value,current,setter) => {
    if(current === value) {
        setter(null);
    }else {
        setter(value);
    }

  };

  const toggleMood = (item) => {
    setSelectedMood(prev => {
      // 이미 선택된 항목이면, 그 항목만 걸러내고 리턴
      if (prev.includes(item)) {
        return prev.filter(i => i !== item);
      }
      // 미선택 항목이고, 아직 3개 미만이면 추가
      if (prev.length < 3) {
        return [...prev, item];
      }
      // 3개 이미 선택된 상태에서 추가 시도하면 그대로 리턴
      return prev;
    });
  };
  const goNext = () => step < totalPages && setStep(step + 1);
  const goPrev = () => step > 1 && setStep(step - 1);

  const chunkArray = (array, size) => {
    const result = [];
      for (let i = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size));
  }
  return result
};

useEffect(() => {
  const checkAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('userToken');
      if (!storedToken) {
        Alert.alert('알림', '로그인이 필요한 서비스입니다.');
        router.replace('/login');
        return;
      }
      setToken(storedToken);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('인증 확인 중 오류:', error);
      Alert.alert('오류', '인증 확인 중 문제가 발생했습니다.');
      router.replace('/login');
    }
  };

  checkAuth();
}, []);

const handleSubmit = async () => {
  try {
    // 토큰 재확인
    const currentToken = await AsyncStorage.getItem('userToken');
    if (!currentToken) {
      Alert.alert('알림', '로그인이 필요한 서비스입니다.');
      router.replace('/login');
      return;
    }

    // 필수 필드 검증
    if (!selectedGender || !selectedHairType || !customInput || !hasBang || 
        !isDyed || !foreheadType || !cheekboneType || !groomingDifficulty || 
        selectedMood.length === 0) {
      Alert.alert('오류', '모든 설문 항목을 입력해주세요.');
      return;
    }

    // 현재 상태값 로깅
    console.log('현재 상태값:', {
      selectedGender,
      selectedHairType,
      customInput,
      hasBang,
      isDyed,
      foreheadType,
      cheekboneType,
      groomingDifficulty,
      selectedMood,
      maleHairLength,
      femaleHairLength
    });

    const surveyData = {
      hair_length: selectedGender === '남성' ? maleHairLength : femaleHairLength,
      hair_type: selectedHairType,
      sex: selectedGender,
      location: customInput,
      cheekbone: cheekboneType,
      mood: selectedMood.join(','),
      dyed: isDyed,
      forehead_shape: foreheadType,
      difficulty: groomingDifficulty,
      has_bangs: hasBang,
    };

    console.log('전달할 설문 데이터:', surveyData);

    // AsyncStorage에 저장하기 전에 기존 데이터 삭제
    await AsyncStorage.removeItem('surveyData');

    // 설문 데이터를 AsyncStorage에 저장
    try {
      await AsyncStorage.setItem('surveyData', JSON.stringify(surveyData));
      console.log('설문 데이터 저장 완료');
      
      // 저장된 데이터 확인
      const savedData = await AsyncStorage.getItem('surveyData');
      console.log('저장된 설문 데이터 확인:', savedData);
      
      if (!savedData) {
        throw new Error('데이터 저장 실패');
      }

      // 상태 초기화
      setSelectedGender(null);
      setSelectedHairtype(null);
      setFemaleHairLength(null);
      setMaleHairLength(null);
      setHasBang(null);
      setIsDyed(null);
      setForeheadType(null);
      setCheekboneType(null);
      setGroomingDifficulty(null);
      setSelectedMood([]);
      setCustomInput('');

      // 카메라 페이지로 이동
      router.push('/discover-camera');
    } catch (storageError) {
      console.error('설문 데이터 저장 중 오류:', storageError);
      Alert.alert('오류', '설문 데이터 저장 중 문제가 발생했습니다.');
      return;
    }
  } catch (error) {
    console.error('설문 제출 중 오류:', error);
    Alert.alert('오류', '설문 제출 중 문제가 발생했습니다.');
  }
};

// 컴포넌트 마운트 시 이전 데이터 삭제
useEffect(() => {
  const cleanup = async () => {
    try {
      await AsyncStorage.removeItem('surveyData');
      console.log('이전 설문 데이터 삭제 완료');
    } catch (error) {
      console.error('데이터 삭제 중 오류:', error);
    }
  };
  cleanup();
}, []);

// 컴포넌트 언마운트 시 데이터 초기화
useEffect(() => {
  return () => {
    setSelectedGender(null);
    setSelectedHairtype(null);
    setFemaleHairLength(null);
    setMaleHairLength(null);
    setHasBang(null);
    setIsDyed(null);
    setForeheadType(null);
    setCheekboneType(null);
    setGroomingDifficulty(null);
    setSelectedMood([]);
    setCustomInput('');
  };
}, []);

  return (
    <View style={{ flex: 1 ,backgroundColor: 'white'}}>
      {/* — 공통 헤더 & 탭바 — */}
        <View style={styles.header}>
        <TouchableOpacity onPress={()=>router.push('/welcome')}>
          <Image source={require('../../assets/logo2.png')} style={styles.logoimage} />
        </TouchableOpacity>
        <TouchableOpacity onPress={()=> router.push('/mypage-hairstyle')}>
          <Image source={require('../../assets/mypage.png')} style = {styles.mypageimage}/>
        </TouchableOpacity>
        </View>

      <View style={{flex: 1}}>
        <View style={styles.buttonContainer}>
          
          <TouchableOpacity 
            onPress={() => {
              setSelectedTab('DISCOVER');
              router.push('/home-discover');
            }}
            style={styles.tabItem}>
            <Text style={[styles.tabText,selectedTab === 'DISCOVER' && styles.activeTabText]}>
              DISCOVER
            </Text>
            {selectedTab === 'DISCOVER' && <View style={styles.underline}/>}
          </TouchableOpacity>
          
        </View>
        <View style ={styles.horizontalLine}/>
        {/* — 페이지 컨텐츠 — */}
        {step === 1 && (
          <>
        <Text style = {styles.text}>최적의 헤어스타일을 찾기 위한{'\n'}
                            설문을 진행합니다.</Text>
        <Text>{'\n'}</Text>
        <View style={[styles.line]}/>
        <ScrollView contentContainerStyle={{flexGrow:1}}>
        <View style ={styles.container}>
            {/*성별 질문*/}
           <View style = {styles.questionBlock1}>
            <Text style ={styles.question}>당신의 성별은 무엇인가요?</Text>
            <View style={styles.optionsRow}>
                {['남성', '여성'].map((option) => (
                    <TouchableOpacity
                        key={option}
                        style ={styles.optionItem}
                        onPress={() => handleSelect(option, selectedGender, setSelectedGender)}>
                    <Checkbox
                        value={selectedGender === option}
                        color={selectedGender === option ? '#FFBCC2' : undefined}
                        style={styles.checkbox}/>
                    <Text style={styles.optionText}>{option}</Text>
                    </TouchableOpacity>
            ))}
            </View>
           </View>
           <View style={[styles.line]}/>
           <View style={styles.customInputWrapper}>
           <Text style ={styles.question}>현재 거주 중인 행정동을 입력해주세요.</Text>
              <TextInput
                style={styles.customInput}
                placeholder="예:신사동"
                value={customInput}
                onChangeText={setCustomInput}
                multiline={false}          
                numberOfLines={3}
                returnKeyType="done"
              />
          </View>
          <View style={[styles.line]}/>
            {/*앞머리 질문*/}
            <View style = {styles.questionBlock1}>
            <Text style ={styles.question}>현재 앞머리가 있으신가요?</Text>
            <View style={styles.optionsRow}>
                {['있음', '없음'].map((option) => (
                    <TouchableOpacity
                        key={option}
                        style ={styles.optionItem}
                        onPress={() => handleSelect(option, hasBang, setHasBang)}>
                    <Checkbox
                        value={hasBang === option}
                        color={hasBang === option ? '#FFBCC2' : undefined}
                        style={styles.checkbox}/>
                    <Text style={styles.optionText}>{option}</Text>
                    </TouchableOpacity>
            ))}
            </View>
           </View>
          <View style={[styles.line]}/>
            {/*염색 질문*/}
            <View style = {styles.questionBlock1}>
            <Text style ={styles.question}>현재 염색을 하셨나요?</Text>
            <View style={styles.optionsRow}>
                {['O', 'X'].map((option) => (
                    <TouchableOpacity
                        key={option}
                        style ={styles.optionItem}
                        onPress={() => handleSelect(option, isDyed, setIsDyed)}>
                    <Checkbox
                        value={isDyed === option}
                        color={isDyed === option ? '#FFBCC2' : undefined}
                        style={styles.checkbox}/>
                    <Text style={styles.optionText}>{option}</Text>
                    </TouchableOpacity>
            ))}
            </View>
           </View>
           <View style={[styles.line]}/>
            {/* 모발 질문 */}
           <View style = {styles.questionBlock2}>
             <Text style ={styles.question}>당신의 모발 유형을 알려주세요.</Text>
             <View style = {styles.optionsRow}>
                {['직모', '곱슬', '반곱슬'].map((option) => (
                    <TouchableOpacity
                        key={option}
                        style={styles.optionItem}
                        onPress={() => handleSelect(option, selectedHairType, setSelectedHairtype)}>
                    <Checkbox
                        value={selectedHairType === option}
                        color={selectedHairType === option ? '#FFBCC2' : undefined}
                        style={styles.checkbox}/>
                    <Text style={styles.optionText}>{option}</Text>
                    </TouchableOpacity>
                ))}
             </View>
           </View> 
           <View style={[styles.line]}/>
            {/* 기장 질문 */}
          <View style = {styles.questionBlock3}> 
            <Text style={styles.question}>당신의 현재 헤어 기장을 알려주세요.(남)</Text>
            <View style ={styles.optionsRow}>
                {['숏', '미디움', '롱'].map((option) => (
                    <TouchableOpacity
                        key={option}
                        style = {styles.optionItem}
                        onPress={() => handleSelect(option, maleHairLength, setMaleHairLength)}>
                    <Checkbox
                        value={maleHairLength=== option}
                        color={maleHairLength === option ? '#FFBCC2' : undefined}
                        style={styles.checkbox}
                        />
                    <Text style={styles.optionText}>{option}</Text>    
                    </TouchableOpacity>
                ))}
            </View>
           </View>
           <View style={[styles.line]}/>
           <View style = {styles.questionBlock3}> 
            <Text style={styles.question}>당신의 현재 헤어 기장을 알려주세요.(여)</Text>
            <View style ={styles.optionsRow}>
                {['단발', '중단발', '장발','숏컷'].map((option) => (
                    <TouchableOpacity
                        key={option}
                        style = {styles.optionItemHalf}
                        onPress={() => handleSelect(option, femaleHairLength,setFemaleHairLength)}>
                    <Checkbox
                        value={femaleHairLength === option}
                        color={femaleHairLength === option ? '#FFBCC2' : undefined}
                        style={styles.checkbox}
                        />
                    <Text style={styles.optionText}>{option}</Text>    
                    </TouchableOpacity>
                ))}
            </View>
           </View>
           <View style={[styles.line]}/> 
        {/* 이마모양 질문 */}
        <View style = {styles.questionBlock3}> 
            <Text style={styles.question}>당신의 이마모양을 알려주세요.</Text>
            <View style ={styles.optionsRow}>
                {['둥근형', 'M자형', '네모형'].map((option) => (
                    <TouchableOpacity
                        key={option}
                        style = {styles.optionItem}
                        onPress={() => handleSelect(option, foreheadType,setForeheadType)}>
                    <Checkbox
                        value={foreheadType === option}
                        color={foreheadType === option ? '#FFBCC2' : undefined}
                        style={styles.checkbox}
                        />
                    <Text style={styles.optionText}>{option}</Text>    
                    </TouchableOpacity>
                ))}
            </View>
           </View>
           <View style={[styles.line]}/> 
        {/* 광대 질문 */}
        <View style = {styles.questionBlock3}> 
            <Text style={styles.question}>당신의 광대유형에대해 알려주세요.</Text>
            <View style ={styles.optionsRow}>
                {['많이 도드라짐', '약간 도드라짐', '눈에띄지 않음'].map((option) => (
                    <TouchableOpacity
                        key={option}
                        style = {styles.optionItemThird}
                        onPress={() => handleSelect(option,cheekboneType,setCheekboneType)}>
                    <Checkbox
                        value={cheekboneType === option}
                        color={cheekboneType === option ? '#FFBCC2' : undefined}
                        style={styles.checkbox}
                        />
                    <Text style={styles.optionText}>{option}</Text>    
                    </TouchableOpacity>
                ))}
            </View>
           </View>
           <View style={[styles.line]}/> 
        {/* 손질난이도 질문 */}
        <View style = {styles.questionBlock3}> 
            <Text style={styles.question}>원하는 손질 난이도 수준을 알려주세요.</Text>
            <View style ={styles.optionsRow}>
                {['쉬움', '보통', '어려움'].map((option) => (
                    <TouchableOpacity
                        key={option}
                        style = {styles.optionItem}
                        onPress={() => handleSelect(option, groomingDifficulty,setGroomingDifficulty)}>
                    <Checkbox
                        value={groomingDifficulty === option}
                        color={groomingDifficulty === option ? '#FFBCC2' : undefined}
                        style={styles.checkbox}
                        />
                    <Text style={styles.optionText}>{option}</Text>    
                    </TouchableOpacity>
                ))}
            </View>
           </View>
        </View>
       </ScrollView>
       </>
)}

      {step === 2 && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
          <View style={styles.questionBlock}> 
            <Text style={styles.question}>당신의 선호하는 분위기를 알려주세요.</Text>
            <Text style={styles.question2}>최대 3개까지 선택 가능합니다.</Text>
    
            <View style={styles.grid}>
              {chunkArray(mood, 3).map((row, rowIndex) => (
                <View key={rowIndex} style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 16 }}>
                  {row.map((item) => (
                    <TouchableOpacity
                      key={item}
                      onPress={() => toggleMood(item)}
                      style={[
                        styles.moodButton,
                        selectedMood.includes(item) && styles.moodButtonSelected
                      ]}>
                      <Text style={[
                        styles.moodButtonText,
                        selectedMood.includes(item) && styles.moodButtonTextSelected
                      ]}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>
          </View>
          <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 20 }}>
            <TouchableOpacity 
              onPress={handleSubmit}
              style={styles.primaryButton}>
              <Text style={styles.buttonText}>SELECT IMAGE</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

       <View style = {{alignItems : 'center'}}>
            <View style ={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',width : '90%'}}>
              <TouchableOpacity onPress={goPrev} disabled={step ===1 }>
                <Feather
                  name = 'chevron-left'
                  size = {20}
                  color ={step ===1 ? '#ccc' : '#FFBC22'}/>
              </TouchableOpacity>
              <Text style = {{marginHorizontal : 20 , color:'#FFBCC2'}}>
                {step}/{totalPages}
              </Text>
              <TouchableOpacity onPress = {goNext} disabled= {step === totalPages}>
                <Feather
                  name = 'chevron-right'
                  size={20}
                  color = {step === totalPages ? '#ccc' : '#FFBCC2'}/>
              </TouchableOpacity>
            </View>
          </View>
      </View>
      
    </View>
  );
}  

const styles = StyleSheet.create({
  header:{
    height:55,
    flexDirection:'row',
    justifyContent : 'space-between',
    paddingHorizontal:15,
    alignItems : 'center',
    backgroundColor : '#FFBCC2'
  },
  logoimage: {
    width: 160,
    height: 45,
    resizeMode : 'contain',
  },
  mypageimage:{
    width :34,
    height : 33,
    resizeMode : 'contain',
  },
  horizontalLine: {
    height: 1,               
    backgroundColor: '#B7B7B7', 
    width: '100%',          
    marginTop:0,
    bottom:5
  },
  buttonContainer :{
    flexDirection:'row',
    justifyContent : 'space-around',
    marginHorizontal : 20,
    marginTop : 15,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  tabItem: {
    alignItems: 'center',
    paddingBottom: 5,
    marginHorizontal :15
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
  text:{
    fontSize : 18,
    fontWeight : 400,
    textAlign : 'center',
    top:20
  },
  selectedButton: {
    width:'90%',
    backgroundColor:'#FFBCC2',
    paddingVertical: 17,
    paddingHorizontal: 100,
    borderRadius: 10,
    alignItems:'center',  
    alignSelf:'center',
    bottom: 40
  },
  selectedButtonText:{
    fontSize : 14,
    fontWeight:400,
    color :'#F6F1FB',
  },
  selectedButtonContent: {
    alignItems: 'center',
    flexDirection: 'row'
  },
  line :{
    width : 340,
    backgroundColor : '#B7B7B7',
    height:1,
    alignSelf : 'center',
    marginVertical:0.5,
  },
  container: {
    flex: 1,
    backgroundColor: 'white',
    padding: 24,
    justifyContent: 'center',
  },
  questionBlock: {
    marginTop : 15,
    marginBottom: 5,       
    paddingHorizontal: 16,  
    alignItems: 'center',
  },
  questionBlock1: {       
    paddingHorizontal: 16,  
    alignItems: 'center',
  },
  questionBlock2: {
    marginTop : 10,
    marginBottom: 5,       
    paddingHorizontal: 16,  
    alignItems: 'center',
  },
  questionBlock3: {
    marginTop : 10,
    marginBottom: 5,       
    paddingHorizontal: 16,  
    alignItems: 'center',
  },
  question: {
    fontSize: 16,
    fontWeight: '400',
    marginTop: 15,
    marginBottom:10 ,
    color: '#3F414E',
    textAlign: 'center',
  },
  question2: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 15,
    marginBottom:10 ,
    color: '#3F414E',
    textAlign: 'center',
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
    marginVertical: 5,
    padding:7,
  },
  optionItemHalf: {
    flexDirection: 'row',
    alignItems: 'center',
    //alignSelf: 'center',
    margin: 10,
    width: '38%',
    justifyContent: 'flex-start',
    marginHorizontal:5,
  },
  optionItemThird: {
      flexBasis: '35%',
      margin: 5,
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf : 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 8,
  },
  optionText: {
    fontSize: 14,
    color: '#3F414E',
  },
  customInputWrapper: {
    marginTop: 15,
    alignItems: 'center',
    marginBottom: 25,
  },
  customInput: {
    width: '90%',
    borderWidth: 1,
    borderColor: '#B7B7B7',
    borderRadius: 8,
    padding: 6,
    alignSelf : 'center',
    marginTop:15
  },
  grid :{
    alignItems:'center',
    alignSelf : 'center'
  },
  row : {
    flexDirection : 'row',
    marginBottom : 16,
  },
  moodButton: {
    width: 106,
    height: 42,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#8C8C8C',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
    paddingHorizontal: 16,
    marginTop : 30

  },
  moodButtonSelected: {
    backgroundColor: 'rgba(255, 188, 194, 0.5)',
    borderColor: '#E0E0E0',
    borderWidth:2
  },
  moodButtonText: {
    color: '#3F414E',
    fontSize: 15,
  },
  moodButtonTextSelected: {
    fontWeight: 'bold',
  },
  primaryButton: {
    width: '90%',
    backgroundColor: '#FFBCC2',
    paddingVertical: 17,
    paddingHorizontal: 100,
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
    alignSelf: 'center',
    marginBottom: 20,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});



