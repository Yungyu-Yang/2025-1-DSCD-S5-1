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
    1) request_table에서 user_image_url, hair_length, sex, has_bangs 조회
    2) result_table에서 최신 얼굴형(face_type) 조회
    3) hair_recommendation_table + hairstyle_table + request_table 조인해 최종 스타일 목록 조회
    Returns:
      - user_image_url: str or None
      - style_infos: list of dict
    """
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # 1) 사용자 이미지 URL, 기장, 성별, 앞머리 유무 조회
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
            hair_length    = req['hair_length']
            sex            = req['sex'] # 성별 추가
            has_bangs      = req['has_bangs'] # 앞머리 유무 추가

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

            # 3) 추천 스타일 정보 조회 (성별, 길이, 앞머리, 얼굴형 조건 적용)
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
                JOIN request_table AS r -- request_table을 다시 조인하여 r.sex, r.hair_length, r.has_bangs, r.face_type 사용
                  ON hr.request_id = r.request_id
                WHERE hr.user_id=%s
                  AND hr.request_id=%s
                  AND (
                      -- 남성 조건
                      (r.sex = '남성' AND
                          -- 길이 매핑 조건 (남성)
                          (
                              (h.hairstyle_length IS NULL AND r.hair_length IN ('숏', '미디움'))
                              OR (h.hairstyle_length IN ('S', 'M', 'L') AND r.hair_length = '롱')
                          )
                          -- 얼굴형 매핑 조건 (남성)
                          AND h.hairstyle_face = CASE
                              WHEN r.face_type IN ('네모형', '둥근형') THEN 'R'
                              WHEN r.face_type IN ('긴형', '계란형', '하트형') THEN 'S'
                              ELSE NULL
                          END
                      )
                      OR
                      -- 여성 조건
                      (r.sex = '여성' AND
                          -- 길이 매핑 조건 (여성)
                          h.hairstyle_length = CASE r.hair_length
                              WHEN '숏' THEN 'S'
                              WHEN '단발' THEN 'S'
                              WHEN '중단발' THEN 'M'
                              WHEN '장발' THEN 'L'
                              ELSE NULL
                          END
                          -- 앞머리 매핑 조건 (여성)
                          -- **주의**: hairstyle_table에 hairstyle_has_bangs 컬럼이 있어야 합니다.
                          -- 없거나 컬럼명이 다르다면 이 조건을 제거하거나 수정하세요.
                          AND h.hairstyle_has_bangs = CASE r.has_bangs
                              WHEN '있음' THEN 'Y'
                              WHEN '없음' THEN 'N'
                              ELSE NULL
                          END
                          -- 얼굴형 매핑 조건 (여성)
                          AND h.hairstyle_face = CASE
                              WHEN r.face_type IN ('네모형', '둥근형') THEN 'R'
                              WHEN r.face_type IN ('긴형', '계란형', '하트형') THEN 'S'
                              ELSE NULL
                          END
                      )
                  )
            """
            # SQL 쿼리의 %s 플레이스홀더에 맞는 인자 전달 (user_id, request_id만 쿼리 자체에서 사용)
            # 나머지 값들은 r.sex, r.hair_length, r.has_bangs, r.face_type 으로 쿼리 안에서 사용됩니다.
            cur.execute(sql_rec, (user_id, request_id))
            style_infos = cur.fetchall()

        conn.commit()
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