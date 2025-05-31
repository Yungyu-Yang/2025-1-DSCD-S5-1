import os
import requests

MAIN_API_URL = os.getenv("MAIN_API_URL", "http://main-api:8000")

def notify_main_api(user_id: int, request_id: int, result: dict):
    try:
        response = requests.post(
            f"{MAIN_API_URL}/run-recommendation/",
            json={
                "user_id": user_id,
                "request_id": request_id,
                "result": result
            }
        )
        print("[INFO] 메인 API 알림 전송 성공:", response.status_code)
    except Exception as e:
        print("[ERROR] 메인 API 알림 실패:", e)
