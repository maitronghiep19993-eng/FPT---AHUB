# Bộ form Photobooth v1

Giữ đúng form để cùng một thiết kế dùng lại được tại các chi nhánh. Chọn form trong ứng dụng trước khi import PNG.

| Form | Kích thước xuất PNG | Khổ thành phẩm tại 300 dpi | Ảnh |
|---|---|---|---|
| portrait | 1200 × 1800 px | 4 × 6 inch = 101,6 × 152,4 mm | 1 |
| landscape | 1800 × 1200 px | 6 × 4 inch = 152,4 × 101,6 mm | 1 |
| strip | 600 × 1800 px | 2 × 6 inch = 50,8 × 152,4 mm | 3 |

Lưu ý tên gọi giấy “10×15 cm” trên thị trường có thể được hiểu khác. Bộ này dùng chuẩn inch chính xác; chọn đúng 4×6 inch trong máy in. Máy in hỗ trợ 100×150 mm chính xác là khổ khác, cần thiết lập/rà lại trước khi sản xuất.

## Các file

- `*-guide.svg`: lớp chỉ dẫn kích thước/vùng ảnh/lề an toàn. Mở trong Illustrator, Figma hoặc công cụ hỗ trợ SVG. Đây là tham chiếu, không phải khung thành phẩm.
- `*-frame.svg`: khung vector có các vùng ảnh đã khoét trong suốt và chữ mẫu để adapt.
- `*-frame.png`: cùng khung thành phẩm dạng PNG trong suốt, import được ngay vào demo để thử.
- `layouts.json`: tọa độ chuẩn, đơn vị pixel, gốc (0,0) góc trên trái.

## Quy trình adapt

1. Mở `*-frame.svg`, giữ nguyên kích thước artboard. Có thể dùng guide làm lớp riêng để căn.
2. Thay logo, màu, hình trang trí và nội dung; giữ đúng vị trí các vùng đặt ảnh. Chữ quan trọng nằm trong đường lề an toàn 36 px (xấp xỉ 3 mm).
3. Không đặt nền trắng hoặc ảnh mẫu vào cửa sổ đặt ảnh. Các cửa sổ này phải trong suốt thật, không phải ô caro vẽ lên ảnh.
4. Tắt/xóa lớp guide, xuất PNG RGBA đúng số pixel, sRGB, nền trong suốt. Không JPG, không crop theo nội dung, không thêm bleed vào kích thước PNG.
5. Trong demo chọn đúng form → Import khung PNG → chụp thử → xem JPEG/PDF. Ứng dụng báo lỗi sai kích thước hoặc cửa sổ thiếu trong suốt; không kéo méo khung để vừa form.
6. Khung import dùng nguyên chữ/logo trong PNG; ô “Nội dung” của demo chỉ áp dụng khung mẫu dựng sẵn.

Lề 36 px là khuyến nghị thiết kế, không bảo đảm mọi máy in giữ nguyên toàn bộ mép. Borderless/overscan và vùng không in tùy máy; thử ít nhất 1 bản thật trước khi chạy hàng loạt.

## Tọa độ vùng ảnh

- Dọc: x=72, y=180, rộng=1056, cao=1400 px.
- Ngang: x=72, y=160, rộng=1656, cao=820 px.
- Dải: 3 vùng cùng x=36, rộng=528, cao=444 px; y lần lượt 132, 612, 1092.

Dải 3 ảnh: webcam chụp 3 lần, mỗi lần có đếm ngược. Ảnh từ máy hiện dùng một ảnh cho cả ba cửa sổ; ảnh mẫu là mô phỏng. Bản JPEG tải về là một dải. Khi in, có thể xếp 2 dải cạnh nhau trên một tờ 4×6 inch rồi cắt giữa.

## Lưu và in

- Tải JPEG: khung đã ghép, kích thước chuẩn, metadata JFIF 300 dpi; đây không phải tăng độ nét nguồn camera thấp lên chất lượng máy ảnh.
- In/PDF: mở hộp thoại hệ thống, chọn máy in hoặc Lưu PDF, giấy 4×6 inch, tỷ lệ 100%, không đầu/chân trang. Khổ dọc/ngang tự chuẩn bị trong bản in, nhưng người vận hành vẫn phải chọn đúng driver/giấy/lề.
- Chưa thử máy in thật, cắt giấy, màu in hoặc máy ảnh thật. Không tự gửi lệnh in khi vừa chụp và không ghi là đã in thành công chỉ vì hộp thoại đã mở.
