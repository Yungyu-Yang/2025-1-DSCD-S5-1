############################
# 1. Builder stage        #
############################
FROM python:3.10-slim AS builder

# Install build dependencies for compiling Python packages (e.g., for OpenCV)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential cmake git libboost-all-dev \
    && rm -rf /var/lib/apt/lists/*

ENV PIP_NO_CACHE_DIR=1
WORKDIR /install

# Copy requirements.txt to leverage Docker cache
COPY requirements.txt .

# Install all Python dependencies into a specific target directory
# NOTE: uvicorn은 requirements.txt에서 제거되었습니다!
# Using --extra-index-url and --find-links for CUDA-enabled PyTorch/xformers
RUN pip install --timeout=600 --retries=10 \
        --target=/install/packages \
        --extra-index-url https://download.pytorch.org/whl/cu118 \
        --find-links https://download.pytorch.org/whl/cu118/torch_stable.html \
        -r requirements.txt \
    && rm -f requirements.txt # Clean up temporary file

############################
# 2. Runtime stage       #
############################
# Use a CUDA runtime image that includes cuDNN
FROM nvidia/cuda:11.8.0-cudnn8-runtime-ubuntu22.04

ENV PYTHONUNBUFFERED=1 \
    PATH=/usr/local/bin:$PATH

# Install only necessary runtime dependencies
RUN apt-get update -o Acquire::Retries=5 \
    && apt-get install -y --no-install-recommends \
        python3.10 python3-pip python3-dev \
        ffmpeg libsm6 libxext6 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*

# Copy pre-installed Python packages from the builder stage
COPY --from=builder /install/packages /usr/local/lib/python3.10/dist-packages

# --- uvicorn을 여기에서만 확실하게 설치합니다 ---
RUN python3.10 -m pip install --no-cache-dir uvicorn==0.29.0
# ---

# Application code
WORKDIR /app
COPY . .

EXPOSE 8003
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8003"]
