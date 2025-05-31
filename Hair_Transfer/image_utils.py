# image_utils.py
import os, io, uuid
from PIL import Image, ExifTags
import requests
import boto3
from urllib.parse import urlparse

# boto3 클라이언트 초기화 (환경변수 사용)
s3 = boto3.client(
    "s3",
    region_name=os.getenv("AWS_REGION"),
)

BUCKET    = os.getenv("AWS_S3_BUCKET")
BASE_URL  = os.getenv("AWS_S3_BASE_URL").rstrip("/")


def rotate_image_based_on_exif(img: Image.Image) -> Image.Image:
    """
    PIL.Image 객체에 대해 EXIF Orientation을 적용하여 회전합니다.
    Args:
        img: 원본 PIL.Image 객체
    Returns:
        PIL.Image.Image: 올바른 방향으로 회전된 이미지 객체
    """
    try:
        # 변경: img._getexif() 대신 img.getexif() 사용
        exif = img.getexif()

        if exif is not None:
            # Orientation 태그 값 찾기
            orientation_tag_id = None
            for tag_id, tag_name in ExifTags.TAGS.items():
                if tag_name == 'Orientation':
                    orientation_tag_id = tag_id
                    break

            if orientation_tag_id is not None and orientation_tag_id in exif:
                orientation = exif[orientation_tag_id]

                # Orientation 값에 따라 이미지 회전
                # expand=True는 회전 후 이미지 크기가 커질 경우 자동으로 확장
                if orientation == 3:
                    img = img.rotate(180, expand=True)
                elif orientation == 6:
                    img = img.rotate(270, expand=True) # 90도 시계방향
                elif orientation == 8:
                    img = img.rotate(90, expand=True)  # 90도 시계 반대방향
                # 다른 orientation 값 (1, 2, 4, 5, 7)은 필요에 따라 추가 처리
        return img
    except (AttributeError, TypeError, IndexError, KeyError, ValueError) as e:
        # EXIF 데이터가 없거나, 이미지 처리 중 오류 발생 시
        # 예를 들어, PNG 파일에는 EXIF 데이터가 없을 수 있으므로 이 오류는 무시하고 원본 반환
        print(f"DEBUG: Error processing EXIF for image: {e}") # 로그 레벨 조정
        return img # 원본 이미지 반환


def load_image(path_or_url: str) -> Image.Image:
    """
    로컬 경로, HTTP(S) URL, 또는 S3 URI(s3://bucket/key)을 받아 PIL.Image 객체로 반환합니다.
    EXIF Orientation을 적용하여 이미지를 올바른 방향으로 회전시킵니다.
    디버깅을 위해 로드 및 회전된 이미지를 /tmp/ 디렉토리에 저장합니다.
    """
    img = None
    print(f"DEBUG(image_utils): Attempting to load image from: {path_or_url}") # 2-1 확인
    
    # S3 URI 처리
    if path_or_url.startswith("s3://"):
        parsed = urlparse(path_or_url)
        bucket = parsed.netloc
        key    = parsed.path.lstrip("/")
        try:
            response = s3.get_object(Bucket=bucket, Key=key)
            img = Image.open(io.BytesIO(response['Body'].read())).convert("RGB")
            print(f"DEBUG(image_utils): Successfully loaded image from S3: {path_or_url}") # 2-1 확인
        except Exception as e:
            print(f"ERROR(image_utils): Failed to load image from S3 {path_or_url}: {e}") # 2-1 확인
            raise # S3 로드 실패는 치명적이므로 예외 발생

    # HTTP/HTTPS URL 처리
    elif path_or_url.startswith("http://") or path_or_url.startswith("https://"):
        try:
            resp = requests.get(path_or_url)
            resp.raise_for_status() # HTTP 오류 코드(4xx, 5xx)에 대해 예외 발생
            img = Image.open(io.BytesIO(resp.content)).convert("RGB")
            print(f"DEBUG(image_utils): Successfully loaded image from URL: {path_or_url}") # 2-1 확인
        except requests.exceptions.RequestException as e:
            print(f"ERROR(image_utils): Failed to load image from URL {path_or_url}: {e}") # 2-1 확인
            raise
        except Exception as e:
            print(f"ERROR(image_utils): Failed to open image from URL {path_or_url}: {e}") # 2-1 확인
            raise

    # 로컬 파일 시스템 경로
    else:
        try:
            img = Image.open(path_or_url).convert("RGB")
            print(f"DEBUG(image_utils): Successfully loaded image from local path: {path_or_url}") # 2-1 확인
        except Exception as e:
            print(f"ERROR(image_utils): Failed to load image from local path {path_or_url}: {e}") # 2-1 확인
            raise
    
    # 이미지가 로드된 후 EXIF Orientation 적용
    if img:
        img = rotate_image_based_on_exif(img)
        # 디버깅을 위해 회전된 이미지를 임시 파일로 저장 (2-2 확인)
        try:
            # /tmp/ 디렉토리는 도커 컨테이너 내부의 임시 디렉토리입니다.
            # 컨테이너를 재시작하면 사라질 수 있으므로, 필요하다면 호스트와 마운트된 볼륨 사용 고려.
            temp_file_path = f"/tmp/loaded_rotated_image_{uuid.uuid4().hex}.jpg"
            img.save(temp_file_path)
            print(f"DEBUG(image_utils): Rotated image saved to: {temp_file_path} (Check `docker exec -it [container_id] ls /tmp/`)")
        except Exception as e:
            print(f"WARNING(image_utils): Could not save debug rotated image to /tmp/: {e}")
    
    return img


def simulate_hair(source_img, ref_img):
    """
    소스 이미지와 레퍼런스 이미지를 받아 합성 모델을 호출하고 결과를 반환합니다.
    """
    from model import model_call # model_call은 model.py에 있을 것으로 예상

    # source_img, ref_img가 PIL.Image일 경우 BytesIO 래핑
    # model_call이 파일 경로 대신 BytesIO를 직접 받는다고 가정합니다.
    buf_src = io.BytesIO()
    source_img.save(buf_src, format="PNG") # PNG는 손실 압축이 없어 디버깅에 유리
    buf_src.seek(0)

    buf_ref = io.BytesIO()
    ref_img.save(buf_ref, format="PNG")
    buf_ref.seek(0)
    
    print("DEBUG(image_utils): Calling model_call for simulation.")
    bald_img, result_img = model_call(buf_src, buf_ref)
    print("DEBUG(image_utils): model_call completed.")

    return bald_img, result_img


def upload_to_s3(img: Image.Image, prefix: str) -> str:
    """
    PIL.Image를 in-memory로 변환해 S3에 업로드하고 public URL을 리턴합니다.
    """
    buffer = io.BytesIO()
    # JPEG로 저장 시 압축률과 품질을 명시
    img.save(buffer, format="JPEG", quality=90)
    buffer.seek(0)

    key = f"{prefix}/{uuid.uuid4().hex}.jpg"
    
    try:
        s3.upload_fileobj(
            buffer,
            BUCKET,
            key,
            ExtraArgs={"ContentType": "image/jpeg", "ACL": "public-read"}
        )
        uploaded_url = f"{BASE_URL}/{key}"
        print(f"DEBUG(image_utils): Successfully uploaded image to S3: {uploaded_url}") # 4-2 확인
        return uploaded_url
    except Exception as e:
        print(f"ERROR(image_utils): Failed to upload image to S3 for key {key}: {e}") # 4-2 확인
        raise # S3 업로드 실패 시 예외 발생