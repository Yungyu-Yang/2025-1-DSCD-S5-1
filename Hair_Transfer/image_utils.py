import os, io, uuid
from PIL import Image, ExifTags
import requests
import boto3
from urllib.parse import urlparse
from rembg import remove # rembg 임포트 추가

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
        exif = img.getexif()

        if exif is not None:
            orientation_tag_id = None
            for tag_id, tag_name in ExifTags.TAGS.items():
                if tag_name == 'Orientation':
                    orientation_tag_id = tag_id
                    break

            if orientation_tag_id is not None and orientation_tag_id in exif:
                orientation = exif[orientation_tag_id]

                if orientation == 3:
                    img = img.rotate(180, expand=True)
                elif orientation == 6:
                    img = img.rotate(270, expand=True) # 90도 시계방향
                elif orientation == 8:
                    img = img.rotate(90, expand=True)  # 90도 시계 반대방향
        return img
    except (AttributeError, TypeError, IndexError, KeyError, ValueError) as e:
        print(f"DEBUG: Error processing EXIF for image: {e}")
        return img


def load_image(path_or_url: str, apply_background_removal: bool = False) -> Image.Image:
    """
    로컬 경로, HTTP(S) URL, 또는 S3 URI(s3://bucket/key)을 받아 PIL.Image 객체로 반환합니다.
    EXIF Orientation을 적용하여 이미지를 올바른 방향으로 회전시킵니다.
    apply_background_removal이 True이면 배경을 제거합니다.
    """
    img = None
    print(f"DEBUG(image_utils): Attempting to load image from: {path_or_url}")
    
    if path_or_url.startswith("s3://"):
        parsed = urlparse(path_or_url)
        bucket = parsed.netloc
        key    = parsed.path.lstrip("/")
        try:
            response = s3.get_object(Bucket=bucket, Key=key)
            img = Image.open(io.BytesIO(response['Body'].read())).convert("RGB")
            print(f"DEBUG(image_utils): Successfully loaded image from S3: {path_or_url}")
        except Exception as e:
            print(f"ERROR(image_utils): Failed to load image from S3 {path_or_url}: {e}")
            raise

    elif path_or_url.startswith("http://") or path_or_url.startswith("https://"):
        try:
            resp = requests.get(path_or_url)
            resp.raise_for_status()
            img = Image.open(io.BytesIO(resp.content)).convert("RGB")
            print(f"DEBUG(image_utils): Successfully loaded image from URL: {path_or_url}")
        except requests.exceptions.RequestException as e:
            print(f"ERROR(image_utils): Failed to load image from URL {path_or_url}: {e}")
            raise
        except Exception as e:
            print(f"ERROR(image_utils): Failed to open image from URL {path_or_url}: {e}")
            raise

    else:
        try:
            img = Image.open(path_or_url).convert("RGB")
            print(f"DEBUG(image_utils): Successfully loaded image from local path: {path_or_url}")
        except Exception as e:
            print(f"ERROR(image_utils): Failed to load image from local path {path_or_url}: {e}")
            raise
    
    if img:
        img = rotate_image_based_on_exif(img)

        # 배경 제거 로직 추가!
        if apply_background_removal:
            print(f"DEBUG(image_utils): Applying background removal to image.")
            img_no_bg = remove(img)
            
            # RGBA를 RGB로 변환하고, 알파 채널이 0인 부분은 흰색으로 채움
            if img_no_bg.mode == 'RGBA':
                new_img = Image.new("RGB", img_no_bg.size, (255, 255, 255)) # 흰색 배경 (RGB: 255, 255, 255)
                new_img.paste(img_no_bg, mask=img_no_bg.split()[3]) # 알파 채널을 마스크로 사용
                img = new_img
            else:
                img = img_no_bg.convert("RGB") # 이미 RGB면 그대로, 아니면 RGB로 변환
            print(f"DEBUG(image_utils): Background removal applied. New image mode: {img.mode}")
            
        # 디버깅을 위해 처리된 이미지를 임시 파일로 저장
        try:
            temp_file_path = f"/tmp/processed_image_{uuid.uuid4().hex}.jpg"
            img.save(temp_file_path)
            print(f"DEBUG(image_utils): Processed image saved to: {temp_file_path}")
        except Exception as e:
            print(f"WARNING(image_utils): Could not save debug processed image to /tmp/: {e}")
    
    return img


def simulate_hair(source_pil_img: Image.Image, ref_pil_img: Image.Image): # 매개변수를 PIL.Image 객체로 변경
    """
    주어진 PIL Image 객체를 사용하여 헤어 시뮬레이션을 수행합니다.
    URL 로딩 및 배경 제거 로직은 이 함수 외부(load_image 함수)에서 이미 처리되었습니다.

    Args:
        source_pil_img (Image.Image): 원본 사용자 이미지 (PIL Image 객체, 배경 제거 완료).
        ref_pil_img (Image.Image): 참조 헤어스타일 이미지 (PIL Image 객체, 배경 제거 완료).

    Returns:
        tuple: (bald_image_pil, result_image_pil) - PIL.Image 객체
    """
    from model import model_call # model_call은 model.py에 있을 것으로 예상

    # source_pil_img와 ref_pil_img는 이미 load_image에 의해 로드되고 배경 제거까지 된 상태입니다.
    # 따라서, 여기서는 다시 load_image를 호출할 필요가 없습니다.

    # model_call이 BytesIO를 받으므로, PIL.Image를 BytesIO로 변환
    buf_src = io.BytesIO()
    source_pil_img.save(buf_src, format="PNG") # PNG가 알파 채널을 잘 보존합니다.
    buf_src.seek(0)

    buf_ref = io.BytesIO()
    ref_pil_img.save(buf_ref, format="PNG") # PNG가 알파 채널을 잘 보존합니다.
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
        print(f"DEBUG(image_utils): Successfully uploaded image to S3: {uploaded_url}")
        return uploaded_url
    except Exception as e:
        print(f"ERROR(image_utils): Failed to upload image to S3 for key {key}: {e}")
        raise
