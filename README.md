# 🜂 Montgomery Guardian — Apex Cognitive Infrastructure

**Montgomery Guardian** là một nền tảng an toàn công cộng và quản lý đô thị thế hệ mới, được thiết kế để giải quyết bài toán phản ứng nhanh và dự báo rủi ro tại thành phố Montgomery, Alabama. Công trình này được xây dựng dựa trên triết lý **"Zero-Entropy Architecture"** — đảm bảo tính ổn định tuyệt đối và khả năng tự phục hồi trong môi trường triển khai thực tế.

## 🧠 Tầm Nhìn Dự Án: "Resurrection Protocol"
 Montgomery Guardian không chỉ là một ứng dụng; nó là một thực thể sống với kiến trúc đa tầng đồng nhất. Trong quá trình phát triển, chúng tôi đã thực thi các giao thức phục hồi hệ thống để đảm bảo:
- **Zero Hallucination**: AI Agents được kiểm soát bởi các lớp Safety Guard.
- **Limitless Scale**: Backend đa luồng, tối ưu hóa bởi Redis Mutex.
- **Causal Visibility**: Mọi sự cố đô thị đều được ánh xạ và xử lý theo thời gian thực.

## 🛠️ Trụ Cột Công Nghệ (Apex Tech Stack)

### 1. Vision AI Analysis (Vision Recovery)
- Sử dụng **Gemini 1.5 Flash** để phân tích hình ảnh sự cố đô thị (ổ gà, rác thải, ngập lụt...) từ camera người dân.
- Tự động điền form 311, đề xuất mức độ ưu tiên và thời gian xử lý dựa trên dữ liệu lịch sử.

### 2. Multi-Agent Orchestrator
- Hệ thống AI Agents phi tập trung: Vision Agent, Chat Agent, và Safety Monitor.
- Giao thức liên kết Node.js (AI Agents) và FastAPI (Core Logic) thông qua cổng Proxy bảo mật.

### 3. Real-time Urban Feedback
- **WebSockets Cloud-Native**: Tự động đồng bộ hóa bản đồ nhiệt (Heatmap) tội phạm và sự cố 311 mà không cần reload.
- **Throttling Buffer**: Cơ chế giảm xóc dữ liệu trên Frontend để xử lý lưu lượng cao.

### 4. Smart Scrapers & ETL
- Tích hợp **Bright Data** để thu thập dữ liệu từ các nguồn tin tức chính thống của Montgomery.
- Scheduler điều phối dữ liệu định kỳ, đảm bảo bản đồ luôn phản ánh trạng thái mới nhất của thành phố.

## 🚀 Hướng Dẫn Triển Khai (Deployment Guide)

### Yêu Cầu Hệ Thống
- Docker & Docker Compose
- Node.js & pnpm
- Python 3.10+

### Chạy Local (Development Mode)
1. Sao chép `.env.example` thành `.env` và điền các API Keys (Gemini, Bright Data, Mapbox).
2. Khởi động hệ thống:
   ```bash
   docker-compose up -d --build
   ```
3. Truy cập Dashboard tại `http://localhost:3000`.

### Cấu Hình Triển Khai Cloud
Hệ thống đã được tối ưu hóa cho:
- **Vercel**: Cho Frontend (Next.js Standalone).
- **Railway**: Cho Backend services (FastAPI + AI Agents + ChromaDB + DB).

---
**[THỢ RÈN] Note**: Built for the Hackathon with high cognitive momentum. Stability verified.
