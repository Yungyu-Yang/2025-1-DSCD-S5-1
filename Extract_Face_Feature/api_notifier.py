# Extract_Face_Feature/notifier.py

import requests

def notify_main_api(user_id: int, request_id: int):
    try:
        # # [개발용] 로컬 테스트 환경: Docker 컨테이너에서 호스트 PC로 접근할 때 사용
        # response = requests.post("http://host.docker.internal:8000/run-recommendation/", json={
        #     "user_id": user_id,
        #     "request_id": request_id
        # })
        
        # [운영용] aws url로 수정
        response = requests.post("http://43.201.129.41:8000/run-recommendation/", json={
            "user_id": user_id,
            "request_id": request_id
        })
        print("[INFO] Main API 호출 완료:", response.status_code)
        print("[INFO] Main API 응답 내용:", response.text)
    except Exception as e:
        print("[ERROR] Main API 호출 실패:", e)