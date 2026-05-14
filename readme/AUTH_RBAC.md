# Kiến trúc Authentication & Authorization (RBAC)

Tài liệu này mô tả chi tiết cơ chế Xác thực (Authentication) và Phân quyền (Authorization) đang được áp dụng trong hệ thống Trading Journal. Hệ thống sử dụng kiến trúc Microservices kết hợp với Cổng API Gateway và Redis Cache để tối ưu hóa hiệu suất phân quyền động (Dynamic RBAC).

---

## 1. Authentication (Xác thực người dùng)

Quá trình xác thực nhằm xác minh danh tính của người dùng khi truy cập hệ thống.

### Công nghệ sử dụng:
- **OAuth2 / OIDC**: Xác thực qua Google (Cấp phát JWT Token).
- **Spring Security**: Bảo vệ toàn bộ các Microservices.

### Luồng hoạt động:
1. **Frontend**: Người dùng đăng nhập qua Google, nhận lại `JWT Token` (Bearer Token).
2. **API Gateway**: 
   - Đóng vai trò là chốt chặn đầu tiên. Mọi Request từ Frontend phải mang theo JWT Token.
   - Gateway sử dụng cấu hình `spring.security.oauth2.resourceserver.jwt.issuer-uri` để xác thực chữ ký (Signature) của JWT với Google.
   - Nếu Token hợp lệ, Request được phép đi tiếp; nếu không, trả về `401 Unauthorized`.
3. **Các Services (User Service / Server Java)**:
   - Đều được cấu hình Spring Security để nhận diện JWT.
   - Sử dụng `CustomJwtAuthenticationConverter` để trích xuất thông tin quan trọng từ Token (VD: `email`, `name`, `avatar`).
   - Nếu là lần đăng nhập đầu tiên, `user-service` sẽ tự động lưu thông tin user vào MongoDB và gán vào nhóm mặc định (`Default User`).

---

## 2. Authorization (Phân quyền - Dynamic RBAC)

Hệ thống áp dụng mô hình **RBAC (Role-Based Access Control)** kết hợp với lưu trữ trên **Redis** để kiểm tra quyền hạn siêu tốc ở tầng Gateway, ngăn chặn ngay các truy cập trái phép trước khi chúng chạm tới các Services.

### 2.1 Cấu trúc Dữ liệu RBAC (MongoDB)
Cấu trúc phân quyền đi từ lớn đến nhỏ như sau:
- **User (Người dùng)**: Liên kết với nhiều `Groups`.
- **Group (Nhóm)**: Liên kết với nhiều `Roles` (Vai trò).
- **Role (Vai trò)**: Liên kết với nhiều `Permissions`.
- **Permission (Quyền)**: Bao gồm `Menus` (Quyền giao diện) và `ApiLines` (Quyền gọi API).
- **ApiLine**: Quy định chính xác Đường dẫn API (ví dụ: `/api/v1/admin/users/**`) và Phương thức (ví dụ: `GET`, `POST`).

### 2.2 Luồng Đồng bộ Dữ liệu lên Redis Cache
Để tránh việc Gateway phải liên tục gọi vào Database làm chậm hệ thống, toàn bộ cây phân quyền được **Cache lên Redis**:
- **CacheWarmupService**: Khởi chạy khi `user-service` khởi động, đọc toàn bộ Groups, Roles, ApiLines từ MongoDB và lưu vào Redis.
- Khi có bất kỳ thay đổi nào từ Admin (Cập nhật User, Sửa Role, Sửa Group), `user-service` sẽ ngay lập tức xóa và cập nhật lại dữ liệu tương ứng trên Redis.

**Cấu trúc Key trên Redis:**
- `cache:user_groups:<email>` -> Chứa danh sách Group IDs.
- `cache:group_roles:<group_id>` -> Chứa danh sách Role IDs.
- `cache:role_permissions:<role_id>` -> Chứa danh sách ApiLines (dạng JSON).

### 2.3 Luồng Kiểm tra Quyền tại API Gateway
Quá trình Authorization thực tế diễn ra tại `DynamicAuthorizationFilter` của Cổng API Gateway:

1. Request mang JWT Token đi qua Gateway.
2. Gateway trích xuất `email` từ JWT.
3. **Kiểm tra Super Admin Bypass**:
   - Nếu `email` nằm trong biến môi trường `APP_SECURITY_SUPER_ADMINS` (ví dụ: `phamhuynhkhanh.secure@gmail.com`), Request được **cho phép đi qua ngay lập tức** (Bypass mọi quyền hạn).
4. **Kiểm tra Quyền Động (Dynamic Check)**:
   - Gateway truy vấn Redis để lấy danh sách Group của `email`.
   - Tiếp tục truy vấn Redis lấy Role -> lấy danh sách các ApiLines mà người dùng này có quyền.
   - So khớp Đường dẫn (Path) và Phương thức (Method) của Request hiện tại với danh sách ApiLines (sử dụng `AntPathMatcher` có hỗ trợ dấu `/**` và tự động xử lý dấu gạch chéo `/` ở cuối URL).
   - Nếu Match: Cho phép Request đi tới Service (`user-service` hoặc `server-java`).
   - Nếu Không Match: Trả về lỗi `403 Forbidden` ngay tại Gateway và ghi log `Access Denied`.

### 2.4 Cấp quyền cho Menu (Frontend)
- Frontend sẽ gọi API `/api/v1/users/me` để lấy danh sách `Menus` và `Permissions` dạng Text.
- Dựa vào danh sách Menu trả về, Frontend sẽ tự động ẩn/hiện các nút bấm hoặc Menu chức năng trên UI tương ứng với quyền của người dùng đó.

---

## 3. Các trường hợp lỗi thường gặp và Cách xử lý

- **Lỗi 401 Unauthorized**: JWT Token hết hạn, không hợp lệ, hoặc Frontend chưa đính kèm Bearer Token vào Header.
  - *Xử lý*: Đăng nhập lại trên UI để lấy Token mới.
- **Lỗi 403 Forbidden**: Người dùng không có quyền truy cập API. Có thể do quên cấp quyền, hoặc cấu hình `ApiLine` chưa chính xác (thiếu dấu `/**`).
  - *Xử lý*: Đăng nhập bằng tài khoản Super Admin, vào mục Admin -> Roles để bổ sung `ApiLine` tương ứng cho chức năng bị lỗi.
- **Lỗi 500 khi check quyền (Rất hiếm)**: API Gateway mất kết nối với Redis.
  - *Xử lý*: Đảm bảo container `trading-journal-redis` đang chạy khỏe mạnh và cấu hình `spring.data.redis.host` trên Gateway đang trỏ đúng.

---
*Tài liệu được cập nhật dựa trên kiến trúc hệ thống hiện hành.*
