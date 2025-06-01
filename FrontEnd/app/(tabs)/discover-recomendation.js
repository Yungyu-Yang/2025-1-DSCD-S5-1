/// DiscoverRecomendation 화면: 추천된 헤어 스타일 + 해당 스타일별 추천 미용실 리스트 보여줌

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import api from '../config/api';

export default function DiscoverRecomendation() {
  const router = useRouter();
  const [selectedTab, setselectedTab] = useState('DISCOVER');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hairList, setHairList] = useState([]);
  const [hairshopMap, setHairshopMap] = useState({});
  const [step, setStep] = useState(0);

  const loadRecommendations = () => {
    setLoading(true);
    setError(null);
    setHairList([]);
    setHairshopMap({});
    setStep(0);

    api.get('/user/latest-request-id')
      .then(res => {
        const requestId = res.data.request_id;
        if (!requestId) {
          setError('추천 내역이 없습니다.');
          setLoading(false);
          return;
        }
        api.get(`/user/hair-recommendations/${requestId}`)
          .then(res2 => {
            const hairs = res2.data;
            setHairList(hairs);
            if (hairs.length === 0) {
              setError('추천된 헤어가 없습니다.');
              setLoading(false);
              return;
            }
            Promise.all(
              hairs.map(hair =>
                api.get(`/user/hairshop-recommendations/${hair.hair_rec_id}`)
                  .then(res3 => ({ hair_rec_id: hair.hair_rec_id, shops: res3.data }))
                  .catch(() => ({ hair_rec_id: hair.hair_rec_id, shops: [] }))
              )
            ).then(results => {
              const map = {};
              results.forEach(r => { map[r.hair_rec_id] = r.shops; });
              setHairshopMap(map);
              setLoading(false);
            });
          })
          .catch(() => {
            setError('헤어 추천 정보를 불러오지 못했습니다.');
            setLoading(false);
          });
      })
      .catch(() => {
        setError('최신 요청 정보를 불러오지 못했습니다.');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadRecommendations();
  }, []);

  const totalPages = hairList.length;
  const currentHair = hairList[step] || null;
  const currentHairshops = currentHair ? hairshopMap[currentHair.hair_rec_id] || [] : [];

  const goNext = () => { if (step < totalPages - 1) setStep(step + 1); };
  const goPrev = () => { if (step > 0) setStep(step - 1); };

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
                if (tab === 'DISCOVER') router.push('/home-discover');
                else if (tab === 'SIMULATION') router.push('/home-simulation');
                else router.push('/home-hairshop');
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
          <Text style={styles.text}>다음과 같은 헤어를 추천합니다.</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#FFBCC2" style={{ marginTop: 40 }} />
          ) : error ? (
            <>
              <Text style={{ color: 'red', textAlign: 'center', marginTop: 40 }}>{error}</Text>
              <TouchableOpacity
                onPress={loadRecommendations}
                style={{
                  alignSelf: 'center',
                  marginTop: 20,
                  backgroundColor: '#FFBCC2',
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>다시 불러오기</Text>
              </TouchableOpacity>
            </>
          ) : currentHair ? (
            <>
              <Text style={styles.styleText}>{currentHair.hair_name}</Text>
              <View style={styles.imageContainer}>
                {(!currentHair.simulation_image_url || currentHair.simulation_image_url === 'dummy.jpg') ? (
                  <View style={{ width: 325, height: 300, backgroundColor: 'transparent' }} />
                ) : (
                  <Image source={{ uri: currentHair.simulation_image_url }} style={styles.exampleImage} />
                )}
              </View>
              <Text style={styles.resultText}>{currentHair.description}</Text>
              <Text style={{ color: '#FFBCC2', textAlign: 'center', marginTop: 10 }}>추천 미용실</Text>
              {currentHairshops.length === 0 ? (
                <Text style={{ textAlign: 'center', color: '#888', marginTop: 10 }}>추천 미용실이 없습니다.</Text>
              ) : (
                currentHairshops.map((shop, idx) => (
                  <View key={idx} style={styles.hairshopBox}>
                    <Text style={styles.hairshopName}>{shop.hairshop}</Text>
                    <Text style={styles.hairshopInfo}>리뷰수: {shop.review_count} | 평점: {shop.mean_score?.toFixed(2)}</Text>
                  </View>
                ))
              )}
              <View style={{ alignItems: 'center', marginTop: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: 300 }}>
                  <TouchableOpacity onPress={goPrev} disabled={step === 0}>
                    <Feather name='chevron-left' size={20} color={step === 0 ? '#ccc' : '#FFBC22'} />
                  </TouchableOpacity>
                  <Text style={{ marginHorizontal: 20, color: '#FFBCC2' }}>{step + 1}/{totalPages}</Text>
                  <TouchableOpacity onPress={goNext} disabled={step === totalPages - 1}>
                    <Feather name='chevron-right' size={20} color={step === totalPages - 1 ? '#ccc' : '#FFBCC2'} />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          ) : null}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: 'white',
    alignItems: 'center',
  },
  logoimage: {
    width: 110,
    height: 40,
    resizeMode: 'contain',
  },
  mypageimage: {
    width: 30,
    height: 30,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: 'white',
  },
  tabItem: {
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  tabText: {
    fontSize: 14,
    color: '#aaa',
  },
  activeTabText: {
    fontWeight: 'bold',
    color: '#FFBCC2',
  },
  underline: {
    marginTop: 3,
    height: 2,
    backgroundColor: '#FFBCC2',
    width: '100%',
  },
  horizontalLine: {
    height: 1,
    backgroundColor: '#eee',
    marginHorizontal: 20,
  },
  text: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  styleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFBCC2',
    textAlign: 'center',
    marginBottom: 10,
  },
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  exampleImage: {
    width: 325,
    height: 300,
    resizeMode: 'cover',
    borderRadius: 12,
  },
  resultText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  hairshopBox: {
    marginHorizontal: 30,
    marginVertical: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FFBCC2',
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  hairshopName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#FFBCC2',
    marginBottom: 4,
  },
  hairshopInfo: {
    fontSize: 13,
    color: '#777',
  },
});


// import React, { useState, useEffect } from 'react';
// import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
// import { useRouter } from 'expo-router';
// import { Feather } from '@expo/vector-icons';
// import api from '../config/api';

// export default function DiscoverRecomendation() {
//   const router = useRouter();
//   const [selectedTab, setselectedTab] = useState('DISCOVER');
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [hairList, setHairList] = useState([]); // 추천 헤어 리스트
//   const [hairshopMap, setHairshopMap] = useState({}); // hair_rec_id별 미용실 리스트
//   const [step, setStep] = useState(0); // 페이지네이션 인덱스

//   useEffect(() => {
//     // 1. 최신 request_id 조회
//     api.get('/user/latest-request-id')
//       .then(res => {
//         const requestId = res.data.request_id;
//         if (!requestId) {
//           setError('추천 내역이 없습니다.');
//           setLoading(false);
//           return;
//         }
//         // 2. 추천 헤어 리스트 조회
//         api.get(`/user/hair-recommendations/${requestId}`)
//           .then(res2 => {
//             const hairs = res2.data;
//             setHairList(hairs);
//             if (hairs.length === 0) {
//               setError('추천된 헤어가 없습니다.');
//               setLoading(false);
//               return;
//             }
//             // 3. 각 헤어별 미용실 리스트 조회 (병렬)
//             Promise.all(
//               hairs.map(hair =>
//                 api.get(`/user/hairshop-recommendations/${hair.hair_rec_id}`)
//                   .then(res3 => ({ hair_rec_id: hair.hair_rec_id, shops: res3.data }))
//                   .catch(() => ({ hair_rec_id: hair.hair_rec_id, shops: [] }))
//               )
//             ).then(results => {
//               const map = {};
//               results.forEach(r => { map[r.hair_rec_id] = r.shops; });
//               setHairshopMap(map);
//               setLoading(false);
//             });
//           })
//           .catch(() => {
//             setError('헤어 추천 정보를 불러오지 못했습니다.');
//             setLoading(false);
//           });
//       })
//       .catch(() => {
//         setError('최신 요청 정보를 불러오지 못했습니다.');
//         setLoading(false);
//       });
//   }, []);

//   const totalPages = hairList.length;
//   const currentHair = hairList[step] || null;
//   const currentHairshops = currentHair ? hairshopMap[currentHair.hair_rec_id] || [] : [];

//   const goNext = () => { if (step < totalPages - 1) setStep(step + 1); };
//   const goPrev = () => { if (step > 0) setStep(step - 1); };

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
//           <Text style={styles.text}>다음과 같은 헤어를 추천합니다.</Text>
//           {loading ? (
//             <ActivityIndicator size="large" color="#FFBCC2" style={{ marginTop: 40 }} />
//           ) : error ? (
//             <Text style={{ color: 'red', textAlign: 'center', marginTop: 40 }}>{error}</Text>
//           ) : currentHair ? (
//             <>
//               <Text style={styles.styleText}>{currentHair.hair_name}</Text>
//               <View style={styles.imageContainer}>
//                 {(!currentHair.simulation_image_url || currentHair.simulation_image_url === 'dummy.jpg') ? (
//                   <View style={{ width: 325, height: 300, backgroundColor: 'transparent' }} />
//                 ) : (
//                   <Image source={{ uri: currentHair.simulation_image_url }} style={styles.exampleImage} />
//                 )}
//               </View>
//               <Text style={styles.resultText}>{currentHair.description}</Text>
//               <Text style={{ color: '#FFBCC2', textAlign: 'center', marginTop: 10 }}>추천 미용실</Text>
//               {currentHairshops.length === 0 ? (
//                 <Text style={{ textAlign: 'center', color: '#888', marginTop: 10 }}>추천 미용실이 없습니다.</Text>
//               ) : (
//                 currentHairshops.map((shop, idx) => (
//                   <View key={idx} style={styles.hairshopBox}>
//                     <Text style={styles.hairshopName}>{shop.hairshop}</Text>
//                     <Text style={styles.hairshopInfo}>리뷰수: {shop.review_count} | 평점: {shop.mean_score?.toFixed(2)}</Text>
//                   </View>
//                 ))
//               )}
//               <View style={{ alignItems: 'center', marginTop: 20 }}>
//                 <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: 300 }}>
//                   <TouchableOpacity onPress={goPrev} disabled={step === 0}>
//                     <Feather
//                       name='chevron-left'
//                       size={20}
//                       color={step === 0 ? '#ccc' : '#FFBC22'} />
//                   </TouchableOpacity>
//                   <Text style={{ marginHorizontal: 20, color: '#FFBCC2' }}>
//                     {step + 1}/{totalPages}
//                   </Text>
//                   <TouchableOpacity onPress={goNext} disabled={step === totalPages - 1}>
//                     <Feather
//                       name='chevron-right'
//                       size={20}
//                       color={step === totalPages - 1 ? '#ccc' : '#FFBCC2'} />
//                   </TouchableOpacity>
//                 </View>
//               </View>
//             </>
//           ) : null}
//         </ScrollView>
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   header: {
//     height: 55,
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     paddingHorizontal: 15,
//     alignItems: 'center',
//     backgroundColor: '#FFBCC2'
//   },
//   logoimage: {
//     width: 160,
//     height: 45,
//     resizeMode: 'contain',
//   },
//   mypageimage: {
//     width: 34,
//     height: 33,
//     resizeMode: 'contain',
//   },
//   horizontalLine: {
//     height: 1,
//     backgroundColor: '#B7B7B7',
//     width: '100%',
//     marginTop: 0,
//     bottom: 5
//   },
//   buttonContainer: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     marginHorizontal: 20,
//     marginTop: 15,
//   },
//   tabContainer: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//   },
//   tabItem: {
//     alignItems: 'center',
//     paddingBottom: 5,
//     marginHorizontal: 15
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
//   text: {
//     fontSize: 16,
//     fontWeight: 400,
//     textAlign: 'center',
//     top: 20
//   },
//   styleText: {
//     textAlign: 'center',
//     fontSize: 24,
//     marginTop: 40
//   },
//   imageContainer: {
//     width: 330,
//     height: 300,
//     marginTop: 15,
//     borderColor: '#FFBCC2',
//     borderWidth: 2,
//     justifyContent: 'center',
//     alignItems: 'center',
//     alignSelf: 'center',
//     marginVertical: 20,
//     position: 'relative'
//   },
//   exampleImage: {
//     resizeMode: 'cover',
//     width: 325,
//     height: 300,
//   },
//   resultText: {
//     textAlign: 'center',
//     marginTop: 10,
//     fontSize: 16,
//   },
//   hairshopBox: {
//     backgroundColor: '#F6F1FB',
//     borderRadius: 8,
//     marginHorizontal: 30,
//     marginTop: 10,
//     padding: 15,
//     elevation: 1,
//   },
//   hairshopName: {
//     fontWeight: 'bold',
//     fontSize: 16,
//     color: '#FFBCC2',
//   },
//   hairshopInfo: {
//     fontSize: 14,
//     color: '#3F414E',
//     marginTop: 4,
//   },
// });
