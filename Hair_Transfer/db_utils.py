# db_utils.py
import os
import pymysql
from dotenv import load_dotenv
from datetime import datetime, timezone

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
    1) request_table에서 user_image_url, hair_length 조회
    2) result_table에서 최신 얼굴형(face_type) 조회
    3) hair_recommendation_table + hairstyle_table 조인해 최종 스타일 목록 조회
    Returns:
      - user_image_url: str or None
      - style_infos: list of dict
    """
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # 1) 사용자 이미지 URL 및 기장 조회
            cur.execute(
                """
                SELECT user_image_url, hair_length
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
            hair_length    = req['hair_length']

            # 2) 최신 얼굴형(face_type) 조회 (result_table에 user_id 컬럼 없음)
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
                return user_image_url, []
            face_type = res['face_type']

            # 3) 추천 스타일 정보 조회
            # 변경사항:
            #   - hair_id를 통한 정확한 조인 조건 사용 (이전 hairstyle_name 조인 제거)
            #   - 길이 매핑 조건 (새로운 규칙) 및 얼굴형 매핑 조건 (수정된 규칙)을 WHERE 절에 통합
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
                WHERE hr.user_id=%s
                  AND hr.request_id=%s
                  -- 길이 매핑 조건: hairstyle_table의 length와 request_table의 hair_length 매칭
                  AND (
                      (h.hairstyle_length IS NULL AND %s IN ('숏', '미디움'))
                      OR (h.hairstyle_length IN ('S', 'M', 'L') AND %s = '롱')
                  )
                  -- 얼굴형 매핑 조건: hairstyle_table의 face와 result_table의 face_type 매칭
                  AND h.hairstyle_face = CASE
                      WHEN %s IN ('네모형', '둥근형') THEN 'R'
                      WHEN %s IN ('긴형', '계란형', '하트형') THEN 'S'
                      ELSE NULL
                  END
            """
            # SQL 쿼리의 %s 플레이스홀더 순서에 맞춰 인자 전달:
            # hr.user_id, hr.request_id, hair_length(길이1), hair_length(길이2), face_type(얼굴1), face_type(얼굴2)
            cur.execute(sql_rec, (user_id, request_id, hair_length, hair_length, face_type, face_type))
            style_infos = cur.fetchall()

        conn.commit()
        return user_image_url, style_infos

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] get_request_and_styles: {e}")
        return None, []

    finally:
        conn.close()


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