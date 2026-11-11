# Mobile app

## Trạng thái

Thư mục Flutter chưa được khởi tạo vì môi trường hiện tại chưa có Flutter SDK. Không đặt thông tin đăng nhập hoặc khóa API trong mã nguồn.

## Toolchain cần có

- Flutter SDK stable và Dart đi kèm.
- Android SDK, Android Studio hoặc command-line tools để build Android.
- Xcode nếu cần build iOS (chỉ khả dụng trên macOS).

## Khởi tạo

Sau khi cài Flutter, chạy tại thư mục `apps/mobile`:

```powershell
flutter create --project-name quan_ly_cua_hang --platforms=android,ios .
```

Sau đó cấu hình API base URL theo môi trường. Android Emulator thường truy cập máy host qua `10.0.2.2`; API cần bind vào địa chỉ mà thiết bị/emulator truy cập được. Không hard-code URL production vào source.

## Phạm vi mobile giai đoạn đầu

- Đăng nhập và phân quyền.
- Tìm/ quét mã vạch, xem thông tin và tồn kho hàng hóa.
- Tạo hóa đơn bán hàng và xem lịch sử hóa đơn.
- Kiểm kho và ghi nhận chênh lệch có lý do.

Mobile dùng API chung với web; không truy cập MySQL trực tiếp. Hỗ trợ bán hàng offline và đồng bộ dữ liệu chưa nằm trong MVP cho đến khi được xác nhận.
