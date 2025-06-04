import os
import pymysql
from dotenv import load_dotenv
from datetime import datetime, timezone # 이 임포트는 get_request_and_styles 함수 내에서 사용되지 않으므로 제거 가능하지만, 여기서는 원본 그대로 유지합니다.

# .env 파일 로드
load_dotenv()

# DB 접속 정보
db_config = {
    "host": os.getenv("DB_HOST"),
    "port": int(os.getenv("DB_PORT", 3306)),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "db": os.getenv("DB_NAME"),
    "charset": "utf8mb4",
    "cursorclass": pymysql.cursors.DictCursor,
    "autocommit": False
}

def get_connection():
    return pymysql.connect(**db_config)


def get_request_and_styles(user_id: int, request_id: int):
    """
    1) request_table에서 user_image_url, hair_length, sex, has_bangs 조회
    2) result_table에서 최신 얼굴형(face_type) 조회
    3) hair_recommendation_table + hairstyle_table 조인해 최종 스타일 목록 조회
       (단, 이제 얼굴형 및 머리 기장 조건 없이 user_id와 request_id로만 필터링)
    Returns:
      - user_image_url: str or None
      - style_infos: list of dict
    """
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # 1) 사용자 이미지 URL, 기장, 성별, 앞머리 유무 조회
            # 이 정보들은 이제 추천 쿼리에서 필터링 조건으로 사용되지 않습니다.
            cur.execute(
                """
                SELECT user_image_url, hair_length, sex, has_bangs
                  FROM request_table
                 WHERE user_id=%s AND request_id=%s
                 LIMIT 1
                """,
                (user_id, request_id)
            )
            req = cur.fetchone()
            if not req:
                return None, []
            user_image_url = req['user_image_url']
            # hair_length, sex, has_bangs 변수는 이제 추천 쿼리에 전달되지 않습니다.
            # face_type 변수도 마찬가지입니다.

            # 2) 최신 얼굴형(face_type) 조회
            # 이 정보도 이제 추천 쿼리에서 필터링 조건으로 사용되지 않습니다.
            cur.execute(
                """
                SELECT face_type
                  FROM result_table
                 WHERE request_id=%s
                 ORDER BY created_at DESC
                 LIMIT 1
                """,
                (request_id,)
            )
            res = cur.fetchone()
            if not res:
                # 얼굴형 정보가 없으면 추천 목록도 없다고 간주 (서비스 로직에 따라 변경 가능)
                return user_image_url, []

            # 3) 추천 스타일 정보 조회 (user_id와 request_id 조건만 사용)
            # request_table과의 조인 및 모든 필터링 조건 제거
            sql_rec = """
                SELECT
                  hr.user_id,
                  hr.request_id,
                  hr.hair_rec_id,
                  hr.hair_id,
                  h.hairstyle_name,
                  h.hairstyle_image_url
                FROM hair_recommendation_table AS hr
                JOIN hairstyle_table AS h
                  ON hr.hair_id = h.hair_id
                WHERE hr.user_id = %s
                  AND hr.request_id = %s;
            """
            # 쿼리에 필요한 인자는 user_id와 request_id 뿐입니다.
            cur.execute(sql_rec, (user_id, request_id))
            style_infos = cur.fetchall()

        conn.commit() # SELECT 쿼리에서는 일반적으로 commit이 필요 없지만, 기존 코드 구조를 유지합니다.
        return user_image_url, style_infos

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] get_request_and_styles: {e}")
        return None, []

    finally:
        conn.close()

# update_simulation_url 함수는 변경 없음
def update_simulation_url(user_id: int, request_id: int, hair_rec_id: int, image_url: str):
    """
    hair_recommendation_table의 simulation_image_url 컬럼만 업데이트
    """
    sql = """
        UPDATE hair_recommendation_table
           SET simulation_image_url = %s
         WHERE user_id=%s
           AND request_id=%s
           AND hair_rec_id=%s
    """
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, (image_url, user_id, request_id, hair_rec_id))
            print(f"▶ [update_simulation_url] rowcount={cur.rowcount}")
        conn.commit()
        print("✅ [update_simulation_url] committed")
    except Exception as e:
        conn.rollback()
        print(f"[ERROR] update_simulation_url: {e}")
    finally:
        conn.close()