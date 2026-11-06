# FPT Photobooth — bản mẫu độc lập

Photobooth xử lý ảnh trên thiết bị. Chạy bằng một máy chủ HTTP local (localhost), không mở file trực tiếp nếu muốn dùng camera.

```text
python3 -m http.server 5214 --bind 127.0.0.1
```

Mở http://127.0.0.1:5214 . Chọn khung → chọn ảnh mẫu / ảnh từ máy / bật webcam → đếm ngược → chụp → tải JPEG. Thiết lập khung/tên/đếm ngược được giữ trong trình duyệt; ảnh và khung riêng chỉ giữ tạm trong RAM, không lưu vào localStorage.

- 3 form cố định: dọc 4×6 inch (1200×1800), ngang 6×4 inch (1800×1200), dải 2×6 inch (600×1800, 3 ảnh). JPEG đầu ra có metadata 300 dpi; độ nét vẫn phụ thuộc nguồn hình.
- Import PNG đúng kích thước/vùng ảnh theo form, không kéo méo. Bộ SVG/PNG/guide và manifest trong `templates/FPT-Bo-form-thiet-ke.zip`; hướng dẫn chi tiết trong `templates/HUONG-DAN-THIET-KE.md`.
- Dải dùng webcam chụp 3 lần, mỗi lần có đếm ngược; ảnh nhập từ máy hiện dùng cùng một ảnh cho 3 ô. Nút chụp cố định, thiết lập cuộn riêng.
- Tải JPEG hoặc mở hộp thoại In / Lưu PDF. Dải có thể xếp 2 bản trên tờ 4×6 inch; chọn 1–6 bản và xem số tờ trước khi in. Không tự in khi vừa chụp hoặc ghi là in thành công; chưa thử máy in thật.
- Camera chỉ bật bằng nút; dừng khi chụp xong, đổi nguồn, ẩn hoặc rời trang. Camera lỗi/chưa có quyền có thông báo. Mô phỏng không tự mở camera. Không ghi âm.
- Khi cùng nguồn camera nhận cùng deviceId và trình duyệt hỗ trợ Web Locks, chặn dùng đồng thời giữa các cửa sổ cùng origin. Bản local này khác origin với Hub, không thể khóa nguồn camera đang dùng trên Hub; cần tự tắt nguồn khác hoặc chọn camera riêng.
- File ảnh tối đa 12 MB/24 triệu pixel, JPG/PNG/WebP. Khung yêu cầu PNG có vùng giữa trong suốt. JPEG xuất là ảnh ghép, không phải ảnh gốc RAW/JPEG của máy ảnh.
- Khi có máy ảnh: máy tính/trình duyệt cần nhận video input qua USB streaming, phần mềm hãng hoặc bộ thu HDMI–USB tương thích. Chưa thử mẫu máy ảnh thật, chưa điều khiển màn trập/tether/flash/in trực tiếp không qua hộp thoại/chia ảnh QR. Có bố cục in/PDF trình duyệt nhưng chưa thử máy in thật. Bản mẫu không chứng minh cắm bất kỳ máy ảnh nào đều chạy.
- Tài liệu: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/enumerateDevices và https://support.d-imaging.sony.co.jp/app/webcam/en/instruction/ .

## Chọn kết nối khi dùng DSLR hoặc mirrorless

| Cách nối | Lấy nét và chụp | Cách dùng với demo |
| --- | --- | --- |
| USB streaming / webcam hoặc HDMI–USB | Máy ảnh lấy nét. Khi nguồn video báo hỗ trợ, Photobooth có thể yêu cầu chế độ AF liên tục hoặc AF một lần. | Chọn Camera / máy ảnh, tìm lại thiết bị và bật nguồn. Photobooth chụp khung hình từ video. |
| Tether USB | Phần mềm hãng điều khiển nét và màn trập tùy mẫu máy. | Dùng Tether JPEG để tự nhận ảnh mới. Có thể chọn Ảnh từ máy để nhập thủ công. |
| Tether Wi-Fi | Cần mẫu máy và phần mềm hãng hỗ trợ chụp từ xa qua Wi-Fi. | Dùng cùng luồng Tether JPEG. |

Mở demo bằng Chrome hoặc Edge trên Mac hoặc Windows. Trên Mac, chạy `python3 -m http.server 5214 --bind 127.0.0.1` từ thư mục demo. Trên Windows, chạy `py -3 -m http.server 5214 --bind 127.0.0.1` từ thư mục demo khi đã cài Python 3. Mở http://127.0.0.1:5214/ trên chính máy chạy lệnh.

1. Kết nối máy ảnh trong phần mềm hãng. Đặt thư mục lưu JPEG riêng trên máy, với tên file mới cho từng ảnh.
2. Chọn **Tether JPEG → Chọn thư mục JPEG → Bắt đầu nhận ảnh**. Khi demo báo đang chờ, bấm máy hoặc nút chụp của phần mềm hãng.
3. Khung đơn nhận một ảnh mới. Khung dải nhận ba ảnh mới theo thứ tự. Mỗi ảnh có tối đa 60 giây để chuyển về, giới hạn 32 MB và 60 megapixel. Có thể hủy lượt chờ. Ảnh cũ được bỏ qua.
4. Xem ảnh đã ghép, tải JPEG hoặc mở hộp thoại in.

Để nối nút Chụp trong Photobooth với màn trập và nhận JPEG tự động, cần xác định mẫu máy, hệ điều hành và khả năng phần mềm hãng trước khi chọn tích hợp cục bộ. Thử trên thiết bị thật với live view, lấy nét, bấm máy và chuyển ảnh trước khi dùng tại booth.

