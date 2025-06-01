import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../config/api';

export default function DiscoverResult() {
  const router = useRouter();
  const [selectedTab, setselectedTab] = useState('DISCOVER');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const fetchResult = () => {
    setLoading(true);
    setError(null);

    api.get('/user/latest-request-id')
      .then(res => {
        const latestId = res.data.request_id;
        console.log('[DEBUG] 최신 request_id:', latestId);
        if (!latestId) {
          setError('최근 요청이 없습니다.');
          setLoading(false);
          return;
        }

        api.get(`/user/result/${latestId}`)
          .then(res2 => {
            console.log('[DEBUG] 분석 결과:', res2.data);
            setResult(res2.data);
            setLoading(false);
          })
          .catch(err2 => {
            const msg = err2?.response?.data?.detail || err2.message || '결과를 불러오지 못했습니다.';
            console.error('[ERROR] 결과 요청 실패:', msg);
            setError(msg);
            setLoading(false);
          });
      })
      .catch(err => {
        const msg = err.message || '최신 요청을 불러오지 못했습니다.';
        console.error('[ERROR] 최신 request_id 요청 실패:', msg);
        setError(msg);
        setLoading(false);
      });
  };

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

  const sendStableHairRequest = (payload) => {
    setLoading(true);
    api.post('/run-stablehair/', payload)
      .then(() => {
        console.log('[INFO] 추천 요청 성공');
        setLoading(false);
        router.push('/discover-recomendation');
      })
      .catch(err => {
        const msg = err?.response?.data?.detail || err.message || '추천 요청 실패';
        console.error('[ERROR] 추천 요청 실패:', msg);
        setError(msg);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchResult();
  }, []);

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
          {['DISCOVER', 'SIMULATION', 'HAIRSHOP'].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => {
                setselectedTab(tab);
                if (tab === 'DISCOVER') {
                  router.push('/home-discover');
                } else if (tab === 'SIMULATION') {
                  router.push('/home-simulation');
                } else {
                  router.push('/home-hairshop');
                }
              }}
              style={styles.tabItem}>
              <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>
                {tab}
              </Text>
              {selectedTab === tab && <View style={styles.underline} />}
            </TouchableOpacity>
          ))}
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
                onPress={fetchResult}
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
                <View style={styles.outlineSqure}></View>
              </View>
              <View style={styles.resultBox}>
                <Text style={styles.resultText}><Text style={styles.resultLabel}>성별:</Text> {result.sex}</Text>
                <Text style={styles.resultText}><Text style={styles.resultLabel}>얼굴형:</Text> {result.face_type}</Text>
                <Text style={styles.resultText}><Text style={styles.resultLabel}>피부톤:</Text> {result.skin_tone}</Text>
                <Text style={styles.resultText}><Text style={styles.resultLabel}>추천 염색:</Text> {result.rec_color}</Text>
                <Text style={styles.resultText}><Text style={styles.resultLabel}>요약:</Text> {result.summary}</Text>
              </View>

              {/* ✅ 추천 받기 버튼 */}
              <TouchableOpacity onPress={handleTriggerRecommendation} style={styles.startButton}>
                <View style={styles.startButtonContent}>
                  <Text style={styles.startButtonText}>추천 받기</Text>
                </View>
              </TouchableOpacity>

              {/* ✅ 추천 가져오기 버튼 */}
              <TouchableOpacity
                onPress={() => router.push('/discover-recomendation')}
                style={[styles.startButton, { backgroundColor: '#D6A7B1', marginTop: 10 }]}
              >
                <View style={styles.startButtonContent}>
                  <Text style={styles.startButtonText}>추천 가져오기</Text>
                </View>
              </TouchableOpacity>
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
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-around', marginHorizontal: 20, marginTop: 15 },
  tabItem: { alignItems: 'center', paddingBottom: 5, marginHorizontal: 15 },
  tabText: { fontSize: 14, color: '#3F414E', fontWeight: '400' },
  activeTabText: { fontWeight: 'bold' },
  underline: { marginTop: 15, height: 2, width: '100%', backgroundColor: '#A3A3A3' },
  text: { fontSize: 16, fontWeight: '400', textAlign: 'center', top: 20 },
  imageContainer: { width: '90%', height: 300, top: 30, borderColor: '#FFBCC2', borderWidth: 2, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginVertical: 20, position: 'relative' },
  exampleImage: { resizeMode: 'cover', width: '100%', height: '100%' },
  startButton: { width: '90%', backgroundColor: '#FFBCC2', paddingVertical: 17, paddingHorizontal: 100, borderRadius: 10, marginTop: 30, marginHorizontal: 30, alignItems: 'center' },
  startButtonText: { fontSize: 14, fontWeight: '400', color: '#F6F1FB' },
  startButtonContent: { alignItems: 'center', flexDirection: 'row' },
  resultText: { textAlign: 'center', marginTop: 45, fontSize: 16 },
  outlineSqure: { borderColor: '#FF0101', width: 180, height: 258, borderWidth: 1, position: 'absolute' },
  resultBox: { backgroundColor: '#F6F1FB', borderRadius: 10, marginHorizontal: 20, marginTop: 10, padding: 20, elevation: 2 },
  resultLabel: { fontWeight: 'bold', color: '#FFBCC2' },
});


// import React, { useEffect, useState } from 'react';
// import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
// import { useRouter } from 'expo-router';
// import api from '../config/api';

// // 실제 서비스에서는 requestId를 useLocalSearchParams 등으로 받아도 됩니다.
// // import { useLocalSearchParams } from 'expo-router';
// // const { requestId } = useLocalSearchParams();

// export default function DiscoverResult() {
//   const router = useRouter();
//   const [selectedTab, setselectedTab] = useState('DISCOVER');
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [result, setResult] = useState(null);

//   // ✅ 요청 로직 분리 → 재조회 버튼과 공유 가능
//   const fetchResult = () => {
//     setLoading(true);
//     setError(null);

//     api.get('/user/latest-request-id')
//       .then(res => {
//         const latestId = res.data.request_id;
//         if (!latestId) {
//           setError('최근 요청이 없습니다.');
//           setLoading(false);
//           return;
//         }

//         api.get(`/user/result/${latestId}`)
//           .then(res2 => {
//             setResult(res2.data);
//             setLoading(false);
//           })
//           .catch(err2 => {
//             const msg = err2?.response?.data?.detail || err2.message || '결과를 불러오지 못했습니다.';
//             setError(msg);
//             setLoading(false);
//           });
//       })
//       .catch(err => {
//         setError(err.message || '최신 요청을 불러오지 못했습니다.');
//         setLoading(false);
//       });
//   };

//   useEffect(() => {
//     fetchResult();  // ✅ 최초 진입 시 자동 요청
//   }, []);

//   return (
//     <View style={{ flex: 1, backgroundColor: 'white' }}>
//       <View style={styles.header}>
//         <TouchableOpacity onPress={() => router.push('/welcome')}>
//           <Image source={require('../../assets/logo2.png')} style={styles.logoimage} />
//         </TouchableOpacity>
//         <TouchableOpacity onPress={() => router.push('/mypage-hairstyle')}>
//           <Image source={require('../../assets/mypage.png')} style={styles.mypageimage} />
//         </TouchableOpacity>
//       </View>
//       <View style={{ flex: 1 }}>
//         <View style={styles.buttonContainer}>
//           {['DISCOVER', 'SIMULATION', 'HAIRSHOP'].map((tab) => (
//             <TouchableOpacity
//               key={tab}
//               onPress={() => {
//                 setselectedTab(tab);
//                 if (tab === 'DISCOVER') {
//                   router.push('/home-discover');
//                 } else if (tab === 'SIMULATION') {
//                   router.push('/home-simulation');
//                 } else {
//                   router.push('/home-hairshop');
//                 }
//               }}
//               style={styles.tabItem}>
//               <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>
//                 {tab}
//               </Text>
//               {selectedTab === tab && <View style={styles.underline} />}
//             </TouchableOpacity>
//           ))}
//         </View>
//         <View style={styles.horizontalLine} />
//         <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
//           <Text style={styles.text}>얼굴형 분석을 완료했습니다.</Text>
//           {loading ? (
//             <ActivityIndicator size="large" color="#FFBCC2" style={{ marginTop: 40 }} />
//           ) : error ? (
//             <>
//               <Text style={{ color: 'red', textAlign: 'center', marginTop: 40 }}>{error}</Text>
//               {/* ✅ 재조회 버튼 */}
//               <TouchableOpacity
//                 onPress={fetchResult}
//                 style={{
//                   alignSelf: 'center',
//                   marginTop: 20,
//                   backgroundColor: '#FFBCC2',
//                   paddingHorizontal: 20,
//                   paddingVertical: 10,
//                   borderRadius: 8
//                 }}
//               >
//                 <Text style={{ color: '#fff', fontWeight: 'bold' }}>다시 불러오기</Text>
//               </TouchableOpacity>
//             </>
//           ) : result ? (
//             <>
//               <View style={styles.imageContainer}>
//                 <Image source={{ uri: result.user_image_url }} style={styles.exampleImage} />
//                 <View style={styles.outlineSqure}></View>
//               </View>
//               <View style={styles.resultBox}>
//                 <Text style={styles.resultText}><Text style={styles.resultLabel}>성별:</Text> {result.sex}</Text>
//                 <Text style={styles.resultText}><Text style={styles.resultLabel}>얼굴형:</Text> {result.face_type}</Text>
//                 <Text style={styles.resultText}><Text style={styles.resultLabel}>피부톤:</Text> {result.skin_tone}</Text>
//                 <Text style={styles.resultText}><Text style={styles.resultLabel}>추천 염색:</Text> {result.rec_color}</Text>
//                 <Text style={styles.resultText}><Text style={styles.resultLabel}>요약:</Text> {result.summary}</Text>
//               </View>
//             </>
//           ) : null}
//           <TouchableOpacity onPress={() => router.push('./discover-recomendation')} style={styles.startButton}>
//             <View style={styles.startButtonContent}>
//               <Text style={styles.startButtonText}>추천 받기</Text>
//             </View>
//           </TouchableOpacity>
//         </ScrollView>
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   header:{
//     height:55,
//     flexDirection:'row',
//     justifyContent : 'space-between',
//     paddingHorizontal:15,
//     alignItems : 'center',
//     backgroundColor : '#FFBCC2'
//   },
//   logoimage: {
//     width: 160,
//     height: 45,
//     resizeMode : 'contain',
//   },
//   mypageimage:{
//     width :34,
//     height : 33,
//     resizeMode : 'contain',
//   },
//   horizontalLine: {
//     height: 1,
//     backgroundColor: '#B7B7B7',
//     width: '100%',
//     marginTop:0,
//     bottom:5
//   },
//   buttonContainer :{
//     flexDirection:'row',
//     justifyContent : 'space-around',
//     marginHorizontal : 20,
//     marginTop : 15,
//   },
//   tabContainer: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//   },
//   tabItem: {
//     alignItems: 'center',
//     paddingBottom: 5,
//     marginHorizontal :15
//   },
//   tabText: {
//     fontSize: 14,
//     color: '#3F414E',
//     fontWeight: '400',
//   },
//   activeTabText: {
//     fontWeight: 'bold',
//   },
//   underline: {
//     marginTop: 15,
//     height: 2,
//     width: '100%',
//     backgroundColor: '#A3A3A3',
//   },
//   text:{
//     fontSize : 16,
//     fontWeight : 400,
//     textAlign : 'center',
//     top:20
//   },
//   imageContainer :{
//     width:'90%',
//     height:300,
//     top : 30,
//     borderColor:'#FFBCC2',
//     borderWidth:2,
//     justifyContent : 'center',
//     alignItems : 'center',
//     alignSelf :'center',
//     marginVertical : 20,
//     position:'relative'
//   },
//   exampleImage :{
//     resizeMode : 'cover',
//     width : '100%',
//     height : '100%',
//   },
//   startButton: {
//     width:'90%',
//     backgroundColor:'#FFBCC2',
//     paddingVertical: 17,
//     paddingHorizontal: 100,
//     borderRadius: 10,
//     marginTop: 30,
//     marginHorizontal:30 ,
//     alignItems:'center'
//   },
//   startButtonText:{
//     fontSize : 14,
//     fontWeight:400,
//     color :'#F6F1FB',
//   },
//   startButtonContent: {
//     alignItems: 'center',
//     flexDirection: 'row'
//   },
//   resultText : {
//     textAlign : 'center',
//     marginTop : 45,
//     fontSize : 16,
//   },
//   outlineSqure :{
//     borderColor:'#FF0101',
//     width : 180,
//     height : 258,
//     borderWidth:1,
//     position : 'absolute'
//   },
//   resultBox: {
//     backgroundColor: '#F6F1FB',
//     borderRadius: 10,
//     marginHorizontal: 20,
//     marginTop: 10,
//     padding: 20,
//     elevation: 2,
//   },
//   resultLabel: {
//     fontWeight: 'bold',
//     color: '#FFBCC2',
//   },
// });
