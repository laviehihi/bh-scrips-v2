# Bit Heroes Auto Bot

Bot tự động chơi Bit Heroes — pixel-based, điều khiển qua overlay click.

**Repo:** https://github.com/laviehihi/bh-scrips-v2

---

## 📋 Yêu cầu

- **Trình duyệt:** Chrome, Edge, Firefox, Brave, hoặc bất kỳ trình duyệt nhân Chromium.
- **Extension:** Tampermonkey (bắt buộc).
- **Hệ điều hành khuyến nghị:** macOS (thu nhỏ cửa sổ game hết cỡ để tọa độ chính xác).

---

## 🚀 Cài đặt

### Bước 1: Cài Tampermonkey

1. Mở trình duyệt (Chrome khuyến nghị).
2. Truy cập [Chrome Web Store - Tampermonkey](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo).
3. Nhấn **Thêm vào Chrome**.
4. Nhấn **Thêm tiện ích** khi popup hiện ra.
5. **Biểu tượng Tampermonkey** sẽ xuất hiện ở góc phải trên.

> **Firefox:** Cài từ [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/).
>
> **Edge:** Cài từ [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd).

---

### Bước 2: Bật quyền chạy User Scripts

Tùy phiên bản trình duyệt, cần bật **1 trong 2**:

#### Cách 1: Bật "Allow User Scripts" (Chrome/Edge 138+)

1. Gõ `chrome://extensions` (hoặc `edge://extensions`) trên thanh địa chỉ.
2. Tìm **Tampermonkey** trong danh sách.
3. Nhấn **Details** (Chi tiết).
4. Kéo xuống, tìm **"Allow User Scripts"**.
5. Gạt sang **ON**.

#### Cách 2: Bật "Developer Mode" (Chrome/Edge cũ hơn)

1. Gõ `chrome://extensions` (hoặc `edge://extensions`).
2. Gạt **Developer mode** sang **ON** ở góc phải trên.

> **Chrome 138+:** Ưu tiên Cách 1. Developer Mode có thể không đủ.

---

### Bước 3: Cài Script

1. Mở link: [Cài Script](https://raw.githubusercontent.com/laviehihi/bh-scrips-v2/main/main.user.js)
2. Tampermonkey sẽ hiện popup xác nhận.
3. Nhấn **Install** (Cài đặt).
4. Xong.

---

## ⚙️ Setup trước khi sử dụng

### Thu nhỏ cửa sổ game

Trước khi setup, **nên thu nhỏ cửa sổ game hết cỡ**.

**Lý do:**
- Canvas size càng nhỏ → tọa độ pixel càng ít bị lệch khi resize.
- Trên macOS, thu nhỏ cửa sổ Chrome giúp canvas size ổn định → tọa độ chính xác.
- Nếu cửa sổ to → canvas size thay đổi → tọa độ setup sai.

**Cách thu nhỏ:**
1. Mở game.
2. Kéo cửa sổ Chrome nhỏ lại (không maximize).
3. Kích thước khuyến nghị: **500 × 337** hoặc nhỏ hơn.
4. **Không thay đổi kích cỡ cửa sổ** sau khi setup xong.

---

## 🎮 Hướng dẫn sử dụng

### ⌨️ Phím tắt (quan trọng)

| Phím                   | Chức năng             |
| ---------------------- | --------------------- |
| **`~`** (hoặc `` ` ``) | Mở/thu nhỏ/ẩn overlay |
| **`+`** hoặc **`=`**   | Tăng speed (1× → 10×) |
| **`-`**                | Giảm speed (10× → 1×) |

> **Lưu ý:** `+`/`-` hoạt động **mọi lúc**, không cần mở overlay. Khi cần chat trong game → bấm `Shift + ~` để passthrough.

---

### 🎯 Cách dùng cơ bản

1. **Vào đúng màn trong game** (PvP, WB, Rerun, Inva...).
2. **Mở overlay** bằng phím `~`.
3. **Chọn template** trong dropdown.
4. **Setup** — bấm `[Setup]` để calibrate các nút.
5. **Bấm `[BẮT ĐẦU]`** để chạy.

---

### 🔧 Setup nút (Calibrate)

**Mục đích:** Dạy bot biết nút cần click ở đâu + màu gì.

**Cách làm:**

1. Bấm `[Setup]` trên overlay.
2. Bot hiện marker (vòng tròn cam) ở giữa màn hình.
3. Kéo marker vào **đúng nút** cần click.
4. Thả chuột → bot tự chụp màu (5 mẫu trong 1s).
5. Nếu màu ổn định → tick xanh → lưu.
6. Bấm `[Tiếp →]` để sang nút tiếp theo.
7. Lặp lại cho tất cả các nút.
8. Bấm `[×]` để thoát setup.

**Lưu ý khi chọn vị trí:**
- Chọn **giữa nút**, màu đồng nhất.
- Tránh chữ, viền, icon, shadow, gradient.
- Tránh vùng có animation (nhấp nháy).

**Sửa nút đã setup:**
- Bấm `[← Trước]` để quay lại nút đó.
- Kéo marker ra chỗ khác → bot tự reset → chụp lại màu mới.

**Xoá nút:**
- Trong setup custom: bấm `[× Xoá]`.

---

### 🎮 Các chế độ Auto

#### Auto Rerun (Phím tắt trong template)

**Mục đích:** Tự động click nút Rerun khi trận xong.

**Setup:** 1 nút — nút Rerun (màu xanh lá).

**Delay khuyến nghị:** 0.3s.

---

#### Auto PvP

**Mục đích:** Tự động đánh PvP.

**Setup:** 4-5 nút:
- `Start` — bắt đầu tìm trận.
- `Chọn đối thủ`.
- `Xác nhận team`.
- `Yes/No (confirm)` — optional, popup xác nhận khi chưa full team.
- `Về thành`.

**Delay khuyến nghị:** 1s.

---

#### Auto TG

**Mục đích:** Tự động đánh TG.

**Setup:** 3-4 nút:
- `Start`.
- `Xác thực team`.
- `Yes/No (confirm)` — optional.
- `Về thành`.

**Delay khuyến nghị:** 1s.

---

#### Auto WB (World Boss)

**Mục đích:** Tự động đánh World Boss (solo + team).

**Setup:** 5 slot + 5 nút:
- `Slot 1-5` — vị trí các slot để đếm số người. Chú ý sẽ lấy maà của nút Invite màu xanh nc biển
- `Start (chủ key)`.
- `Ready (thành viên)` — optional.
- `Yes (confirm)` — optional.
- `Regroup (thắng)`.
- `Regroup (thua)`.

**Chọn số người:** Trên overlay, chọn `SỐ NGƯỜI` = 1-5.

**Cách hoạt động:**
- Đếm số người trong team mỗi 0.3s.
- Khi đủ → click Start.
- Nếu chưa full + có popup → click Yes.
- Trận xong → click Regroup.

**Delay khuyến nghị:** 2s.

---

#### Auto Inva

**Mục đích:** Tự động đánh Inva (bật auto, chạy X giây, ESC).

**Setup:** 5-6 nút:
- `Start`.
- `Xác nhận team`.
- `Yes (confirm)` — optional.
- `Auto trong trận` — nút auto khi auto TẮT. (Lấy màu đỏ của nút auto trong game khi tắt)
- `Yes rời trận` — xác nhận rời trận sau ESC.
- `Về thành`.

**Chọn thời gian chạy:** Trên overlay, chọn `THỜI GIAN CHẠY` = 5s / 10s / 20s / 30s / 60s. Mặc định 10s.

**Cách hoạt động:**
1. Click Start.
2. Click Xác nhận team.
3. Click Yes (nếu có).
4. Vào trận → check nút auto → nếu tắt → click bật.
5. Đếm X giây.
6. Gửi phím ESC (thoát trận).
7. Click Yes rời trận.
8. Click Về thành.
9. Lặp lại.

**Delay khuyến nghị:** 1s.

---

#### Auto Rules (Custom)

**Mục đích:** Tự thêm rules — flex cho mọi tình huống.

**Cách setup:**
1. Chọn template `Rules` trên overlay.
2. Bấm `[Setup]`.
3. Bấm `[+ Thêm]` để tạo rule mới.
4. Kéo marker vào nút cần click → thả → lưu màu.
5. Bấm `[Tiếp →]` để sang rule tiếp.
6. Xoá rule: bấm `[× Xoá]`.

**Sử dụng:** Bấm `[BẮT ĐẦU]` → bot click theo thứ tự rules.

**Delay khuyến nghị:** 1s.

---

### ⚡ Speed Hack

**Mục đích:** Tăng tốc game (animation, cooldown, chuyển màn).

**Cách dùng:**
- Bấm `+` hoặc `=` → tăng speed (+1).
- Bấm `-` → giảm speed (-1).
- Speed hiện tại hiển thị trên overlay.

**Giới hạn:**
- Tối thiểu: 1× (không hack).
- Tối đa: 10×.
- **Khuyến nghị:** Không dùng > 5× (có thể lag).

**Lưu ý:** Speed hack chỉ ảnh hưởng game, không ảnh hưởng bot. Bot vẫn scan mỗi 0.3s real time.

---

### 🎨 Overlay

**3 trạng thái:**
- **Compact:** Hiển thị template + speed + nút mở rộng.
- **Expanded:** Full panel — chọn template, options, Start/Stop, Setup.
- **Hidden:** Ẩn hoàn toàn.

**Chuyển đổi:** Bấm `~` để cycle.

**Auto-scale:** Overlay tự điều chỉnh kích cỡ theo màn hình.

**Di chuyển:** Overlay cố định góc phải trên. Không kéo được.

---

### ⏸ Dừng bot

- Bấm `[DỪNG]` trên overlay expanded.
- Hoặc bấm `Shift + ~` để passthrough → gõ phím bình thường.

**Auto-stop:** Sau 3 phút không click → bot tự tắt.

---

### 🔓 Passthrough

**Mục đích:** Tạm tắt bot để gõ phím bình thường vào game (chat, ...).

**Cách dùng:** Bấm `Shift + ~`.

**Khi bật:**
- Bot không chặn phím `+` `-` `~`.
- Gõ phím bình thường vào game.
- Auto vẫn chạy (nếu đang chạy).

**Tắt passthrough:** Bấm `Shift + ~` lần nữa.

---

## ❓ FAQ

### Tại sao bot không click?

- **Chưa setup:** Bấm `[Setup]` để calibrate nút trước.
- **Màu sai:** Vào setup → kéo lại marker → chụp màu mới.
- **Canvas resize:** Setup lại nếu đổi kích cỡ cửa sổ.
- **Speed quá cao:** Giảm speed xuống.

### Tại sao bot click sai nút?

- **Tọa độ sai:** Setup lại.
- **Canvas size khác:** Không đổi kích cỡ cửa sổ sau khi setup.
- **Màu trùng:** Chọn vị trí có màu đặc trưng hơn.

### Tại sao bot không nhận?

- **Chưa vào đúng màn:** Bot cần user vào màn trước (PvP, WB, ...).
- **Passthrough đang bật:** Bấm `Shift + ~` để tắt.
- **Script lỗi:** F5 lại game 2 lần.


### Setup mất bao lâu?

Mỗi nút ~1s (chụp 5 mẫu × 200ms). Template 5 nút ~10-15s.

### Rules lưu ở đâu?

localStorage của trình duyệt. F5 không mất. Nhưng xoá cache trình duyệt sẽ mất.

---

## 📝 Lưu ý

- **Không đổi kích cỡ cửa sổ** sau khi setup.
- **Không dùng speed quá cao** (> 5×) — có thể lag.
- **Setup khi game đang ở đúng màn** — bot không tự navigate.
- **Backup rules** trước khi xoá cache trình duyệt.

---

## 📜 License

## 📜 Disclaimer

Bot chỉ dùng cho mục đích học tập/cá nhân.

- Không bán, không phân phối.
- Tự chịu trách nhiệm nếu vi phạm ToS của game.
- Tác giả không chịu trách nhiệm.