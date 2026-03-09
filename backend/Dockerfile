# syntax=docker/dockerfile:1.4
FROM python:3.11-slim as builder

# Giáng cấp Entropy: Cài đặt các thư viện cần thiết để build psycopg2 và geopandas
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Ưu tiên copy requirements.txt trước để tận dụng Docker cache layer
COPY backend/requirements.txt .

# Tạo virtual environment và install dependencies
RUN python -m venv /opt/venv && \
    /opt/venv/bin/pip install --no-cache-dir --upgrade pip && \
    /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

# --- Stage 2: Bản chạy Production siêu nhẹ ---
FROM python:3.11-slim

# Copy thư viện runtime (libpq5 cần thiết cho psycopg2 ở runtime)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy virtual environment từ builder stage
COPY --from=builder /opt/venv /opt/venv

# Thêm venv vào PATH
ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Sao chép mã nguồn backend
COPY backend/ .
# Backend references shared/ - let's check if it needs actual shared folder or just its internal models
# Based on grep, it says "matches shared/types", so it might be a comment or literal path.
# Let's copy shared just in case.
COPY shared ../shared

# Exposed port
EXPOSE 8000

# Chạy Uvicorn Server
# Lưu ý command thực tế đã được chèn qua docker-compose.yml 
# Đây là dự phòng mặc định nếu chạy stand-alone
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
