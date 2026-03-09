# syntax=docker/dockerfile:1.4
FROM node:20-alpine AS builder

WORKDIR /app

# Cài đặt pnpm
RUN npm install -g pnpm

# Copy package.json và pnpm-lock.yaml (nếu có)
COPY ai-agents/package.json ./

# Cài đặt dependencies (cả dev)
RUN pnpm install

# Sao chép source code
COPY ai-agents/src ./src
COPY ai-agents/tsconfig.json ./

# Sao chép shared folder vào vị trí mà tsconfig mong đợi (hoặc lừa nó)
# [THỢ RÈN] Tạo folder shared ngay tại gốc build để tsc không bị "đi lạc"
COPY shared ./shared
# Sửa tsconfig.json để trỏ vào ./shared thay vì ../shared (trong container là cùng cấp)
RUN sed -i 's/..\/shared/.\/shared/g' tsconfig.json



# Biên dịch TypeScript sang JavaScript
RUN pnpm run build

# --- Stage 2: Production Tối Giản ---
FROM node:20-alpine

WORKDIR /app

# Cài đặt pnpm
RUN npm install -g pnpm

# Chỉ copy package.json và lock file
COPY ai-agents/package.json ./

# Chỉ install production dependencies
RUN pnpm install --prod

# Copy kết quả build từ stage trước
COPY --from=builder /app/dist ./dist
# Đặt biến môi trường Production
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Lệnh khởi động - Dùng find để tìm index.js chính xác (đề phòng tsc lồng folder không mong muốn)
CMD ["sh", "-c", "node $(find dist -name index.js | grep -v \"shared\" | grep \"src\" | head -n 1)"]

