# graphragREC/main.py
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List
import json
import numpy as np
import pandas as pd
import requests

from first_recommendation import get_first_recommendations
from final_recommendation import get_final_recommendations

app = FastAPI()

# 요청 형식 정의
class UserRequest(BaseModel):
    user_id: str
    request_id: int
    hair_length: str
    hair_type: str
    sex: str
    cheekbone: str
    mood: str
    forehead_shape: str
    difficulty: str
    has_bangs: str
    face_shape: str
    summary: str

# 미용실 필터 함수
def filter_hair_shops_by_style(style: str, df: pd.DataFrame) -> list[dict]:
    mask = df.astype(str).apply(lambda col: col.str.contains(style, case=False, na=False)).any(axis=1)
    matched = df[mask].copy()
    if not matched.empty:
        matched = matched.drop_duplicates(subset=['hairshop'], keep='first')
        # return matched.to_dict('records') # 수정 전: NAN 값 유지
        matched = matched.replace({np.nan: None})
        return json.loads(matched.to_json(orient='records'))
    return []

# 스타일별 미용실 그룹핑 함수
def get_shops_grouped_by_style(recommended_styles: dict, csv_file_path: str = 'hairshop_recommend_dataset_realfinal_easy.csv') -> dict[str, list[dict]]:
    try:
        df = pd.read_csv(csv_file_path)
        df = df[['hairshop', 'final_dic_style', 'longitude', 'latitude', 'final_menu_price', 'review_count', 'mean_score']]
    except FileNotFoundError:
        print(f"CSV 파일을 찾을 수 없습니다: {csv_file_path}")
        return {}

    grouped = {}
    for rec in recommended_styles.get('recommendations', []):
        style = rec['style']
        grouped[style] = filter_hair_shops_by_style(style, df)
    return grouped

# 실제 API 엔드포인트
@app.post("/recommend")
def recommend(user_input: UserRequest):
    try:
        print("=== 헤어스타일 추천 시스템 시작 ===")
        print(f"사용자 입력:\n{json.dumps(user_input.dict(), ensure_ascii=False, indent=2)}")

        # 1차 추천
        first_response = get_first_recommendations(user_input.dict())
        print(f"1차 추천 결과:\n{first_response}")

        # 2차 최종 추천
        final_recommendations = get_final_recommendations(first_response, user_input.sex)
        print(f"2차 최종 추천:\n{json.dumps(final_recommendations, ensure_ascii=False, indent=2)}")

        # 미용실 매핑
        shops_by_style = get_shops_grouped_by_style(final_recommendations)
        print(f"매핑 결과:\n{json.dumps(shops_by_style, ensure_ascii=False, indent=2)}")

        # 최종 결과 구조화
        final_result = {
            "user_info": {
                "user_id": int(user_input.user_id),
                "request_id": user_input.request_id
            },
            "recommendations": []
        }

        for rec in final_recommendations.get('recommendations', []):
            style = rec['style']
            final_result["recommendations"].append({
                "style": style,
                "description": rec.get('description', ''),
                "hair_shops": shops_by_style.get(style, [])
            })

        print("\n=== 최종 결과 ===")
        print(json.dumps(final_result, ensure_ascii=False, indent=2))

        # Main API로 전송
        try:
            print("[7단계] Main API로 결과 전송 시작")
            # # [개발용]
            # response = requests.post("http://main-api:8000/save-recommendation/", json=final_result)
            # [운영용]
            response = requests.post("http://43.201.129.41:8000/save-recommendation/", json=final_result)
            response.raise_for_status()
            print("[INFO] Main API 서버에 추천 결과 저장 성공")
        except Exception as e:
            print(f"[ERROR] Main API 저장 실패: {e}")

        return final_result
        # return JSONResponse(content=final_result, status_code=200)

    except Exception as e:
        print(f"[에러] 처리 중 예외 발생: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# uvicorn으로 포트지정
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8002)
#################################3
# import json
# import pandas as pd
# from first_recommendation import get_first_recommendations
# from final_recommendation import get_final_recommendations

# def filter_hair_shops_by_style(style: str, df: pd.DataFrame) -> list[dict]:
#     """단일 스타일명에 대해 매칭된 미용실 리스트 반환"""
#     mask = df.astype(str).apply(lambda col: col.str.contains(style, case=False, na=False)).any(axis=1)
#     matched = df[mask].copy()
#     if not matched.empty:
#         # 중복된 미용실 이름은 첫 번째만 남김
#         matched = matched.drop_duplicates(subset=['hairshop'], keep='first')
#         return matched.to_dict('records')
#     return []

# def get_shops_grouped_by_style(recommended_styles: dict, 
#                                csv_file_path: str = 'hairshop_recommend_dataset_realfinal_easy.csv'
#                               ) -> dict[str, list[dict]]:
#     """추천 스타일별로 미용실들을 그룹핑해서 반환"""
#     try:
#         df = pd.read_csv(csv_file_path)
#         df= df[['hairshop', 'final_dic_style', 'longitude', 'latitude', 'final_menu_price', 'review_count', 'mean_score']]
#     except FileNotFoundError:
#         print(f"CSV 파일을 찾을 수 없습니다: {csv_file_path}")
#         return {}

#     grouped: dict[str, list[dict]] = {}
#     for rec in recommended_styles.get('recommendations', []):
#         style = rec['style']
#         grouped[style] = filter_hair_shops_by_style(style, df)
#     return grouped

# def main():
#     # 1) 사용자 입력 예시
#     user_input = {
#         "user_id": "1", 
#         "request_id": 1, 
#         "hair_length": "장발", 
#         "hair_type": "곱슬", 
#         "sex": "여성", 
#         "cheekbone": "도드라짐", 
#         "mood": ["우아한", "따뜻한", "부드러운"],
#         "forehead_shape": "M자형", 
#         "difficulty": "쉬운", 
#         "has_bangs": "있음",
#         "face_shape": "타원형",
#         "summary": "중안부가 길어 얼굴이 길어보임"
#     }
    
#     print("=== 헤어스타일 추천 시스템 시작 ===")
#     print(f"사용자 입력:\n{json.dumps(user_input, ensure_ascii=False, indent=2)}")

#     # 2) 1차 추천 (GraphRAG 기반)
#     print("\n=== 1차 추천 시작 ===")
#     first_response = get_first_recommendations(user_input)
#     print(f"1차 추천 결과:\n{first_response}")

#     # 3) 2차 최종 추천 (사전 기반)
#     print("\n=== 2차 최종 추천 시작 ===")
#     final_recommendations = get_final_recommendations(first_response, user_input['sex'])
#     print(f"2차 최종 추천:\n{json.dumps(final_recommendations, ensure_ascii=False, indent=2)}")

#     # 4) 스타일별 미용실 매핑
#     print("\n=== 스타일별 미용실 매핑 시작 ===")
#     shops_by_style = get_shops_grouped_by_style(final_recommendations)
#     print(f"매핑 결과:\n{json.dumps(shops_by_style, ensure_ascii=False, indent=2)}")

#     # 5) 최종 결과 구조화
#     final_result = {
#         "user_info": {
#             "user_id": user_input['user_id'],
#             "request_id": user_input['request_id']
#         },
#         "recommendations": []
#     }

#     for rec in final_recommendations.get('recommendations', []):
#         style = rec['style']
#         final_result["recommendations"].append({
#             "style": style,
#             "description": rec.get('description', ''),
#             "hair_shops": shops_by_style.get(style, [])
#         })

#     print("\n=== 최종 결과 ===")
#     print(json.dumps(final_result, ensure_ascii=False, indent=2))
#     return final_result

# if __name__ == "__main__":
#     result = main()
