# 🚨 MONTGOMERY GUARDIAN v2.0
## AI-Powered City Safety Intelligence Platform
### *"The platform that covers every track — in one product."*

**Product Requirements Document (PRD) — v2.0**
World Wide Vibes Hackathon | GenAI.Works Academy | **Track 4: Public Safety** *(covers Track 1 implicitly)*
March 5–9, 2026 | Prize Pool: $5,000

> **v2.0 Changelog:** Tích hợp Vision AI Photo-to-Report, 311 Service Requests dataset, và Multi-Agent Agentic Architecture từ Monty Agent research. Montgomery Guardian giờ bao phủ cả Track 1 lẫn Track 4 trong một sản phẩm duy nhất.

| TARGET PRIZE | BUILD TIME | WIN PROBABILITY |
|---|---|---|
| 🥇 1st Place $2,500 | ~72 hours | **Very High** |

---

# 1. Executive Summary

Montgomery Guardian là **AI-powered multi-agent safety platform** phục vụ thành phố Montgomery, Alabama — kết hợp dữ liệu mở của thành phố (Crime Mapping + **311 Service Requests**), real-time web scraping qua Bright Data MCP, **Gemini Vision AI**, và SOTA predictive ML để cung cấp intelligence toàn diện cho cả chính quyền lẫn người dân.

**Kiến trúc 3 tầng (v2.0 — upgraded):**
- **Tầng 1** — Real-time Safety Intelligence Dashboard *(Crime heatmap + **311 overlay**)*
- **Tầng 2** — Multi-Agent Safety Companion *(Chatbot + **Vision AI Report** + Service Finder)*
- **Tầng 3** — Predictive Analytics Engine *(SOTA ML + ROI Calculator)*

> **Tại sao v2.0 thắng cả hai tracks?**
> - **Track 4 (Public Safety):** Crime prediction, emergency response, patrol optimization — moat mà 90% team không build được
> - **Track 1 (Civic Access):** 311 Service Finder, Vision photo-to-report, multilingual chatbot — bao phủ đúng "Service Finder" example của hackathon
> - Judges thấy **một platform làm được việc của hai track** → điểm Originality + Commercial Potential max

---

# 2. Market Context & Competitive Analysis

## 2.1 Thị trường & Bối cảnh

Thị trường public safety software toàn cầu: **$7.1B (2024) → $9.7B (2029)**, CAGR 6.5%. Thị trường GovTech 311/Civic Access: thêm $4.2B, với 18,000+ agencies tại Mỹ chưa có AI-native solution.

Montgomery Guardian v2.0 đánh vào **cả hai thị trường cùng lúc** — đây là điểm mà không competitor nào đang làm ở tầm mid-size city.

## 2.2 Competitive Landscape

| Sản phẩm | Điểm mạnh | Hạn chế | Cơ hội của chúng ta |
|---|---|---|---|
| **Peregrine** ($2.5B) | Data fusion, law enforcement dashboard | Enterprise only, không có resident layer, không có 311 | Full-stack: officer + resident + 311 trong một |
| **SeeClickFix / PublicStuff** | 311 reporting, citizen engagement | Không có AI, không có safety analytics, no Vision | AI-native 311 với Vision + crime correlation |
| **Flock Safety** ($7.5B) | License plate AI, camera network | Hardware-dependent, không có civic access layer | Software-only, 311 + safety unified |
| **Monty Agent** (Track 1 competitors) | 311 chatbot, civic access | Chỉ Track 1, không có predictive analytics, Streamlit UI | Chúng ta có tất cả Track 1 features + Track 4 power |
| **Montgomery Guardian v2.0** ✅ | **Track 1 + Track 4 unified**, Vision AI, SOTA ML, agentic | Hackathon prototype | ALL-IN-ONE civic + safety platform |

## 2.3 Montgomery City Context

- Crime rate: **1.47x** so với trung bình quốc gia (FBI data 2024)
- Violent crime: **1.65x** trung bình quốc gia
- **311 requests tồn đọng cao**: potholes, graffiti, flooding, overgrown grass — pain point được CTO thành phố biết rõ
- Open Data Portal (ArcGIS Hub, revamp 3/2025): Crime Mapping, **311 Service Requests**, 911 Calls, Census, Infrastructure
- Mayor's transparency initiative đang active → platform align thẳng vào chính sách hiện tại

---

# 3. Product Vision & Strategy

## 3.1 Vision Statement

> *"Montgomery Guardian không chỉ bảo vệ người dân — nó kết nối họ với thành phố."*
>
> Nền tảng AI đầu tiên hợp nhất civic access (311, services) và public safety (crime, emergency) trong một interface duy nhất — powered by Vision AI, real-time web intelligence, và predictive analytics.

## 3.2 Target Users

| User Segment | Pain Points | Giải pháp v2.0 |
|---|---|---|
| **Maria – Busy Mom** (30t) | Cần tìm lịch thu rác, báo pothole, biết khu có an toàn không | 311 chatbot + Vision report + Safety score khu vực |
| **Mr. Johnson – Elderly Resident** (65t) | Khó dùng web, hỏi permit, cần multilingual | Voice input + EN/ES support + simple chat UI |
| **City Officials / Police** | Dữ liệu rải rác, thiếu dashboard tổng hợp | Unified dashboard: crime + 311 trend cùng một màn hình |
| **911 Dispatchers** | Thiếu context real-time | AI incident context + 311 history của khu vực |
| **Emergency Managers** | Thiếu predictive planning | Risk forecasting + resource allocation AI |

## 3.3 Judging Criteria Alignment (v2.0 — Max All)

| Tiêu chí | Cách chúng ta đáp ứng | Score |
|---|---|---|
| **Relevance** | Dùng Crime data + **311 data** + 911 data của Montgomery, giải quyết cả Track 1 lẫn Track 4 | **MAX ✓** |
| **Execution Quality** | 3-tầng working prototype, Vision AI live, Next.js UI professional | **MAX ✓** |
| **Originality** | **Vision photo-to-report + multi-agent + SHAP predictions** — không ai làm được combo này | **MAX ✓** |
| **Social Impact** | Giảm crime rate + giảm 311 backlog + phục vụ 200,000 dân đa ngôn ngữ | **MAX ✓** |
| **Commercial Potential** | GovTech $9.7B + Civic Tech $4.2B, scale cho 18,000+ US agencies | **MAX ✓** |

---

# 4. Data Architecture & Sources

## 4.1 Primary Data Sources — City of Montgomery Open Data Portal

| Dataset | Nội dung | Cách sử dụng trong v2.0 |
|---|---|---|
| **Crime Mapping** | Incident-level crime data theo neighborhood, từ 2018 | Training predictive model, hotspot heatmap |
| **🆕 311 Service Requests** | Pothole, Graffiti, Trash, Flooding, Overgrown Grass — theo địa chỉ, status, date | 311 overlay trên dashboard + Vision report auto-submit |
| **Crime Statistics** | Aggregated stats: type, frequency, district | Dashboard metrics, trend charts |
| **911 Calls** | Volume, location, type theo tháng | Emergency pattern analysis |
| **Census Information** | Demographics, population density | Socioeconomic ML features |
| **City Budget** | Public safety + services allocation | ROI calculator |
| **Infrastructure** | Roads, public spaces, lighting | Spatial ML features |
| **Emergency Resources** | Fire stations, hospitals, police precincts | Response time optimization |

> **🆕 311 API Endpoint:** `opendata.montgomeryal.gov/datasets/311-service-requests`
> Fields: Request ID, Service Type, Status, Location (lat/long/address), Creation Date, Last Updated, Description
> Update: Near-realtime → query trực tiếp + cache thông minh

## 4.2 Real-time Data Layer — Bright Data MCP Integration

```
RAPID MODE (Free): search_engine + scrape_as_markdown → 5,000 req/month
Config: npx @brightdata/mcp với API_TOKEN environment variable
PRO MODE: 60+ tools, browser automation, JSON extraction
Compliance: GDPR/CCPA compliant
```

**Các nguồn real-time cần scrape:**
- `montgomeryal.gov/news` — road closures, city announcements, emergency alerts
- `montgomeryal.gov/council` — meeting schedule, policy updates
- Local news (WSFA, Montgomery Advertiser) — crime reports, breaking news
- Social media / Reddit r/Montgomery — community sentiment, unreported incidents
- National Weather Service API — thời tiết ảnh hưởng crime patterns
- Alabama Sex Offender Registry — risk overlay
- Waze/traffic data — congestion, incidents trong emergency zones

## 4.3 Feature Engineering cho ML Models

| Feature Category | Specific Features | Nguồn dữ liệu |
|---|---|---|
| Temporal | Hour, day of week, month, holiday, season | Crime data + calendar |
| Spatial | Neighborhood, distance to precinct, population density | ArcGIS Hub + census |
| Historical Crime | 14-day rolling window per 500m grid cell | Crime Mapping |
| **🆕 311 Correlation** | 311 request density per neighborhood (proxy cho neighborhood health) | 311 dataset |
| Socioeconomic | Income, unemployment, literacy per district | Census + ACS |
| Environmental | Temperature, precipitation, wind speed | NWS via Bright Data |
| Infrastructure | Street lighting density, public transport stops | City infrastructure |
| Real-time Web | News sentiment score, social media alert frequency | Bright Data MCP |

---

# 5. Product Features — Chi tiết 3 Tầng (v2.0)

## 5.1 Tầng 1: Real-time Safety Intelligence Dashboard

*Dành cho: City Officials, Police Command, Emergency Managers*

### 5.1.1 Interactive Unified Map — Crime + 311 Overlay *(🆕 v2.0)*
- **Layer 1 — Crime Heatmap:** Mapbox GL JS, color-coded theo risk level (đỏ/vàng/xanh)
- **Layer 2 — 311 Overlay 🆕:** Markers cho pothole, graffiti, flooding — city staff thấy correlation ngay
- **Layer toggle:** Switch giữa Crime only / 311 only / Unified view
- Animated timeline: xem patterns thay đổi theo giờ/ngày
- Click incident: chi tiết, status, nearby resources
- Compare mode: YoY comparison

### 5.1.2 KPI Dashboard
- Real-time counters: incidents hôm nay, 911 calls 24h, response times, **311 open requests 🆕**
- Trend sparklines: 7/30/90-day trends cho crime categories + **311 categories 🆕**
- District scorecard: ranking neighborhoods theo safety index + **service quality index 🆕**
- Automated weekly PDF report (email cho department heads)

### 5.1.3 Real-time Alert Feed
- Bright Data scrapes local news mỗi 15 phút → AI extracts events
- Cross-reference 911 calls + **311 spikes 🆕** để detect emerging issues
- Severity: Critical / High / Medium / Low
- One-click dispatch recommendation

---

## 5.2 Tầng 2: Multi-Agent Safety Companion *(🆕 v2.0 — fully upgraded)*

*Dành cho: Người dân Montgomery, du khách, doanh nghiệp*

> **🆕 Architecture: Multi-Agent System với Tool-Calling**
>
> Không phải chatbot đơn giản — là **orchestrated multi-agent system**:
> - **Agent 1 — Safety Intel Agent:** Query crime data + predict risk → trả lời safety questions
> - **Agent 2 — 311 Service Agent 🆕:** Query 311 dataset, tìm services, track request status
> - **Agent 3 — Vision Report Agent 🆕:** Nhận ảnh → phân tích → auto-fill incident form
> - **Agent 4 — Web Scraper Agent:** Bright Data MCP → real-time city updates
> - **Orchestrator:** Gemini 1.5 Flash với tool-calling → route user query đến đúng agent
>
> **RAG Knowledge Base:** ChromaDB embeddings of crime data + city policies + 311 categories
> **Embedding:** text-embedding-004 (Google) hoặc all-MiniLM-L6-v2

### 5.2.1 Safety Intel Agent (từ v1.0, upgraded)
- "Khu vực Cleveland Ave có an toàn không vào buổi tối?" → real crime data + trend
- Safety score badge (A/B/C/D/F) cho từng location query
- Safe route suggestion: so sánh 2-3 routes, recommend route an toàn nhất
- Neighborhood weekly safety briefing
- Crime alert subscription theo địa chỉ / ZIP code

### 5.2.2 311 Service Agent *(🆕 v2.0)*
- "Lịch thu rác tuần này ở khu Oak Park?" → query 311 dataset realtime
- "Tình trạng pothole tôi báo 2 tuần trước?" → track request status theo ID
- "Cách nộp complaint về flooding?" → step-by-step guide + direct link
- "Hot issues near me" → top 5 open 311 requests trong 1 mile
- Emergency contacts: 911, non-emergency, fire dept, city services — tất cả trong một

### 5.2.3 Vision Report Agent *(🆕 v2.0 — Killer Feature)*
Đây là feature **độc đáo nhất** của toàn hackathon — không team nào làm được:

**Flow:**
1. User chụp ảnh pothole / graffiti / flooding / suspicious activity
2. Gemini Vision phân tích: loại vấn đề, severity, confidence score
3. Auto-extract location từ GPS metadata hoặc hỏi user xác nhận
4. **Auto-fill 311 report form:** Service Type, Description, Location — pre-populated sẵn
5. User review → One-tap submit → nhận tracking ID
6. AI dự đoán thời gian xử lý dựa trên historical 311 data

**Các loại Vision nhận diện:**
- 🚧 Road hazards: potholes, damaged signs, flooding
- 🎨 Vandalism: graffiti, broken windows
- 🚗 Public safety: suspicious vehicles, abandoned items
- 🌿 City maintenance: overgrown grass, illegal dumping

### 5.2.4 Proactive & Multilingual Features
- Daily safety briefing: push notification tóm tắt tình hình khu vực
- **Multilingual 🆕:** English + Spanish + Vietnamese *(Montgomery có diverse community)*
- **Voice input 🆕:** Speak question → STT → agent processes → TTS response
- Event safety check: "Tui đi Riverfront Park tối nay — an toàn không?"

---

## 5.3 Tầng 3: Predictive Analytics Engine

*Đây là moat — SOTA model mà Peregrine charge $2.5B valuation, không team hackathon nào có*

### 5.3.1 Crime Prediction Model — SOTA Architecture

> **ML Model Stack: Hybrid LSTM + XGBoost + Isolation Forest**
> - **LSTM** (weight 0.2): Temporal sequence — 14-day sliding window, **90.5% accuracy** (Nature Scientific Reports 2025)
> - **XGBoost + SHAP** (weight 0.4): Spatial regression với interpretability — judges thấy được model logic
> - **Isolation Forest** (weight 0.4): Anomaly detection — phát hiện crime spikes bất thường
> - **🆕 311 correlation feature:** Khu vực nhiều 311 backlog → higher risk weight
> - **Ensemble output:** 4-level risk (Critical / High / Medium / Low) per 500m grid cell
> - **Forecast horizon:** 24h, 48h, 7-day

### 5.3.2 Predictive Dashboard Features
- Tomorrow's risk map với confidence interval
- Weekend event predictor: tự động tăng alertness trước concerts, sports games
- Seasonal pattern analyzer: cyclical crime patterns
- Patrol route optimizer: AI-suggested routes trên map
- **What-if simulator:** "Tăng patrol ở khu X 20% → crime giảm bao nhiêu?"
- **🆕 311 → Crime correlation:** "Khu nhiều pothole/graffiti reports → crime risk tăng?" (research-backed)

### 5.3.3 ROI Calculator — Chốt kèo với Judges

Slide cuối demo, show hard numbers:
- Albuquerque PD + Peregrine: **giảm 40% open homicide cases**
- Atlanta PD: **giảm 21% violent crime**
- SeeClickFix cities: **giảm 35% 311 resolution time** với AI routing
- Montgomery estimate: nếu response time giảm 2 phút → X lives saved/year
- 311 efficiency: automated Vision reporting tiết kiệm Y staff-hours/week = $Z/year
- **Total ROI projection:** Crime prevention value + Service efficiency = $X.XM/year cho Montgomery

---

# 6. Technical Architecture (v2.0)

## 6.1 System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      FRONTEND (Vercel)                            │
│         Next.js 15 + TypeScript + Tailwind + Mapbox GL           │
│    Dashboard (dark) │ Chatbot (light) │ Vision Upload (mobile)   │
└─────────────────────┬────────────────────────────────────────────┘
                      │ REST + WebSocket
┌─────────────────────▼────────────────────────────────────────────┐
│                  BACKEND API (Railway)                             │
│               Python FastAPI (async) + Redis pub/sub              │
│                                                                    │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│  │  ML Engine  │  │  Agent Orch. │  │   Bright Data Bridge     │ │
│  │ XGBoost +   │  │ Gemini 1.5F  │  │   (@brightdata/mcp)      │ │
│  │ LSTM + SHAP │  │ Tool-calling │  │   15-min cron scrape     │ │
│  └─────────────┘  └──────┬───────┘  └──────────────────────────┘ │
│                          │ Routes to:                             │
│               ┌──────────┴──────────┐                            │
│        ┌──────▼──────┐   ┌──────────▼──────────┐                │
│        │ Safety Intel│   │  311 Service Agent   │                │
│        │    Agent    │   │  + Vision Agent 🆕   │                │
│        └─────────────┘   └─────────────────────┘                │
└─────────────────────────┬────────────────────────────────────────┘
                          │
┌─────────────────────────▼────────────────────────────────────────┐
│                      DATA LAYER                                    │
│  PostgreSQL + PostGIS   │  ChromaDB (RAG)  │  Redis (real-time)  │
│  ├── Crime Mapping      │  ├── Crime embeds│                      │
│  ├── 311 Requests 🆕   │  ├── City policy │                      │
│  ├── 911 Calls          │  └── 311 catalog │                      │
│  └── Census/Infra       │                  │                      │
│                         │  ArcGIS REST API (live queries)         │
└──────────────────────────────────────────────────────────────────┘
```

## 6.2 Technology Stack

| Layer | Technology | Lý do chọn |
|---|---|---|
| Frontend | Next.js 15 + TypeScript | SSR, App Router, type safety — professional look |
| UI Components | shadcn/ui + Tailwind CSS | Production-ready, rapid build |
| Map | Mapbox GL JS + deck.gl | GPU heatmap, free 50K loads/month |
| Charts | Recharts + D3.js | Flexible, React-native |
| Backend | Python FastAPI (async) | ML ecosystem, auto Swagger docs |
| **🆕 Agent Orchestration** | **Gemini 1.5 Flash + Tool-Calling** | Multi-agent routing, Vision support, free tier |
| **🆕 Vision AI** | **Gemini Vision (gemini-1.5-flash)** | Photo analysis, object detection, free tier |
| Prediction ML | scikit-learn + XGBoost + TensorFlow | SOTA ensemble |
| Explainability | SHAP | Judges hiểu được model → transparent AI |
| RAG | LangChain + ChromaDB | Easy pipeline, local vector store |
| Database | PostgreSQL + PostGIS | Geospatial queries |
| **🆕 311 Integration** | **ArcGIS Feature Service + Pandas** | Live query + cache thông minh |
| Web Scraping | Bright Data MCP (@brightdata/mcp) | 5000 free req/mo, enterprise-grade |
| Real-time | WebSockets + Redis | Live alert feed |
| Auth | Clerk (free tier) | Role: admin / public |
| Deployment | Vercel + Railway | One-click, free tier đủ |
| LLM Monitoring | Langfuse | Track chatbot quality |

## 6.3 Data Flow Architecture

**Ingestion Pipeline:**
1. ArcGIS REST API → fetch crime_mapping, **311_requests**, 911_calls, census (JSON/CSV)
2. GeoPandas: parse shapefiles, project to WGS84
3. Feature engineering: distances, temporal encoding, **311 density per grid cell 🆕**, rolling averages
4. PostgreSQL + PostGIS: spatial indexing
5. ChromaDB: embed crime summaries + **311 service catalog** + city policies

**Vision Report Pipeline 🆕:**
1. User uploads image → FastAPI `/api/vision/analyze`
2. Gemini Vision: classify incident type + severity + description
3. GPS metadata extracted hoặc user confirms location
4. Auto-populate 311 form fields → preview cho user
5. On confirm → POST to 311 API hoặc queue for submission
6. Return tracking ID + estimated resolution time (from 311 historical data)

**Real-time Pipeline (Bright Data):**
1. Cron mỗi 15 phút → `search_engine`: *"Montgomery Alabama crime safety news today"*
2. `scrape_as_markdown` top 5 results → Gemini extracts structured events
3. Redis pub/sub → WebSocket broadcast → dashboard live update
4. ChromaDB update → chatbot aware của events mới nhất

---

# 7. UI/UX Design (v2.0)

## 7.1 Design System
- **Colors:** Deep Navy `#1F4E79` + Safety Red `#C00000` + Alert Amber `#FF8C00` + Success Green `#375623` + **Civic Blue `#0078D4` 🆕** (cho 311 features)
- **Typography:** Inter (UI) + JetBrains Mono (data)
- **Dashboard:** Dark mode default (operations center)
- **Chatbot:** Light mode (approachable, resident-friendly)
- **Responsive:** Desktop-first dashboard, **Mobile-first chatbot + Vision upload 🆕**

## 7.2 Key Screens (v2.0)

### Screen 1: Command Dashboard (Tầng 1)
- Left sidebar: navigation + KPI cards (crime + **311 counters 🆕**)
- Center: Mapbox map với **layer toggle: Crime / 311 / Unified 🆕**
- Right panel: Alert feed hoặc Analytics charts
- Top bar: global filters
- Bottom ribbon: predicted risk zones 24h tới

### Screen 2: Multi-Agent Chatbot (Tầng 2) *(🆕 upgraded)*
- Clean chat UI với agent indicator (Safety / 311 / Vision / Web)
- **Quick actions 🆕:** "Check area safety" | "Report an issue" | "Find services" | "📷 Photo report"
- Embedded mini-map cho location queries
- Safety score badge (A–F) cho safety questions
- **Vision upload button 🆕:** Camera icon → upload → instant analysis → pre-filled form

### Screen 3: Analytics & Predictions (Tầng 3)
- Split view: historical heatmap (left) vs. predicted heatmap (right)
- SHAP feature importance: *"Crime tăng vì: thời tiết nóng + cuối tuần + nhiều 311 requests tồn đọng 🆕"*
- Patrol optimization overlay
- What-if simulation sliders
- **🆕 311 ↔ Crime correlation chart:** scatter plot, r-value, trend line

---

# 8. Implementation Plan — 72-hour Sprint (v2.0)

| Time Block | Focus | Deliverable | Owner |
|---|---|---|---|
| **Day 1 · 0–8h** | Data & Infra Setup | DB schema, ArcGIS ETL cho crime + **311 🆕**, feature engineering | Data Engineer |
| **Day 1 · 8–16h** | ML Model Training | XGBoost + LSTM trained, **311 correlation feature 🆕**, SHAP working | ML Engineer |
| **Day 1 · 16–24h** | Core APIs + Bright Data + Agent Setup | FastAPI, Bright Data MCP, **Gemini tool-calling skeleton 🆕** | Backend Dev |
| **Day 2 · 24–32h** | Dashboard + 311 Map Layer | Mapbox + crime heatmap + **311 overlay toggle 🆕** + KPI cards | Frontend Dev 1 |
| **Day 2 · 32–40h** | Multi-Agent Chatbot + RAG | ChromaDB, LangChain, **agent orchestration: Safety + 311 + Web 🆕** | AI Dev |
| **Day 2 · 40–48h** | **🔥 Vision AI Agent 🆕** | Gemini Vision endpoint, photo → classify → 311 form pre-fill | AI Dev + Backend |
| **Day 3 · 48–56h** | Predictive Dashboard + Full Integration | Prediction map + SHAP + ROI calc, all tầng connected | Full-stack |
| **Day 3 · 56–64h** | Polish: Multilingual + Voice + Mobile | EN/ES/VI support, voice input, mobile-responsive chatbot | Frontend Dev 2 |
| **Day 3 · 64–72h** | Demo prep + Video + Submit | 3-min demo video, slide deck, GitHub README, deploy | All hands |

> ⚠️ **Critical Path v2.0:**
> - **Vision Agent phải xong trong Day 2 Block 3** — đây là killer feature, thiếu là mất điểm Originality
> - 311 API test ngay Day 1 — confirm data format trước khi build feature
> - Agent orchestration skeleton phải setup trong 24h đầu — unblock tất cả AI features
> - **Backup plan Vision:** Nếu Gemini Vision chậm → dùng Google Cloud Vision API làm fallback

---

# 9. Demo & Presentation Strategy (v2.0)

## 9.1 The 3-Minute Demo Script

| Thời điểm | Hành động | Script |
|---|---|---|
| **0:00–0:20** | Hook với dual pain point | *"Montgomery có crime rate 65% cao hơn quốc gia. Và hàng ngàn 311 requests tồn đọng mà cư dân không biết status. Chúng tôi build một platform để giải quyết cả hai — trong 72 giờ."* |
| **0:20–0:45** | Tầng 1: Unified Map | Zoom heatmap → toggle layer: Crime → **311 → Unified 🆕**. *"Đây là real data. Nhìn correlation giữa khu nhiều pothole reports và crime hotspots."* |
| **0:45–1:15** | **🔥 Vision AI Demo 🆕** | Upload ảnh pothole live → Gemini Vision phân tích → form tự điền → *"Từ ảnh đến 311 report — 10 giây. Không cần gõ gì."* → Judges sẽ WOW ngay đây |
| **1:15–1:40** | Tầng 2: Chatbot | Type: *"Is it safe to walk near Dexter Ave at night?"* → AI trả lời với real crime data + safety score. Switch: *"Lịch thu rác khu Oak Park?"* → 311 agent trả lời ngay |
| **1:40–2:10** | Tầng 3: Prediction + SHAP | Prediction map: *"Tomorrow 9pm Downtown — HIGH risk."* SHAP chart: *"Vì: concert + 88°F + 47 open 311 requests trong khu — neighborhood stress indicator 🆕."* |
| **2:10–2:40** | ROI Double Punch | *"Albuquerque giảm 40% homicide. SeeClickFix cities giảm 35% 311 resolution time. Montgomery dùng Guardian: tiết kiệm $X/year crime + $Y/year 311 efficiency."* |
| **2:40–3:00** | Close | *"Hai vấn đề. Một platform. 72 giờ build. Montgomery có thể deploy ngay hôm nay."* |

## 9.2 Slide Deck Structure (8 slides)

1. **Problem:** 2 pain points, real stats Montgomery
2. **Solution:** 3-tầng overview diagram
3. **Live Demo:** Screenshot highlights
4. **🆕 Vision AI:** Photo → 311 report flow (judges sẽ screenshot slide này)
5. **Tech Stack:** Architecture diagram
6. **Data Sources:** Montgomery datasets + Bright Data
7. **Impact & ROI:** Hard numbers, comparable cities
8. **Team + Roadmap:** Scale to 18,000+ US cities

---

# 10. Submission Requirements & Checklist

## 10.1 Required Deliverables

| Deliverable | Nội dung | Status |
|---|---|---|
| Working Prototype | Public URL, 3 tầng hoạt động, Vision upload chạy được | `[ ]` Deploy Vercel |
| Demo Video | 3 phút, highlight Vision AI moment | `[ ]` Record + upload |
| Presentation | 8 slides, ROI numbers rõ ràng | `[ ]` Create deck |
| GitHub Repo | Clean code, README có architecture diagram | `[ ]` Public repo |
| Team Registration | **Deadline: Saturday March 7** | `[ ]` Register NOW |

## 10.2 Bonus Points Checklist (Bright Data)

- `[ ]` Bright Data MCP integrated, gọi thành công ≥ 3 lần trong demo
- `[ ]` Dùng ít nhất 2 tools: `search_engine` + `scrape_as_markdown`
- `[ ]` Mention *"Real-time intelligence powered by Bright Data"* trong demo video
- `[ ]` Bright Data logo trong UI footer + README

## 10.3 README Structure

1. Problem Statement (crime + 311 dual pain point)
2. Solution: 3-tầng + Vision AI overview
3. Architecture diagram (copy từ PRD)
4. Tech Stack với links
5. Data Sources: Montgomery Open Data + Bright Data
6. Setup: 5 steps, chạy trong < 10 phút
7. Demo URL + Video link
8. Team + Future Roadmap

---

# 11. Risk Register & Mitigation (v2.0)

| Risk | Severity | Mitigation |
|---|---|---|
| 311 API rate limiting hoặc format thay đổi | 🔴 HIGH | Download CSV full dataset, hardcode fallback. Test endpoint trong 2h đầu. |
| Gemini Vision timeout trên ảnh lớn | 🔴 HIGH | Resize ảnh xuống < 1MB trước khi gửi. Fallback: Google Cloud Vision API. |
| Gemini API free tier hết quota trong demo | 🔴 HIGH | Backup API key sẵn. GPT-4o-mini làm fallback cho chatbot. |
| Agent orchestration phức tạp, chậm build | 🟡 MEDIUM | Build simple router trước (if/else intent detection), nâng cấp lên Gemini tool-calling sau. |
| LSTM training chậm | 🟡 MEDIUM | XGBoost cho demo, LSTM là nice-to-have. |
| Bright Data MCP connection issues | 🟡 MEDIUM | Mock scraped data với realistic content nếu fail. Document trong README. |
| Mapbox free tier limit | 🟢 LOW | Cache tiles, fallback Leaflet.js + OSM (free, unlimited). |

---

# 12. Success Metrics & Definition of Done

## 12.1 MVP — Must Have

- `[ ]` Crime heatmap + **311 overlay 🆕** trên Mapbox với real Montgomery data
- `[ ]` **Vision AI: upload ảnh → classify → 311 form pre-filled 🆕**
- `[ ]` Chatbot trả lời ≥ 5 loại safety questions + ≥ 3 loại 311 queries
- `[ ]` XGBoost predict crime risk cho ≥ 5 neighborhoods
- `[ ]` Bright Data scrape ≥ 1 nguồn news → alert feed
- `[ ]` Public URL, không cần login cho demo mode

## 12.2 Full Product — Win the $2,500 🏆

- `[ ]` 3 tầng hoạt động mượt mà, không bug trong demo video
- `[ ]` **Multi-agent orchestration: Safety + 311 + Vision + Web agents 🆕**
- `[ ]` **Vision AI: photo → 311 submit flow end-to-end 🆕**
- `[ ]` **311 ↔ Crime correlation visible trong SHAP chart 🆕**
- `[ ]` LSTM + XGBoost ensemble + SHAP explanations
- `[ ]` Multilingual: EN + ES + VI
- `[ ]` Voice input support
- `[ ]` ROI Calculator với hard numbers
- `[ ]` Automated PDF report download
- `[ ]` Mobile-responsive chatbot + Vision upload
- `[ ]` Demo video ≤ 3 phút, Vision AI moment là highlight

---

# Appendix: Key References & Links

| Resource | Link / Notes |
|---|---|
| Montgomery Open Data Portal | opendata.montgomeryal.gov |
| **🆕 311 Service Requests** | opendata.montgomeryal.gov/datasets/311-service-requests |
| Montgomery Crime Mapping | opendata.montgomeryal.gov/datasets/crime-mapping |
| Montgomery 911 Calls | opendata.montgomeryal.gov/datasets/911-calls |
| Bright Data MCP | github.com/brightdata/brightdata-mcp |
| Google AI Studio (Gemini + Vision) | ai.google.dev/gemini-api/docs/ai-studio-quickstart |
| Mapbox GL JS | docs.mapbox.com — 50K loads/month free |
| SOTA: ST-ResNet+LSTM | nature.com/articles/s41598-025-24559-7 — 90.5% accuracy |
| Case Study: Albuquerque | 40% homicide reduction với Peregrine |
| Case Study: SeeClickFix | 35% 311 resolution time reduction với AI |
| Hackathon Deadline | **9/3/2026 lúc 9am Central** |

---

## 📊 v2.0 vs v1.0 — What Changed

| Feature | v1.0 | v2.0 |
|---|---|---|
| Tracks covered | Track 4 only | **Track 4 + Track 1 implicitly** |
| Agent architecture | RAG Chatbot | **Multi-Agent System (Gemini tool-calling)** |
| 311 integration | ❌ | **✅ Full dataset + live query** |
| Vision AI | ❌ | **✅ Photo → 311 report auto-fill** |
| Map layers | Crime heatmap only | **Crime + 311 + Unified toggle** |
| Multilingual | EN + ES | **EN + ES + Vietnamese** |
| Voice input | ❌ | **✅** |
| 311↔Crime correlation | ❌ | **✅ In SHAP + dashboard** |
| Demo "WOW moment" | Prediction map | **Vision upload (0:45–1:15)** |
| Commercial pitch | GovTech $9.7B | **GovTech + CivicTech = $13.9B TAM** |

---

*Montgomery Guardian PRD v2.0 | World Wide Vibes Hackathon 2026 | Confidential*
*"Two problems. One platform. 72 hours."*
