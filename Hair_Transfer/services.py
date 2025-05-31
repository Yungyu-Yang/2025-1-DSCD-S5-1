# services.py
import os
from db_utils import get_request_and_styles, update_simulation_url
from image_utils import load_image, simulate_hair, upload_to_s3
from notifier import notify_main_api


def run_stablehair_logic(user_id: int, request_id: int):
    """
    1) DB에서 user_image_url과 추천된 스타일 리스트 조회
    2) 각 스타일별로 이미지 로드 및 합성 실행
    3) 합성 결과(bald, result) S3에 업로드
    4) hair_recommendation_table에 simulation_image_url 갱신
    5) Main API에 전체 결과 알림
    """
    # 1) 요청 정보 및 추천 스타일 조회
    user_image_url, style_infos = get_request_and_styles(user_id, request_id)
    if not user_image_url or not style_infos:
        raise ValueError("유저 이미지 또는 추천된 스타일 정보를 찾을 수 없습니다.")

    results = []
    prefix = f"user_simulation_dic/{request_id}_test"

    # 2) 각 스타일에 대해 합성 및 업로드
    for info in style_infos:
        hair_rec_id = info["hair_rec_id"]
        ref_url     = info["hairstyle_image_url"]

        # 2-1) 입력 이미지 로드
        source_img = load_image(user_image_url)
        ref_img    = load_image(ref_url)

        # 2-2) 모델 합성 (bald, result)
        bald_img, result_img = simulate_hair(source_img, ref_img)

        # 3) S3 업로드
        result_url = upload_to_s3(result_img, prefix)

        print(f"🔄 [run_stablehair_logic] about to call update_simulation_url("
          f"user_id={user_id}, request_id={request_id}, "
          f"hair_rec_id={hair_rec_id}, image_url={result_url})")

        # 4) DB 업데이트
        # simulation_image_url 칼럼에 최종(result) URL만 저장
        update_simulation_url(
            user_id=user_id,
            request_id=request_id,
            hair_rec_id=hair_rec_id,
            image_url= result_url
        )

        results.append({
            "hair_rec_id":      hair_rec_id,
            "hair_id":     info["hair_id"],
            "hairstyle_name":   info["hairstyle_name"],
            "simulation_image_url": result_url
        })

    # 5) Main API에 알림
    notify_main_api(user_id, request_id, {"recommendations": results})

    return results
