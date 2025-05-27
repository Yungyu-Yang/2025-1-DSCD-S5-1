# routers/analyze.py
# 컨테이너간 통신

from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
import requests

from models.hair_recommendation import HairRecommendation
from models.hairshop_recommendation import HairshopRecommendation
from models.hairstyle import Hairstyle
from models.request import Request
from models.result import Result
from core.database import get_db
from core.recommendation import get_analysis_payload
from schemas.recommendation import RecommendationPayload

router = APIRouter()

# 1. 기존: Main → GraphRAG 요청
@router.post("/run-recommendation/")
def run_recommendation(
    data: dict = Body(...),
    db: Session = Depends(get_db)
):
    user_id = data.get("user_id")
    request_id = data.get("request_id")

    print(f"[DEBUG] 요청 수신됨 - user_id: {user_id}, request_id: {request_id}")

    if not user_id or not request_id:
        print("[ERROR] user_id 또는 request_id가 없음")
        raise HTTPException(status_code=400, detail="user_id 또는 request_id가 누락되었습니다.")

    # payload 구성
    payload = get_analysis_payload(db, user_id, request_id)
    if not payload:
        print("[ERROR] get_analysis_payload 실패 - 데이터 없음")
        raise HTTPException(status_code=404, detail="요청 또는 분석 결과가 없습니다.")

    print(f"[INFO] payload 준비 완료 → GraphRAG 전송 시작\n{payload}")

    try:
        response = requests.post("http://graphrag:8002/recommend", json=payload) # [개발용] Docker 내부 통신용 주소 (도커 네트워크: graphrag)
        # response = requests.post("http://13.124.74.93:8002/recommend", json=payload)  # [운영용] EC2 고정 IP로 GraphRAG 서버 호출
        response.raise_for_status()

        print("[INFO] GraphRAG 응답 수신 성공")
        print(f"[DEBUG] GraphRAG 응답 데이터: {response.json()}")

        return {"message": "추천 성공", "result": response.json()}
    
    except requests.exceptions.RequestException as e:
        print(f"[ERROR] GraphRAG 요청 중 오류 발생: {e}")
        raise HTTPException(status_code=500, detail=f"GraphRAG 호출 실패: {e}")
    
# 2. GraphRAG → Main 추천 결과 저장
@router.post("/save-recommendation/")
def save_recommendation(payload: RecommendationPayload, db: Session = Depends(get_db)):
    try:
        user_id = int(payload.user_info.user_id)
        request_id = int(payload.user_info.request_id)
        print(f"[DEBUG] /save-recommendation/ 진입 - user_id: {user_id}, request_id: {request_id}")

        request_info = db.query(Request).filter_by(user_id=user_id, request_id=request_id).first()
        result_info = db.query(Result).filter_by(request_id=request_id).first()

        if not request_info or not result_info:
            raise HTTPException(status_code=404, detail="사용자 요청 또는 분석 결과를 찾을 수 없습니다.")

        for rec in payload.recommendations:
            print(f"[DEBUG] 추천 스타일 처리 시작: {rec.style}")

            # 매핑값 생성
            hair_length = request_info.hair_length.strip()
            mapped_length = {'숏': 'S', '미디움': 'M'}.get(hair_length, 'L')

            face_type = result_info.face_type.strip()
            if face_type in ['네모형', '둥근형']:
                mapped_face = 'R'
            elif face_type in ['긴형', '계란형', '하트형']:
                mapped_face = 'S'
            else:
                mapped_face = None

            style_name = rec.style.strip()
            hair_type = request_info.hair_type.strip()
            sex = result_info.sex.strip()

            print(f"[DEBUG] 필수 조건 - name: {style_name}, sex: {sex}")
            print(f"[DEBUG] 선택 조건 - type: {hair_type}, face: {mapped_face}, length: {mapped_length}")

            # 필수 조건으로 후보군 필터링
            base_query = db.query(Hairstyle).filter_by(
                hairstyle_name=style_name,
                hairstyle_sex=sex
            )
            candidates = base_query.all()
            print(f"[DEBUG] 후보 개수: {len(candidates)}")

            # 선택 조건 매칭 점수 계산
            def score(h):
                s = 0
                if h.hairstyle_type == hair_type:
                    s += 1
                if h.hairstyle_face == mapped_face:
                    s += 1
                if h.hairstyle_length == mapped_length:
                    s += 1
                return s

            # 점수 순 정렬 → 가장 유사한 항목 선택
            hairstyle = max(candidates, key=score, default=None)

            print(f"[DEBUG] 최종 선택된 hairstyle: {hairstyle}")
            if hairstyle:
                if hairstyle.hairstyle_type is None:
                    print("[WARNING] hairstyle_type이 NULL입니다.")
                if hairstyle.hairstyle_face is None:
                    print("[WARNING] hairstyle_face가 NULL입니다.")
                if hairstyle.hairstyle_length is None:
                    print("[WARNING] hairstyle_length가 NULL입니다.")
            else:
                print("[WARNING] 조건에 맞는 hairstyle 없음")

            hair_id = hairstyle.hair_id if hairstyle else None
            print(f"[DEBUG] hair_id 매핑 결과: {hair_id}")

            # 추천 결과 저장
            hair_rec = HairRecommendation(
                simulation_image_url="dummy.jpg",
                hair_name=rec.style,
                description=rec.description,
                is_saved=0,
                request_id=request_id,
                hair_id=hair_id,
                user_id=user_id
            )
            db.add(hair_rec)
            db.flush()
            print(f"[DEBUG] HairRecommendation 저장 완료 - hair_rec_id: {hair_rec.hair_rec_id}")

            # 미용실 저장
            for shop in rec.hair_shops:
                print(f"[DEBUG] 미용실 저장 - {shop.hairshop}")
                db.add(HairshopRecommendation(
                    hairshop=shop.hairshop or "미정",
                    is_saved=0,
                    latitude=shop.latitude or 0.0,
                    longitude=shop.longitude or 0.0,
                    final_menu_price=shop.final_menu_price or 0,
                    review_count=shop.review_count or 0,
                    mean_score=shop.mean_score or 0.0,
                    hair_rec_id=hair_rec.hair_rec_id,
                    user_id=user_id
                ))

        db.commit()
        print(f"[INFO] 추천 결과 DB 저장 완료 - user_id: {user_id}, request_id: {request_id}")
        return {"message": "추천 결과 DB 저장 완료"}

    except Exception as e:
        print(f"[ERROR] /save-recommendation/ 예외 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=f"서버 내부 오류: {e}")



# @router.post("/save-recommendation/")
# def save_recommendation(payload: RecommendationPayload, db: Session = Depends(get_db)):
#     user_id = int(payload.user_info["user_id"])
#     request_id = int(payload.user_info["request_id"])

#     for rec in payload.recommendations:
#         hair_rec = HairRecommendation(
#             simulation_image_url="dummy.jpg",  # 추후 얼굴 시뮬레이션 이미지로 교체
#             hair_name=rec.style,
#             description=rec.description,
#             is_saved=0,
#             request_id=request_id,
#             hair_id=1,  # TODO: style 이름 기반 hair_id 매핑 로직 필요
#             user_id=user_id
#         )
#         db.add(hair_rec)
#         db.flush()

#         for shop in rec.hair_shops:
#             # db.add(HairshopRecommendation(
#             #     hairshop=shop.hairshop,
#             #     is_saved=0,
#             #     latitude=shop.latitude,
#             #     longitude=shop.longitude,
#             #     final_menu_price=shop.final_menu_price,
#             #     review_count=shop.review_count,
#             #     mean_score=shop.mean_score,
#             #     hair_rec_id=hair_rec.hair_rec_id,
#             #     user_id=user_id
#             # ))
#             db.add(HairshopRecommendation(
#                 hairshop=shop.hairshop or "미정",
#                 is_saved=0,
#                 latitude=shop.latitude or 0.0,
#                 longitude=shop.longitude or 0.0,
#                 final_menu_price=shop.final_menu_price or 0,
#                 review_count=shop.review_count or 0,
#                 mean_score=shop.mean_score or 0.0,
#                 hair_rec_id=hair_rec.hair_rec_id,
#                 user_id=user_id
#             ))

#     db.commit()
#     print(f"[INFO] user_id={user_id}, request_id={request_id} 추천 결과 DB 저장 완료")
#     return {"message": "추천 결과 DB 저장 완료"}

# 3. 기존: Main → StableHair 요청
@router.post("/run-stablehair/")
def run_recommendation(
    data: dict = Body(...),
    db: Session = Depends(get_db)
):
    user_id = data.get("user_id")
    request_id = data.get("request_id")

    print(f"[DEBUG] 요청 수신됨 - user_id: {user_id}, request_id: {request_id}")

    if not user_id or not request_id:
        print("[ERROR] user_id 또는 request_id가 없음")
        raise HTTPException(status_code=400, detail="user_id 또는 request_id가 누락되었습니다.")

    # payload 구성
    payload = get_analysis_payload(db, user_id, request_id)
    if not payload:
        print("[ERROR] get_analysis_payload 실패 - 데이터 없음")
        raise HTTPException(status_code=404, detail="요청 또는 분석 결과가 없습니다.")

    print(f"[INFO] payload 준비 완료 → StableHair 전송 시작\n{payload}")

    try:
        response = requests.post("http://43.201.129.41:8003/run-stablehair", json=payload)  # [운영용] EC2 고정 IP로 StableHair 서버 호출
        response.raise_for_status()

        print("[INFO] StableHair 응답 수신 성공")
        print(f"[DEBUG] StableHair 응답 데이터: {response.json()}")

        return {"message": "추천 성공", "result": response.json()}
    
    except requests.exceptions.RequestException as e:
        print(f"[ERROR] StableHair 요청 중 오류 발생: {e}")
        raise HTTPException(status_code=500, detail=f"StableHair 호출 실패: {e}")
