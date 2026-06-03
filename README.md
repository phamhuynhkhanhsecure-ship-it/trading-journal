# 📈 Trading Journal

A production-grade, full-stack **microservices** application for tracking, analyzing, and improving trading performance — powered by **AI insights** via Google Gemini.

Built with **Spring Boot 3**, **React 19**, **MongoDB**, **Redis**, **Kafka**, and **Docker**.

<!-- 📸 THAY ẢNH HERO TẠI ĐÂY: Chèn đường dẫn ảnh Dashboard tổng quan đẹp nhất của bạn -->
<p align="center">
  <img src="https://github.com/user-attachments/assets/0038e1dc-cfe2-4108-90d3-085c54b325e3" width="100%">
</p>

---

## 📋 Table of Contents

- [📸 UI Showcase](#-ui-showcase)
- [🤖 AI-Powered Capabilities](#-ai-powered-capabilities)
- [Architecture Overview](#-architecture-overview)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Microservices Detail](#-microservices-detail)
  - [Client (Frontend)](#1-client---frontend)
  - [Server Java (Trading Service)](#2-server-java---main-trading-service)
  - [User Service](#3-user-service)
  - [API Gateway](#4-api-gateway)
  - [Discovery Server (Eureka)](#5-discovery-server-eureka)
  - [Config Server](#6-config-server)
- [Key Features](#-key-features)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
  - [Environment Setup](#1-environment-setup)
  - [Run with Docker Compose](#2-run-with-docker-compose-recommended)
  - [Run Locally (Development)](#3-run-locally-development)
- [API Reference](#-api-reference)
- [Port Mapping](#-port-mapping)
- [Environment Variables](#-environment-variables)
- [Deployment](#-deployment)
- [Contributing](#-contributing)

---

## 📸 UI Showcase

<!-- 📸 THAY ẢNH SHOWCASE TẠI ĐÂY: Điền đường dẫn các ảnh vào thẻ src tương ứng -->
| Trading Dashboard (Recharts) | AI Trading Coach (Gemini) |
|:---:|:---:|
| <img src="https://github.com/user-attachments/assets/684a45e8-3e88-4e1c-a75a-b53a85009ef4" alt="Trading Dashboard Overview" width="400"/> | <img src="https://github.com/user-attachments/assets/8e2c0935-0bab-41ee-b61d-bcf79fda0b59" width="400"/> |
| **Trade Entry Calculator** | **Performance Heatmap** |
| <img src="https://github.com/user-attachments/assets/be9f3058-9df0-4ffd-b001-a739d3d5a3ad" width="400"/> | <img src="https://github.com/user-attachments/assets/5ba94ff1-bc45-44d0-bd62-bf9c78996c56" width="400"/> |

---

## 🤖 AI-Powered Capabilities

This project deeply integrates with **Google Gemini AI** to provide an intelligent edge for traders:

- 🧠 **AI Trading Coach**: Analyzes your last 100 trades to calculate win rate, identify strengths/weaknesses, and provide personalized, actionable trading advice.
- 💬 **Context-Aware AI Chat**: A conversational assistant that understands your trading history and current portfolio. Supports multiple languages (Tiếng Việt, English, 中文).
- 👁 **AI Vision for Charts**: Upload a screenshot of your TradingView chart, and the AI will automatically extract key data points (Instrument, Side, Entry Price, Stop Loss, Take Profit) to auto-fill your trade journal.

---

## 🏗 Architecture Overview

```
                                    ┌─────────────────┐
                                    │   Client (React) │
                                    │     :5173/80     │
                                    └────────┬────────┘
                                             │
                                    ┌────────▼────────┐
                                    │   API Gateway    │
                                    │   (Spring Cloud) │
                                    │     :8000        │
                                    │ ┌──────────────┐ │
                                    │ │ RBAC Filter  │ │
                                    │ │ Circuit Break│ │
                                    │ │ Rate Limit   │ │
                                    │ └──────────────┘ │
                                    └──┬──────────┬───┘
                           ┌───────────┘          └───────────┐
                  ┌────────▼────────┐            ┌────────────▼────────┐
                  │  User Service   │            │  Trading Service    │
                  │    :8081        │            │  :8080 / :8082 (x2) │
                  │ ┌─────────────┐ │            │ ┌─────────────────┐ │
                  │ │ Users/RBAC  │ │◄──Feign───►│ │ Trades/AI/      │ │
                  │ │ Groups/Roles│ │            │ │ Analytics/      │ │
                  │ │ Billing     │ │            │ │ Journal/Export  │ │
                  │ └─────────────┘ │            │ └─────────────────┘ │
                  └───┬─────┬──────┘            └──┬─────┬────────────┘
                      │     │                      │     │
          ┌───────────▼─┐ ┌─▼───────────┐  ┌──────▼─┐ ┌─▼───────────┐
          │  MongoDB    │ │   Redis     │  │ Kafka  │ │ Google APIs │
          │  (Atlas)    │ │   :6379     │  │ :9092  │ │ Drive/Gemini│
          └─────────────┘ └─────────────┘  └────────┘ └─────────────┘

              ┌─────────────────┐    ┌──────────────────┐
              │ Discovery Server│    │  Config Server    │
              │ (Eureka) :8761  │    │  (Native) :8888   │
              └─────────────────┘    └──────────────────┘

              ┌─────────────────┐
              │     Zipkin      │
              │     :9411       │
              └─────────────────┘
```

---

## 🛠 Tech Stack

### Backend
| Technology | Version | Purpose |
|:-----------|:--------|:--------|
| **Java** | 17 | Runtime |
| **Spring Boot** | 3.3.0 | Application framework |
| **Spring Cloud** | 2023.0.2 | Microservices infrastructure |
| **Spring Cloud Gateway** | — | API routing, CORS, rate limiting |
| **Netflix Eureka** | — | Service discovery & registration |
| **Spring Cloud Config** | — | Centralized configuration |
| **Spring Security + OAuth2** | — | Authentication & authorization |
| **Spring Data MongoDB** | — | Database access |
| **Spring Data Redis** | — | Caching & RBAC storage |
| **Spring Kafka** | — | Event-driven messaging |
| **OpenFeign** | — | Inter-service communication |
| **Resilience4j** | — | Circuit breaker & retry |
| **MapStruct** | 1.5.5 | DTO mapping |
| **Lombok** | 1.18.38 | Boilerplate reduction |
| **Apache POI** | 5.2.5 | Excel export |
| **SpringDoc OpenAPI** | 2.5.0 | Swagger/API documentation |
| **Micrometer + Zipkin** | — | Distributed tracing |

### Frontend
| Technology | Version | Purpose |
|:-----------|:--------|:--------|
| **React** | 19.2.4 | UI framework |
| **TypeScript** | 5.9.3 | Type safety |
| **Vite** | 8.0.1 | Build tool & dev server |
| **React Router** | 7.13.2 | Client-side routing |
| **Recharts** | 3.8.1 | Charts & analytics visualization |
| **i18next** | 26.0.4 | Internationalization (EN/VI) |
| **@react-oauth/google** | 0.13.5 | Google OAuth login |
| **date-fns** | 4.1.0 | Date utilities |

### Infrastructure
| Technology | Version | Purpose |
|:-----------|:--------|:--------|
| **MongoDB Atlas** | — | Primary database (cloud) |
| **Redis** | 7.2 | Caching & RBAC permissions store |
| **Apache Kafka** | 7.5.0 (Confluent) | Event streaming |
| **Zookeeper** | 7.5.0 (Confluent) | Kafka coordination |
| **Zipkin** | — | Distributed tracing UI |
| **Docker & Docker Compose** | — | Containerization & orchestration |
| **Nginx** | Alpine | Frontend static file serving |

---

## 📁 Project Structure

```
trading-journal/
├── client/                    # React frontend (Vite + TypeScript)
│   ├── src/
│   │   ├── components/        # UI components (15 modules)
│   │   │   ├── AIChatWidget/  #   AI chatbot floating widget
│   │   │   ├── AdminRoute/    #   Admin route guard
│   │   │   ├── Analytics/     #   Analytics dashboard & charts
│   │   │   ├── Calculator/    #   Trading calculator
│   │   │   ├── Calendar/      #   Calendar view of trades
│   │   │   ├── Can/           #   Permission-based rendering (RBAC)
│   │   │   ├── FilterBar/     #   Trade filtering UI
│   │   │   ├── Gallery/       #   Image gallery (trade screenshots)
│   │   │   ├── Journal/       #   Daily journal entries
│   │   │   ├── Layout/        #   Main layout & sidebar
│   │   │   ├── Login/         #   Google OAuth login
│   │   │   ├── Playbook/      #   Trading playbook management
│   │   │   ├── Rules/         #   Trading rules management
│   │   │   ├── Tags/          #   Tag management
│   │   │   └── TradeForm/     #   Trade entry/edit form
│   │   ├── pages/
│   │   │   ├── Admin/         #   Admin user management
│   │   │   └── Pricing/       #   Pricing & billing page
│   │   ├── context/           # React contexts (Auth, Theme, Settings)
│   │   ├── services/          # API service layer
│   │   ├── hooks/             # Custom React hooks
│   │   ├── types/             # TypeScript type definitions
│   │   ├── utils/             # Utility functions
│   │   └── locales/           # i18n translations (en, vi)
│   ├── Dockerfile
│   └── package.json
│
├── server-java/               # Main Trading Service (Spring Boot)
│   ├── src/main/java/com/conarum/tradingjournal/
│   │   ├── config/            # Security, Kafka, Redis, Web configs
│   │   ├── common/            # Shared: DTOs, exceptions, AOP aspects
│   │   ├── domain/
│   │   │   ├── trade/         #   Trade CRUD, image upload (Google Drive)
│   │   │   ├── ai/            #   AI Coach, Chat, Vision (Gemini)
│   │   │   ├── analytics/     #   Comprehensive trading analytics
│   │   │   ├── journal/       #   Daily journal entries
│   │   │   ├── playbook/      #   Trading playbook strategies
│   │   │   ├── rule/          #   Trading rules
│   │   │   ├── tag/           #   Tag management
│   │   │   └── export/        #   Excel export (Apache POI)
│   │   └── integration/       # Feign clients (→ user-service)
│   ├── Dockerfile
│   └── pom.xml
│
├── user-service/              # User & RBAC Service (Spring Boot)
│   ├── src/main/java/com/conarum/userservice/
│   │   ├── config/            # Security, Redis configs
│   │   ├── common/            # Shared exceptions
│   │   ├── domain/
│   │   │   ├── user/          #   User management & sync
│   │   │   ├── group/         #   User groups (RBAC)
│   │   │   ├── role/          #   Roles & permissions (RBAC)
│   │   │   ├── menu/          #   Dynamic UI menus
│   │   │   ├── audit/         #   Audit logging
│   │   │   └── billing/       #   Premium billing
│   │   └── infrastructure/    # Infrastructure layer
│   ├── Dockerfile
│   └── pom.xml
│
├── api-gateway/               # API Gateway (Spring Cloud Gateway)
│   ├── src/main/java/com/conarum/apigateway/
│   │   ├── config/            # Security, CORS config
│   │   ├── filter/            # Dynamic RBAC authorization filter
│   │   └── fallback/          # Circuit breaker fallback controller
│   ├── Dockerfile
│   └── pom.xml
│
├── discovery-server/          # Eureka Service Registry
│   ├── src/main/java/com/conarum/discovery/
│   ├── Dockerfile
│   └── pom.xml
│
├── config-server/             # Spring Cloud Config Server (native)
│   ├── src/main/resources/config/  # Shared config files
│   ├── Dockerfile
│   └── pom.xml
│
├── agent/                     # AI coding agent instructions
│   ├── backend_developer_agent.md
│   ├── java_backend_developer_agent.md
│   └── nodejs_backend_developer_agent.md
│
├── docker-compose.yml         # Full stack orchestration
├── package.json               # Root scripts (build all, deploy, dev)
├── .env.sample                # Environment variables template
└── .gitignore
```

---

## 🔍 Microservices Detail

### 1. Client — Frontend

| | |
|:--|:--|
| **Framework** | React 19 + TypeScript + Vite |
| **Port (dev)** | 3000 |
| **Port (prod)** | 80 (Nginx) → mapped to 5173 |
| **Auth** | Google OAuth2 via `@react-oauth/google` |

**Pages & Routes:**

| Route | Page | Description |
|:------|:-----|:------------|
| `/` | Calendar | Calendar view hiển thị trades theo ngày |
| `/analytics` | Analytics | Dashboard phân tích hiệu suất trading |
| `/journal` | Journal | Nhật ký giao dịch hàng ngày |
| `/playbook` | Playbook | Quản lý chiến lược giao dịch |
| `/rules` | Rules | Quản lý quy tắc trading |
| `/tags` | Tags | Quản lý tags phân loại |
| `/gallery` | Gallery | Thư viện ảnh chụp màn hình giao dịch |
| `/calculator` | Calculator | Máy tính giao dịch (risk, position size) |
| `/admin/users` | User Management | Quản lý người dùng (Admin) |
| `/pricing` | Pricing | Trang đăng ký gói Premium |

**🚀 Highlighted React JS Features:**
- 📊 **Dashboard với Recharts/D3** cho equity curve, win-rate, risk/reward ratio charts.
- ⚡ **Real-time P&L updates** qua WebSocket connection với Spring Boot.
- 🤖 **Giao diện chat với AI Trading Coach** (React UI → BE → Gemini API).
- 🧮 **Trade entry form** với real-time risk calculator.
- 🌡️ **Performance heatmap** theo ngày/tuần/tháng.
- 🔐 **Dynamic RBAC** — ẩn/hiện menu & chức năng tự động theo phân quyền.
- 🌓 **Context API** — Quản lý State toàn cục cho Dark/Light theme & Đa ngôn ngữ (i18n).

---

### 2. Server Java — Main Trading Service

| | |
|:--|:--|
| **Framework** | Spring Boot 3.3.0 |
| **Port** | 8080 (instance 1), 8082 (instance 2) |
| **Database** | MongoDB Atlas |
| **Eureka ID** | `trading-journal-server` |

**Domain Modules:**

| Module | Description |
|:-------|:------------|
| `trade` | CRUD giao dịch, upload ảnh lên Google Drive, gallery |
| `ai` | AI Coach (phân tích 100 trades gần nhất), AI Chat (hỏi đáp), AI Vision (đọc chart từ ảnh) |
| `analytics` | Phân tích theo: ngày trong tuần, instrument, side (Long/Short), tag, playbook, mood, streaks, risk, rolling |
| `journal` | CRUD nhật ký giao dịch theo ngày |
| `playbook` | CRUD chiến lược giao dịch |
| `rule` | CRUD & sắp xếp thứ tự quy tắc trading |
| `tag` | CRUD tags & gợi ý tags |
| `export` | Export dữ liệu ra file Excel (.xlsx) |

**AI Integration (Google Gemini):**
- 🧠 **AI Coach** — Phân tích 100 giao dịch gần nhất, đánh giá win rate, điểm mạnh/yếu, lời khuyên
- 💬 **AI Chat** — Chat với AI có ngữ cảnh trades, hỗ trợ Tiếng Việt/English/中文
- 👁 **AI Vision** — Phân tích ảnh chart (TradingView), trích xuất instrument, entry/SL/TP tự động

**Google Drive Integration:**
- Upload ảnh giao dịch lên Google Drive
- Image proxy endpoint phục vụ ảnh qua API

---

### 3. User Service

| | |
|:--|:--|
| **Framework** | Spring Boot 3.3.0 |
| **Port** | 8081 |
| **Database** | MongoDB Atlas |
| **Eureka ID** | `user-service` |

**Domain Modules:**

| Module | API Endpoint | Description |
|:-------|:-------------|:------------|
| `user` | `/api/v1/users` | Profile người dùng (me) |
| `user` (admin) | `/api/v1/admin/users` | Quản lý người dùng (Admin) |
| `user` (internal) | `/api/internal/users` | Đồng bộ user giữa services |
| `group` | `/api/v1/admin/groups` | Quản lý nhóm người dùng (RBAC) |
| `role` | `/api/v1/admin/roles` | Quản lý vai trò & quyền hạn (RBAC) |
| `menu` | `/api/v1/admin/menus` | Quản lý menu UI động |
| `audit` | `/api/v1/admin/audit-logs` | Ghi log hoạt động admin |
| `billing` | `/api/v1/billing` | Hệ thống thanh toán Premium |

**RBAC Model:**
```
User → Groups → Roles → Permissions (API Lines + Menus)
```
- Permissions được cache trong Redis
- Super Admin có thể bypass tất cả quyền
- Configurable qua env var `APP_SECURITY_SUPER_ADMINS`

---

### 4. API Gateway

| | |
|:--|:--|
| **Framework** | Spring Cloud Gateway (WebFlux) |
| **Port** | 8000 |

**Routing Rules:**

| Route Pattern | Target Service |
|:--------------|:---------------|
| `/api/v1/users/**` | `user-service` |
| `/api/v1/admin/**` | `user-service` |
| `/api/v1/billing/**` | `user-service` |
| `/api/internal/users/**` | `user-service` |
| `/api/**` (catch-all) | `trading-journal-server` |

**Features:**
- 🔀 **Load Balancing** — Eureka-based (`lb://`) với 2 instances của server-java
- 🛡 **Dynamic Authorization Filter** — Kiểm tra RBAC quyền từ Redis theo JWT email
- 🔄 **Circuit Breaker** (Resilience4j) — slidingWindow: 10, failureRate: 50%, waitDuration: 5s
- 🔁 **Retry** — 3 lần retry cho lỗi 502, 503, 504, 500
- 🌐 **CORS** — Cho phép tất cả origins (development)
- 📚 **Swagger UI** — Tổng hợp API docs từ tất cả services tại `/swagger-ui.html`
- ⚡ **Fallback** — Trả response thay thế khi service downstream lỗi

---

### 5. Discovery Server (Eureka)

| | |
|:--|:--|
| **Framework** | Spring Cloud Netflix Eureka Server |
| **Port** | 8761 |
| **Security** | Basic Auth (`EUREKA_USERNAME` / `EUREKA_PASSWORD`) |

Dashboard: `http://localhost:8761`

---

### 6. Config Server

| | |
|:--|:--|
| **Framework** | Spring Cloud Config Server |
| **Port** | 8888 |
| **Profile** | `native` (filesystem, không dùng Git) |
| **Config Location** | `classpath:/config` |

Cung cấp cấu hình chung cho tất cả services:
- Zipkin tracing endpoint
- Eureka client configuration
- Shared application properties

---

## ✨ Key Features

| Feature | Description |
|:--------|:------------|
| 📊 **Trading Analytics** | Phân tích đa chiều: theo ngày, instrument, side, tag, playbook, mood, streaks, risk, rolling |
| 🤖 **AI-Powered Insights** | Google Gemini — Coach, Chat, Vision (đọc chart từ ảnh) |
| 📅 **Calendar View** | Xem tổng quan trades theo lịch |
| 📓 **Daily Journal** | Nhật ký giao dịch hàng ngày |
| 📖 **Playbook** | Quản lý chiến lược giao dịch |
| 📏 **Trading Rules** | Thiết lập & theo dõi quy tắc |
| 🏷 **Tags** | Phân loại giao dịch linh hoạt |
| 🖼 **Gallery** | Thư viện ảnh chart (Google Drive) |
| 🧮 **Calculator** | Tính toán risk & position size |
| 📤 **Excel Export** | Xuất dữ liệu ra file .xlsx |
| 🔐 **Full RBAC** | User → Group → Role → Permission (động, cache Redis) |
| 👤 **Admin Panel** | Quản lý users, groups, roles, menus, audit logs |
| 💳 **Billing** | Hệ thống đăng ký Premium |
| 🌐 **i18n** | Tiếng Việt & English |
| 🌓 **Dark/Light Theme** | Chuyển đổi giao diện |
| 🔍 **Distributed Tracing** | Zipkin — theo dõi request xuyên services |
| 🛡 **Resilience** | Circuit breaker, retry, fallback |
| ⚖ **Load Balancing** | 2 instances server-java, Eureka-based LB |
| 📚 **API Documentation** | Swagger UI tổng hợp tại API Gateway |

---

## 📋 Prerequisites

- **Java** 17+
- **Maven** 3.9+
- **Node.js** 20+
- **npm** 9+
- **Docker** & **Docker Compose** (for containerized deployment)
- **MongoDB Atlas** account (or local MongoDB)
- **Google Cloud Console** project with:
  - OAuth 2.0 Client ID (Desktop App) — for Google Drive
  - OAuth 2.0 Client ID (Web App) — for Google Login
  - Gemini API Key
  - Google Drive API enabled

---

## 🚀 Getting Started

### 1. Environment Setup

```bash
# Clone the repository
git clone https://github.com/phamhuynhkhanhsecure-ship-it/trading-journal.git
cd trading-journal

# Copy environment template
cp .env.sample .env
```

Edit `.env` with your actual values:

```env
# Google OAuth2 (Desktop App — for Drive)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Google OAuth2 (Web App — for Login)
GOOGLE_LOGIN_CLIENT_ID=your_google_login_client_id

# Google Drive
GOOGLE_REFRESH_TOKEN=your_google_refresh_token
GOOGLE_DRIVE_FOLDER_ID=your_google_drive_folder_id

# AI
GEMINI_API_KEY=your_gemini_api_key

# Database
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/trading_journal?retryWrites=true&w=majority

# Eureka Security
EUREKA_USERNAME=your_eureka_username
EUREKA_PASSWORD=your_eureka_password

# Super Admin
APP_SECURITY_SUPER_ADMINS=admin@example.com
```

### 2. Run with Docker Compose (Recommended)

```bash
# Build all Java services
npm run build:java:all

# Start all services
npm run deploy:srvs

# Or equivalently:
docker-compose up -d --build
```

**Startup order (handled automatically):**
1. **Config Server** (:8888) — waits for healthcheck
2. **Discovery Server** (:8761) — waits for Config Server
3. **Redis** (:6379), **Kafka** (:9092), **Zookeeper** (:2181) — infrastructure
4. **User Service** (:8081) — waits for Config + Discovery + Redis + Kafka
5. **Server Java** (:8080, :8082) — 2 instances for load balancing
6. **API Gateway** (:8000) — waits for all services
7. **Client** (:5173) — waits for API Gateway

```bash
# Stop all services
npm run deploy:srvs:down
```

### 3. Run Locally (Development)

#### Backend Services (Java)

```bash
# Build individual services
npm run build:java:config      # Config Server
npm run build:java:discovery   # Discovery Server
npm run build:java:user        # User Service
npm run build:java:server      # Trading Service
npm run build:java:api-gateway # API Gateway

# Or build all at once
npm run build:java:all
```

Then start each service with Maven or java -jar in order:
```bash
# 1. Config Server
cd config-server && mvn spring-boot:run

# 2. Discovery Server
cd discovery-server && mvn spring-boot:run

# 3. User Service
cd user-service && mvn spring-boot:run

# 4. Trading Service
cd server-java && mvn spring-boot:run

# 5. API Gateway
cd api-gateway && mvn spring-boot:run
```

> ⚠️ **Note:** You also need Redis and Kafka running locally. Use Docker for infrastructure:
> ```bash
> docker-compose up -d redis kafka zookeeper zipkin
> ```

#### Frontend

```bash
cd client
npm install
npm run dev
```

The client will be available at `http://localhost:3000`

---

## 📚 API Reference

All APIs are accessible through the API Gateway at `http://localhost:8000`.

### Swagger UI
- **Aggregated Docs**: `http://localhost:8000/swagger-ui.html`
- **Trading Service Docs**: `http://localhost:8080/swagger-ui.html`
- **User Service Docs**: `http://localhost:8081/swagger-ui.html`

### Trading Service APIs

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `GET` | `/api/trades` | Lấy danh sách trades |
| `POST` | `/api/trades` | Tạo trade mới |
| `PUT` | `/api/trades/{id}` | Cập nhật trade |
| `DELETE` | `/api/trades/{id}` | Xóa trade |
| `POST` | `/api/ai/coach` | AI Coach phân tích |
| `POST` | `/api/ai/chat` | AI Chat hỏi đáp |
| `POST` | `/api/ai/vision` | AI Vision đọc chart |
| `GET` | `/api/analytics/overview` | Tổng quan analytics |
| `GET` | `/api/analytics/by-day-of-week` | Phân tích theo thứ |
| `GET` | `/api/analytics/by-instrument` | Phân tích theo cặp tiền/mã |
| `GET` | `/api/analytics/by-side` | Phân tích theo Long/Short |
| `GET` | `/api/analytics/by-tag` | Phân tích theo tag |
| `GET` | `/api/analytics/by-playbook` | Phân tích theo playbook |
| `GET` | `/api/analytics/by-mood` | Phân tích theo tâm trạng |
| `GET` | `/api/analytics/streaks` | Chuỗi thắng/thua |
| `GET` | `/api/analytics/risk` | Phân tích risk |
| `GET` | `/api/analytics/rolling` | Rolling analytics |
| `GET` | `/api/journal` | Lấy journal entries |
| `POST` | `/api/journal` | Tạo journal entry |
| `GET` | `/api/playbooks` | Lấy danh sách playbooks |
| `POST` | `/api/playbooks` | Tạo playbook |
| `GET` | `/api/rules` | Lấy danh sách rules |
| `POST` | `/api/rules` | Tạo rule |
| `GET` | `/api/tags` | Lấy danh sách tags |
| `POST` | `/api/tags` | Tạo tag |

### User Service APIs

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `GET` | `/api/v1/users/me` | Lấy profile user hiện tại |
| `GET` | `/api/v1/admin/users` | Danh sách users (Admin) |
| `PUT` | `/api/v1/admin/users/{id}` | Cập nhật user (Admin) |
| `GET` | `/api/v1/admin/groups` | Danh sách groups |
| `POST` | `/api/v1/admin/groups` | Tạo group mới |
| `GET` | `/api/v1/admin/roles` | Danh sách roles |
| `POST` | `/api/v1/admin/roles` | Tạo role mới |
| `GET` | `/api/v1/admin/menus` | Danh sách menus |
| `POST` | `/api/v1/admin/menus` | Tạo menu mới |
| `GET` | `/api/v1/admin/audit-logs` | Danh sách audit logs |
| `POST` | `/api/v1/billing/purchase-premium` | Mua gói Premium |
| `POST` | `/api/internal/users/sync` | Đồng bộ user (Internal) |

---

## 🔌 Port Mapping

| Service | Port | Description |
|:--------|:-----|:------------|
| **Client** | `5173` | React frontend (mapped from Nginx :80) |
| **API Gateway** | `8000` | Main entry point for all APIs |
| **Server Java (1)** | `8080` | Trading service instance 1 |
| **Server Java (2)** | `8082` | Trading service instance 2 |
| **User Service** | `8081` | User & RBAC service |
| **Config Server** | `8888` | Centralized configuration |
| **Discovery Server** | `8761` | Eureka dashboard |
| **Zipkin** | `9411` | Distributed tracing UI |
| **Redis** | `6379` | Cache & RBAC store |
| **Kafka** | `9092` | Message broker |
| **Zookeeper** | `2181` | Kafka coordination |

---

## 🔑 Environment Variables

| Variable | Description | Required |
|:---------|:------------|:--------:|
| `GOOGLE_CLIENT_ID` | Google OAuth2 Client ID (Desktop App — for Drive API) | ✅ |
| `GOOGLE_CLIENT_SECRET` | Google OAuth2 Client Secret | ✅ |
| `GOOGLE_LOGIN_CLIENT_ID` | Google OAuth2 Client ID (Web App — for frontend login) | ✅ |
| `GOOGLE_REFRESH_TOKEN` | Google Drive refresh token | ✅ |
| `GOOGLE_DRIVE_FOLDER_ID` | Google Drive folder ID for image storage | ✅ |
| `GEMINI_API_KEY` | Google Gemini API key for AI features | ✅ |
| `MONGO_URI` | MongoDB connection string | ✅ |
| `EUREKA_USERNAME` | Eureka basic auth username | ✅ |
| `EUREKA_PASSWORD` | Eureka basic auth password | ✅ |
| `APP_SECURITY_SUPER_ADMINS` | Comma-separated super admin email(s) | ✅ |

> 💡 **Tip:** Copy `.env.sample` to `.env` and fill in your values. Never commit `.env` to git.

---

## 🐳 Deployment

### Docker Compose (Production-like)

```bash
# Build & start all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f api-gateway

# Stop all services
docker-compose down

# Stop & remove volumes
docker-compose down -v
```

### Build Individual Java Services

```bash
npm run build:java:config       # Config Server
npm run build:java:discovery    # Discovery Server
npm run build:java:user         # User Service
npm run build:java:server       # Trading Service
npm run build:java:api-gateway  # API Gateway
npm run build:java:all          # All Java services
```

### Build Client for Production

```bash
cd client
npm run build    # Output → client/dist/
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
