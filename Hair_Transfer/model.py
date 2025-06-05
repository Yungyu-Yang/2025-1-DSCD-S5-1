import torch
from PIL import Image
import numpy as np
from omegaconf import OmegaConf
import os
import cv2
from diffusers import DDIMScheduler, UniPCMultistepScheduler
from diffusers.models import UNet2DConditionModel
from ref_encoder.latent_controlnet import ControlNetModel
from ref_encoder.adapter import *
from ref_encoder.reference_unet import ref_unet
from utils.pipeline import StableHairPipeline
from utils.pipeline_cn import StableDiffusionControlNetPipeline
import io
import uuid
# from rembg import remove # rembg 임포트 제거됨 (여기서는 더 이상 필요 없음)

torch.cuda.empty_cache()
torch.cuda.ipc_collect()

class StableHair:
    def __init__(self, config="./configs/hair_transfer.yaml", device="cuda", weight_dtype=torch.float32) -> None:
        print("Initializing Stable Hair Pipeline...")
        self.config = OmegaConf.load(config)
        self.device = device

        ### Load vae controlnet
        unet = UNet2DConditionModel.from_pretrained(self.config.pretrained_model_path, subfolder="unet").to(device)
        controlnet = ControlNetModel.from_unet(unet).to(device)
        _state_dict = torch.load(os.path.join(self.config.pretrained_folder, self.config.controlnet_path))
        controlnet.load_state_dict(_state_dict, strict=False)
        controlnet.to(weight_dtype)

        ### >>> create pipeline >>> ###
        self.pipeline = StableHairPipeline.from_pretrained(
            self.config.pretrained_model_path,
            controlnet=controlnet,
            safety_checker=None,
            torch_dtype=weight_dtype,
        ).to(device)
        self.pipeline.scheduler = DDIMScheduler.from_config(self.pipeline.scheduler.config)

        ### load Hair encoder/adapter
        self.hair_encoder = ref_unet.from_pretrained(self.config.pretrained_model_path, subfolder="unet").to(device)
        _state_dict = torch.load(os.path.join(self.config.pretrained_folder, self.config.encoder_path))
        self.hair_encoder.load_state_dict(_state_dict, strict=False)
        self.hair_adapter = adapter_injection(self.pipeline.unet, device=self.device, dtype=torch.float16, use_resampler=False)
        _state_dict = torch.load(os.path.join(self.config.pretrained_folder, self.config.adapter_path))
        self.hair_adapter.load_state_dict(_state_dict, strict=False)

        ### load bald converter
        bald_converter = ControlNetModel.from_unet(unet).to(device)
        _state_dict = torch.load(self.config.bald_converter_path)
        bald_converter.load_state_dict(_state_dict, strict=False)
        bald_converter.to(dtype=weight_dtype)
        del unet

        ### create pipeline for hair removal
        self.remove_hair_pipeline = StableDiffusionControlNetPipeline.from_pretrained(
            self.config.pretrained_model_path,
            controlnet=bald_converter,
            safety_checker=None,
            torch_dtype=weight_dtype,
        )
        self.remove_hair_pipeline.scheduler = UniPCMultistepScheduler.from_config(self.remove_hair_pipeline.scheduler.config)
        self.remove_hair_pipeline = self.remove_hair_pipeline.to(device)

        ### move to fp16
        self.hair_encoder.to(weight_dtype)
        self.hair_adapter.to(weight_dtype)

        print("Initialization Done!")

    def Hair_Transfer(self, source_image, reference_image, random_seed, step, guidance_scale, scale, controlnet_conditioning_scale):
        prompt = ""
        n_prompt = ""
        random_seed = int(random_seed)
        step = int(step)
        guidance_scale = float(guidance_scale)
        scale = float(scale)
        controlnet_conditioning_scale = float(controlnet_conditioning_scale)

        # load imgs
        H, W, C = source_image.shape

        # generate images
        set_scale(self.pipeline.unet, scale)
        generator = torch.Generator(device="cuda")
        generator.manual_seed(random_seed)
        
        print(f"DEBUG(Hair_Transfer): Running inference with params: steps={step}, guidance={guidance_scale}, scale={scale}, controlnet_scale={controlnet_conditioning_scale}")
        print(f"DEBUG(Hair_Transfer): source_image shape: {source_image.shape}, dtype: {source_image.dtype}")
        print(f"DEBUG(Hair_Transfer): reference_image shape: {reference_image.shape}, dtype: {reference_image.dtype}")

        sample = self.pipeline(
            prompt,
            negative_prompt=n_prompt,
            num_inference_steps=step,
            guidance_scale=guidance_scale,
            width=W,
            height=H,
            controlnet_condition=source_image,
            controlnet_conditioning_scale=controlnet_conditioning_scale,
            generator=generator,
            reference_encoder=self.hair_encoder,
            ref_image=reference_image,
        ).samples
        
        print(f"DEBUG(Hair_Transfer): Pipeline returned sample of shape: {sample.shape}, dtype: {sample.dtype}")
        return sample, source_image, reference_image

    def get_bald(self, id_image: Image.Image, scale):
        H, W = id_image.size
        scale = float(scale)
        
        print(f"DEBUG(get_bald): Generating bald image for input size: {id_image.size}, scale: {scale}")

        image = self.remove_hair_pipeline(
            prompt="",
            negative_prompt="",
            num_inference_steps=30,
            guidance_scale=1.3,
            width=W,
            height=H,
            image=id_image,
            controlnet_conditioning_scale=scale,
            generator=None,
        ).images[0]
        
        print(f"DEBUG(get_bald): Bald image generated, type: {type(image)}, size: {image.size}")
        return image

def resize_with_padding(image: Image.Image, target_size=(512, 512), fill_color=(0, 0, 0)):
    original_size = image.size
    ratio = min(target_size[0] / original_size[0], target_size[1] / original_size[1])
    new_size = (int(original_size[0] * ratio), int(original_size[1] * ratio))
    resized_image = image.resize(new_size, Image.LANCZOS)

    new_image = Image.new("RGB", target_size, fill_color)
    paste_position = ((target_size[0] - new_size[0]) // 2, (target_size[1] - new_size[1]) // 2)
    new_image.paste(resized_image, paste_position)
    return new_image


def model_call(id_image_buf: io.BytesIO, ref_hair_buf: io.BytesIO, converter_scale=1, scale=1, guidance_scale=1.3, controlnet_conditioning_scale=1):
    """
    주어진 이미지 버퍼들을 사용하여 헤어 전송 모델을 호출하고 결과를 반환합니다.
    이 함수에 전달되는 이미지는 이미 배경 제거 전처리가 완료되었다고 가정합니다.
    """
    model = StableHair(config="./configs/hair_transfer.yaml", weight_dtype=torch.float16)
    print("DEBUG(model_call): StableHair model initialized.")

    # BytesIO 객체에서 이미지 로드
    id_image = Image.open(id_image_buf).convert("RGB")
    ref_hair = Image.open(ref_hair_buf).convert("RGB")
    print(f"DEBUG(model_call): Input id_image loaded: size={id_image.size}, mode={id_image.mode}")
    print(f"DEBUG(model_call): Input ref_hair loaded: size={ref_hair.size}, mode={ref_hair.mode}")

    # --- 배경 제거 로직은 image_utils.py의 load_image 함수로 이동됨 ---
    print("DEBUG(model_call): Background removal is assumed to be handled by image_utils.load_image.")


    # resize_with_padding 적용
    id_image = resize_with_padding(id_image)
    ref_hair = resize_with_padding(ref_hair) 

    # 디버깅을 위해 resize_with_padding 후 이미지 저장
    try:
        temp_id_path = f"/tmp/debug_resized_id_image_{uuid.uuid4().hex}.png"
        temp_ref_path = f"/tmp/debug_resized_ref_image_{uuid.uuid4().hex}.png"
        id_image.save(temp_id_path)
        ref_hair.save(temp_ref_path)
        print(f"DEBUG(model_call): Resized images saved to: {temp_id_path}, {temp_ref_path}")
    except Exception as e:
        print(f"WARNING(model_call): Could not save resized debug images: {e}")

    # 민머리 이미지 생성
    id_image_bald = model.get_bald(id_image, converter_scale)

    # 디버깅을 위해 민머리 이미지 저장
    try:
        temp_bald_path = f"/tmp/debug_bald_image_{uuid.uuid4().hex}.png"
        id_image_bald.save(temp_bald_path)
        print(f"DEBUG(model_call): Bald image saved to: {temp_bald_path}")
    except Exception as e:
        print(f"WARNING(model_call): Could not save bald debug image: {e}")

    # Hair_Transfer 함수에 전달하기 전에 numpy 배열로 변환
    id_image_bald_np = np.array(id_image_bald).astype("uint8")
    ref_hair_np = np.array(ref_hair).astype("uint8")

    print(f"DEBUG(model_call): Input to Hair_Transfer - id_image_bald_np shape: {id_image_bald_np.shape}, dtype: {id_image_bald_np.dtype}")
    print(f"DEBUG(model_call): Input to Hair_Transfer - ref_hair_np shape: {ref_hair_np.shape}, dtype: {ref_hair_np.dtype}")


    image_sample, _, _ = model.Hair_Transfer(source_image=id_image_bald_np,
                                             reference_image=ref_hair_np,
                                             random_seed=-1,
                                             step=30,
                                             guidance_scale=guidance_scale,
                                             scale=scale,
                                             controlnet_conditioning_scale=controlnet_conditioning_scale
                                             )

    # 최종 합성 결과 (numpy 배열)를 PIL.Image로 변환
    image = Image.fromarray((image_sample * 255.).astype(np.uint8))

    # 디버깅을 위해 최종 합성 이미지 저장
    try:
        temp_final_path = f"/tmp/debug_final_composite_{uuid.uuid4().hex}.png"
        image.save(temp_final_path)
        print(f"DEBUG(model_call): Final composite image saved to: {temp_final_path}")
    except Exception as e:
        print(f"WARNING(model_call): Could not save final composite debug image: {e}")

    return id_image_bald, image