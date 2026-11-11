# Đặc tả hệ thống quản lý cửa hàng tạp hóa

> Tài liệu yêu cầu sản phẩm (PRD) cho một hệ thống quản lý bán hàng và vận hành cửa hàng tạp hóa, tham khảo các nhóm chức năng hiển thị trên trang KiotViet được cung cấp. Đây là đặc tả để xây dựng một sản phẩm độc lập, không phải bản sao mã nguồn, giao diện độc quyền hay tài liệu chính thức của KiotViet.

## 1. Mục tiêu

Xây dựng hệ thống giúp cửa hàng quản lý tập trung hàng hóa, tồn kho, mua hàng, bán hàng, khách hàng, nhân viên, thu chi và báo cáo. Dữ liệu phát sinh từ bán hàng, nhập hàng, trả hàng và điều chỉnh kho cần liên kết nhất quán để người quản lý theo dõi hoạt động gần thời gian thực.

### Mục tiêu sử dụng

- Rút ngắn thao tác bán hàng tại quầy, hỗ trợ tìm hàng bằng tên hoặc mã vạch.
- Theo dõi số lượng và giá trị tồn kho, hạn chế thất thoát và sai lệch.
- Quản lý công nợ khách hàng/nhà cung cấp, thu chi và dòng tiền.
- Cung cấp báo cáo vận hành để chủ cửa hàng ra quyết định.
- Kiểm soát quyền truy cập và lưu dấu các thao tác quan trọng.

## 2. Căn cứ và phạm vi xác nhận

Các nhóm sau được quan sát trên menu hoặc dashboard của trang tham khảo: tổng quan; hàng hóa, thiết lập giá và nghiệp vụ kho; nhà cung cấp, nhập hàng, trả hàng nhập và mua dịch vụ; đặt hàng, hóa đơn, trả hàng; vận đơn, giao hàng và đối tác giao hàng; khách hàng, nhóm khách hàng và chăm sóc khách hàng; nhân viên, lịch làm việc, chấm công, lương và hoa hồng; sổ quỹ; báo cáo cuối ngày, bán hàng, đặt hàng, hàng hóa, khách hàng, nhà cung cấp, nhân viên, kênh bán và tài chính; bán online/website; thuế và kế toán; thiết lập cửa hàng, người dùng, chi nhánh, bảo mật, khóa sổ, lịch sử thao tác và dữ liệu.

Dashboard tham khảo có các chỉ số doanh thu/trả hàng, so sánh doanh thu thuần theo kỳ, biểu đồ theo ngày/giờ/thứ, top hàng bán chạy, top khách mua nhiều, hiệu suất nhân viên và hoạt động gần đây.

Chi tiết biểu mẫu, trạng thái, công thức báo cáo, quyền hạn cụ thể, tích hợp và quy tắc kế toán của hệ thống tham khảo chưa được xác minh đầy đủ. Các yêu cầu dưới đây là phạm vi đề xuất cho sản phẩm mới; cần xác nhận với chủ cửa hàng trước khi phát triển.

## 3. Người dùng và quyền hạn

- **Chủ cửa hàng/Quản trị viên:** cấu hình cửa hàng, người dùng, chi nhánh, danh mục, quyền, xem mọi báo cáo và dữ liệu.
- **Quản lý:** theo dõi hoạt động, duyệt nghiệp vụ theo quyền được cấp, xem báo cáo cửa hàng/chi nhánh.
- **Thu ngân/Nhân viên bán hàng:** tạo đơn và hóa đơn, nhận thanh toán, áp dụng ưu đãi trong hạn mức, tra cứu khách hàng.
- **Nhân viên kho:** xem hàng hóa, nhận hàng, kiểm kho, lập phiếu xuất dùng nội bộ/xuất hủy.
- **Nhân viên mua hàng/Kế toán:** quản lý nhà cung cấp, nhập/trả hàng, công nợ, thu chi, đối soát và báo cáo.

Hệ thống phải hỗ trợ vai trò và quyền theo chức năng, chi nhánh, thao tác xem/tạo/sửa/xóa/duyệt. Nhân viên chỉ được thực hiện nghiệp vụ thuộc phạm vi được cấp. Mọi thay đổi quyền cần được ghi nhật ký.

## 4. Yêu cầu chức năng

### 4.1 Đăng nhập và điều hướng

- Đăng nhập/đăng xuất an toàn; hỗ trợ khôi phục mật khẩu.
- Quản lý phiên đăng nhập và tùy chọn duy trì đăng nhập.
- Hiển thị các module theo quyền người dùng.
- Giao diện tiếng Việt, thao tác được trên máy tính bảng và màn hình điện thoại; màn hình bán hàng ưu tiên tốc độ thao tác.

### 4.2 Tổng quan

- Hiển thị doanh thu, số hóa đơn, trả hàng, doanh thu thuần và so sánh với kỳ trước.
- Lọc theo thời gian và chi nhánh; biểu đồ doanh thu theo ngày, giờ hoặc thứ.
- Hiển thị top hàng bán chạy và top khách mua nhiều theo khoảng thời gian/chỉ tiêu.
- Hiển thị hiệu suất nhân viên khi có dữ liệu chấm công/bán hàng.
- Hiển thị hoạt động gần đây, liên kết về chứng từ liên quan và cảnh báo cần xử lý.
- Chỉ hiển thị số liệu người dùng được phép xem.

### 4.3 Hàng hóa và giá

- Tạo, xem, sửa, ngừng kinh doanh hàng hóa; hỗ trợ hàng đơn, hàng có thuộc tính/phiên bản và dịch vụ.
- Lưu mã hàng, mã vạch, tên, nhóm hàng, đơn vị tính, đơn vị quy đổi, giá vốn, giá bán, thuế, ảnh, trạng thái và mức tồn tối thiểu.
- Tìm kiếm/lọc theo mã, tên, mã vạch, nhóm hàng và trạng thái; hỗ trợ nhập/xuất danh mục bằng tệp theo mẫu.
- Quản lý bảng giá và giá theo nhóm khách hàng/kênh/chi nhánh nếu được cấu hình.
- Kiểm tra mã hàng/mã vạch trùng; lưu lịch sử thay đổi giá và thông tin hàng.

### 4.4 Kho hàng

- Theo dõi tồn kho theo hàng hóa và chi nhánh; cập nhật từ chứng từ đã hoàn tất.
- Lập phiếu kiểm kho, ghi nhận số lượng thực tế, chênh lệch, lý do và người xác nhận.
- Lập phiếu xuất dùng nội bộ và phiếu xuất hủy; yêu cầu lý do, ngày, hàng hóa, số lượng và người thực hiện.
- Cảnh báo hàng dưới định mức hoặc hết hàng; tra cứu lịch sử nhập/xuất/điều chỉnh.
- Có cấu hình cho phép hoặc chặn tồn kho âm; mọi điều chỉnh tồn phải tạo chứng từ và được phân quyền.

### 4.5 Nhà cung cấp và mua hàng

- Quản lý hồ sơ nhà cung cấp, thông tin liên hệ, mã số thuế, công nợ và lịch sử giao dịch.
- Tạo phiếu nhập/mua hàng gồm nhà cung cấp, hàng hóa, số lượng, đơn giá, chiết khấu, thuế, chi phí phát sinh, thanh toán và ghi chú.
- Khi xác nhận nhập hàng, tăng tồn và ghi nhận giá vốn/công nợ theo cấu hình.
- Theo dõi trạng thái chứng từ và lịch sử thanh toán.
- Lập phiếu trả hàng nhập, liên kết phiếu nhập gốc khi có thể; cập nhật tồn, công nợ và tiền hoàn tương ứng.
- Ghi nhận khoản mua dịch vụ/chi phí không làm tăng tồn kho.
- Có thể tiếp nhận hóa đơn đầu vào điện tử; tích hợp ngoài phạm vi lõi, cần xác nhận nhà cung cấp và quy định áp dụng.

### 4.6 Bán hàng, đặt hàng và hóa đơn

- Màn hình bán hàng tại quầy hỗ trợ quét mã vạch, tìm hàng, chọn số lượng, sửa số lượng, áp dụng chiết khấu và thêm khách hàng.
- Tính tiền theo giá hiện hành, thuế, chiết khấu và quy tắc làm tròn được cấu hình; hiển thị tổng tiền và tiền khách cần trả.
- Hỗ trợ nhiều phương thức thanh toán theo cấu hình; ghi nhận tiền khách trả, tiền thừa và phần còn nợ.
- Hoàn tất bán hàng tạo hóa đơn, giảm tồn và cập nhật doanh thu/công nợ/sổ quỹ phù hợp.
- Cho phép lưu đơn đặt hàng chưa hoàn tất; theo dõi trạng thái và chuyển đơn thành hóa đơn khi bán.
- Tra cứu, in hoặc gửi hóa đơn; hỗ trợ hủy/điều chỉnh theo quyền và quy định lưu vết.
- Lập phiếu trả hàng gắn với hóa đơn gốc khi có thể; chọn hàng/số lượng/lý do, tính tiền hoàn, cập nhật tồn và công nợ/sổ quỹ.
- Chặn hoặc cảnh báo các thao tác không hợp lệ như trả vượt số lượng đã bán.

### 4.7 Giao hàng và kênh bán

- Theo dõi đơn cần giao, địa chỉ, người nhận, phí giao, trạng thái và mã vận đơn.
- Quản lý đối tác giao hàng và cập nhật trạng thái giao nhận; việc kết nối đơn vị vận chuyển cần cấu hình tích hợp riêng.
- Phân biệt kênh phát sinh đơn (tại quầy, online hoặc kênh khác) để báo cáo doanh thu.
- Website/cửa hàng trực tuyến và đồng bộ kênh bên thứ ba là tính năng mở rộng; cần xác định nền tảng, đồng bộ tồn/giá và cách xử lý xung đột.

### 4.8 Khách hàng và chăm sóc khách hàng

- Quản lý hồ sơ khách hàng, thông tin liên hệ, nhóm, lịch sử mua/trả, tổng chi tiêu, công nợ và ghi chú.
- Tạo nhóm khách hàng và lọc theo hành vi/giá trị mua hàng.
- Hỗ trợ tích điểm, đổi điểm, hạng thành viên và khuyến mại theo quy tắc cấu hình; lưu lịch sử điểm.
- Hỗ trợ gửi thông tin chăm sóc khách hàng qua kênh tích hợp được chọn; tuân thủ sự đồng ý nhận tin và giới hạn gửi.
- Có thể mở rộng cửa hàng online trên Zalo hoặc kênh tương tự sau khi xác nhận điều kiện tích hợp.

### 4.9 Nhân viên

- Quản lý hồ sơ nhân viên, trạng thái làm việc, tài khoản truy cập, vai trò và chi nhánh.
- Lập lịch làm việc; ghi nhận chấm công theo ca/ngày và cho phép người có quyền điều chỉnh có lý do.
- Tính bảng lương theo cấu hình cửa hàng; hỗ trợ phụ cấp/khấu trừ và trạng thái chốt.
- Tính hoa hồng theo doanh thu hoặc quy tắc được cấu hình; báo cáo cần truy vết được về hóa đơn nguồn.
- Bảo vệ dữ liệu lương và thông tin cá nhân bằng quyền truy cập phù hợp.

### 4.10 Sổ quỹ, thu chi và công nợ

- Ghi nhận phiếu thu/chi, khoản thu/chi, ngày, đối tượng, phương thức, tài khoản, số tiền và ghi chú.
- Quản lý tiền mặt, tài khoản ngân hàng/ví điện tử theo cấu hình.
- Ghi nhận thanh toán từ hóa đơn, phiếu nhập, trả hàng và thanh toán công nợ; tránh ghi trùng giao dịch.
- Tra cứu số dư và lịch sử theo thời gian, tài khoản, loại giao dịch, chi nhánh và người tạo.
- Đối chiếu được số tiền đầu kỳ + phát sinh thu - phát sinh chi = số dư cuối kỳ.

### 4.11 Báo cáo

- Báo cáo cuối ngày: tổng hợp giao dịch, doanh thu, trả hàng, thu/chi và số liệu cần đối soát.
- Báo cáo bán hàng, đặt hàng, hàng hóa/tồn kho, khách hàng, nhà cung cấp, nhân viên, kênh bán và tài chính.
- Lọc theo thời gian, chi nhánh, người dùng, trạng thái, hàng hóa hoặc nhóm phù hợp với từng báo cáo.
- Cho phép xem chi tiết từ số tổng hợp về chứng từ nguồn; xuất tệp khi người dùng có quyền.
- Báo cáo phải thống nhất với các chứng từ đã ghi nhận; quy tắc doanh thu thuần, giá vốn, lợi nhuận và kỳ so sánh cần được chốt trước khi triển khai.

### 4.12 Thuế, hóa đơn điện tử và kế toán

- Lưu thông tin thuế cần thiết trên hàng hóa, khách hàng, nhà cung cấp và chứng từ.
- Hỗ trợ xuất hóa đơn điện tử/kết nối hệ thống kế toán nếu được lựa chọn.
- Lưu trạng thái đồng bộ, mã phản hồi và lỗi để đối soát.
- Đây là nhóm chức năng phụ thuộc quy định pháp luật và nhà cung cấp; phải được thẩm định riêng trước khi triển khai thực tế.

### 4.13 Thiết lập và quản trị dữ liệu

- Cấu hình thông tin cửa hàng, chi nhánh, múi giờ, tiền tệ, thuế, phương thức thanh toán và mẫu chứng từ.
- Quản lý tài khoản người dùng, vai trò, quyền và thiết bị/phiên đăng nhập.
- Cấu hình nghiệp vụ hàng hóa, đặt hàng, bán hàng, trả hàng, tích điểm, khuyến mại, sổ quỹ, giao hàng và thanh toán.
- Hỗ trợ khóa sổ theo kỳ để hạn chế sửa dữ liệu đã chốt; mở khóa phải có quyền và lý do.
- Lưu lịch sử thao tác: người dùng, thời điểm, hành động, đối tượng, giá trị trước/sau và nguồn truy cập phù hợp.
- Sao lưu/khôi phục dữ liệu; chức năng xóa dữ liệu phải có xác nhận mạnh, quyền riêng biệt và cơ chế phục hồi/kiểm soát theo chính sách lưu trữ.

## 5. Quy tắc nghiệp vụ cốt lõi

1. Mỗi chứng từ có mã duy nhất, thời điểm tạo/cập nhật, người tạo và trạng thái.
2. Chỉ chứng từ ở trạng thái được xác nhận mới làm thay đổi tồn kho, công nợ, doanh thu hoặc số dư quỹ.
3. Mọi thao tác hủy, trả hàng, điều chỉnh tồn, sửa giá vốn hoặc sửa chứng từ đã xác nhận phải được phân quyền và lưu vết.
4. Tồn kho được tính từ tồn đầu kỳ và các giao dịch nhập, bán, trả, kiểm kho, xuất dùng, xuất hủy, chuyển kho (nếu có).
5. Một giao dịch thanh toán không được ghi nhận hai lần; mọi hoàn tiền phải liên kết với nghiệp vụ trả/hủy tương ứng.
6. Dữ liệu giữa các chi nhánh phải được phân tách theo quyền; báo cáo toàn hệ thống chỉ dành cho vai trò được phép.
7. Không đưa dữ liệu thật, mật khẩu hoặc thông tin cá nhân của tài khoản tham khảo vào tài liệu, mã nguồn hoặc dữ liệu mẫu.

## 6. Mô hình dữ liệu đề xuất

Các thực thể chính: Cửa hàng, Chi nhánh, Người dùng, Vai trò/Quyền, Nhân viên, Ca làm việc, Bảng chấm công, Bảng lương, Nhóm hàng, Hàng hóa/Đơn vị tính/Mã vạch, Bảng giá, Tồn kho/Giao dịch kho, Nhà cung cấp, Phiếu nhập, Phiếu trả hàng nhập, Khách hàng/Nhóm khách hàng/Điểm thưởng, Đơn đặt hàng, Hóa đơn, Phiếu trả hàng, Thanh toán, Tài khoản quỹ, Phiếu thu/chi, Đơn giao hàng/Đối tác giao hàng, Khuyến mại, Nhật ký thao tác và Kỳ khóa sổ.

Mỗi chứng từ cần hỗ trợ nhiều dòng hàng và lưu giá/thuế/chiết khấu tại thời điểm phát sinh để lịch sử không đổi khi cấu hình danh mục thay đổi. Lưu trữ tiền bằng kiểu số thập phân chính xác, không dùng số thực dấu phẩy động.

## 7. Yêu cầu phi chức năng

- **Tính đúng đắn:** giao dịch bán/nhập/trả/thu chi phải cập nhật liên quan một cách nhất quán, tránh ghi nhận một phần.
- **Hiệu năng:** tìm hàng và thêm sản phẩm vào hóa đơn phải phản hồi nhanh trong điều kiện mạng và dữ liệu thông thường của cửa hàng; cần chốt mục tiêu cụ thể bằng kiểm thử tải.
- **Bảo mật:** mã hóa kết nối, băm mật khẩu an toàn, phân quyền tối thiểu, chống truy cập trái phép, giới hạn phiên và sao lưu bảo vệ.
- **Khả dụng:** thông báo rõ khi mất kết nối hoặc thao tác thất bại; không báo thành công nếu máy chủ chưa xác nhận.
- **Khả năng phục hồi:** có quy trình sao lưu, phục hồi và kiểm tra định kỳ.
- **Khả năng truy vết:** tìm được lịch sử của chứng từ và thay đổi quan trọng.
- **Khả năng sử dụng:** giao diện tiếng Việt, phù hợp thao tác cảm ứng/quét mã vạch, thông báo lỗi dễ hiểu và hỗ trợ in chứng từ.
- **Riêng tư:** chỉ thu thập dữ liệu cần thiết, giới hạn người xem và có chính sách lưu/xóa dữ liệu.

## 8. Tiêu chí nghiệm thu tối thiểu

- Tạo hàng hóa và nhập tồn; tìm hàng bằng mã hoặc mã vạch.
- Bán một hóa đơn có nhiều mặt hàng và nhiều hình thức thanh toán theo cấu hình; tồn kho và báo cáo được cập nhật đúng.
- Trả một phần hàng đã bán; tồn, tiền hoàn/công nợ và báo cáo phản ánh đúng, không cho trả vượt số đã bán.
- Nhập hàng từ nhà cung cấp và trả một phần hàng nhập; tồn và công nợ thay đổi chính xác.
- Kiểm kho tạo được chênh lệch có lý do và người xác nhận; có lịch sử trước/sau.
- Ghi nhận thu/chi và đối chiếu được số dư tài khoản quỹ.
- Người dùng không đủ quyền không thể xem hoặc thực hiện thao tác bị hạn chế.
- Dashboard và báo cáo lọc đúng thời gian/chi nhánh, truy ngược được về chứng từ nguồn.
- Nhật ký ghi nhận các thao tác nhạy cảm; khóa sổ hạn chế sửa dữ liệu thuộc kỳ đã chốt.

## 9. Lộ trình đề xuất

### Giai đoạn 1: MVP vận hành cửa hàng

Đăng nhập/phân quyền cơ bản, danh mục hàng hóa, nhà cung cấp, khách hàng, nhập hàng, bán hàng tại quầy, trả hàng, tồn kho, sổ quỹ, dashboard cơ bản và báo cáo bán hàng/tồn kho.

### Giai đoạn 2: Kiểm soát và tối ưu

Kiểm kho, xuất dùng/xuất hủy, bảng giá/khuyến mại, nhóm khách hàng/tích điểm, công nợ chi tiết, quản lý ca/chấm công, lương/hoa hồng, báo cáo nâng cao, nhật ký và khóa sổ.

### Giai đoạn 3: Kênh mở rộng

Giao hàng/đối tác vận chuyển, website/kênh bán online, chăm sóc khách hàng đa kênh, hóa đơn điện tử, thuế/kế toán và đồng bộ dịch vụ bên ngoài.

## 10. Câu hỏi cần chốt trước khi triển khai

- Cửa hàng có bao nhiêu chi nhánh, kho và quầy thu ngân? Có cần hoạt động khi mất mạng không?
- Có cho phép tồn âm, bán hàng chưa thanh toán đủ hoặc sửa hóa đơn sau khi chốt không?
- Cách tính giá vốn, doanh thu thuần, lợi nhuận, thuế và làm tròn tiền cụ thể là gì?
- Có hàng cân theo trọng lượng, hàng có hạn sử dụng/lô, combo hoặc đơn vị quy đổi không?
- Cần tích hợp máy in hóa đơn, máy quét mã vạch, cân điện tử, ngân hàng, ví, đơn vị giao hàng hay nền tảng hóa đơn điện tử nào?
- Quy tắc công nợ, tích điểm, khuyến mại, hoa hồng, lương và quy trình duyệt cần áp dụng ra sao?
- Báo cáo nào là bắt buộc, ai được xem và cần xuất theo định dạng nào?
- Chính sách lưu trữ, sao lưu, phân quyền dữ liệu cá nhân và xóa dữ liệu được yêu cầu như thế nào?

---

**Ghi chú:** Đặc tả này là bản khởi đầu dựa trên các nhóm chức năng quan sát được và nghiệp vụ phổ biến của cửa hàng tạp hóa. Cần xác nhận các câu hỏi ở mục 10 và rà soát từng luồng nghiệp vụ trước khi xem đây là yêu cầu chốt để phát triển.

## 11. Kiến trúc triển khai

### Công nghệ đề xuất

- **API:** ASP.NET Core 10 Web API, bắt đầu bằng Minimal APIs và tổ chức endpoint theo module.
- **Web quản trị:** React + TypeScript + Vite; tối ưu cho quản lý danh mục, chứng từ, cấu hình và báo cáo.
- **Mobile:** Flutter; ưu tiên Android cho bán hàng, quét mã vạch, tra cứu và kiểm kho; dùng chung API với web.
- **Cơ sở dữ liệu:** MySQL 8+ qua MySqlConnector; schema khởi tạo ban đầu là `quanly_taphoa`.
- **Triển khai:** Docker cho API và dịch vụ dữ liệu; môi trường development, staging và production tách biệt.

### Ranh giới hệ thống

- Web và mobile không truy cập cơ sở dữ liệu trực tiếp; mọi thao tác nghiệp vụ đi qua API có xác thực và phân quyền.
- API là nơi duy nhất áp dụng quy tắc giá, thanh toán, tồn kho, công nợ và trạng thái chứng từ.
- Bắt đầu bằng modular monolith, chia module theo nghiệp vụ (Catalog, Inventory, Purchasing, Sales, Customers, Cash, Reporting, Identity); chưa tách microservices trong MVP.
- Dùng giao dịch cơ sở dữ liệu cho các thao tác nhiều bước như xác nhận hóa đơn/phiếu nhập; lưu nhật ký cho thao tác nhạy cảm.
- Thiết kế mobile theo hướng online-first. Chỉ bổ sung lưu bán hàng offline và đồng bộ xung đột sau khi xác nhận đây là yêu cầu bắt buộc.

### Cấu trúc mã nguồn mục tiêu

- `apps/api`: ASP.NET Core Web API.
- `apps/web`: React + TypeScript.
- `apps/mobile`: Flutter app.
- `docs/`: quyết định kiến trúc và tài liệu API.

### Kế hoạch triển khai

1. **Nền móng:** tạo solution/API, web shell, cấu hình môi trường, kiểm tra build và quy ước API.
2. **Danh mục:** sản phẩm, nhóm hàng, đơn vị tính, nhà cung cấp/khách hàng và tìm kiếm.
3. **Vận hành MVP:** nhập hàng, tồn kho, POS/hóa đơn, thanh toán, trả hàng và sổ quỹ cơ bản.
4. **Mobile:** đăng nhập, tra cứu/quét hàng, bán hàng, xem hóa đơn và kiểm kho; xác nhận hành vi thiết bị trước khi phát hành.
5. **Báo cáo và kiểm soát:** dashboard, báo cáo, phân quyền chi tiết, nhật ký, khóa sổ và sao lưu.
6. **Tích hợp:** giao hàng, online, hóa đơn điện tử/kế toán theo nhu cầu và điều kiện nhà cung cấp.

Mỗi giai đoạn cần có kiểm thử nghiệp vụ, kiểm thử quyền truy cập và nghiệm thu với dữ liệu mẫu trước khi triển khai thật. Không đưa dữ liệu đăng nhập hoặc dữ liệu cá nhân của hệ thống tham khảo vào repo.

## 12. Trạng thái khởi tạo

- **API:** ASP.NET Core 10 Minimal API có health check, danh sách/tìm kiếm, tạo, sửa và ngừng bán sản phẩm; có endpoint tra cứu nhóm hàng.
- **Web:** React/TypeScript/Vite có dashboard responsive và 49 URL cho dashboard, POS, danh mục, mua hàng, đơn/giao hàng, khách hàng, nhân viên, sổ quỹ, báo cáo, online, thuế và thiết lập. Các trang dùng layout theo nhóm nghiệp vụ và menu thu gọn.
- **Kết nối:** Vite proxy `/api` tới API tại cổng `5082` trong môi trường phát triển.
- **Database:** API tự tạo database `quanly_taphoa`, bảng `product_categories`/`products` và nhóm hàng mặc định khi có `ConnectionStrings__StoreDb`.
- **Danh mục hàng hóa:** trang web đọc/ghi API thật, tìm kiếm, phân trang, tạo/sửa và soft-delete; mật khẩu MySQL không lưu trong repo.
- **Mobile:** chưa tạo Flutter project vì Flutter SDK chưa được cài trong môi trường hiện tại.
- **Chưa triển khai:** xác thực/phân quyền và API nghiệp vụ cho mua hàng, bán hàng, khách hàng, nhân viên, sổ quỹ, báo cáo và tích hợp. Các trang này vẫn dùng dữ liệu minh họa.

### Chạy môi trường phát triển trên Windows

Mở hai terminal riêng:

Trong `apps/api/appsettings.Development.json`, thay `CHANGE_ME` trong `ConnectionStrings:StoreDb` bằng mật khẩu MySQL cục bộ. File này được bỏ qua bởi `.gitignore`; không đưa mật khẩu thật vào `appsettings.json` hoặc commit lên repo. Có thể ghi đè cấu hình bằng biến môi trường `ConnectionStrings__StoreDb`.

```powershell
$env:ASPNETCORE_ENVIRONMENT = "Development"
dotnet run --project apps/api --no-launch-profile --urls http://localhost:5082
```

```powershell
npm.cmd run dev --prefix apps/web -- --host 127.0.0.1 --port 5173
```

Mở `http://127.0.0.1:5173/`. Để tạo app mobile, cần cài Flutter SDK cùng Android SDK/toolchain; sau đó khởi tạo Flutter project tại `apps/mobile` và cấu hình API base URL theo môi trường.

### Bước phát triển kế tiếp

1. Xác thực kết nối MySQL và kiểm thử database/schema khởi tạo trên môi trường cửa hàng.
2. Bổ sung lịch sử biến động kho và API quản lý nhóm hàng.
3. Triển khai vertical slice nhập hàng, sau đó bán hàng/POS và cập nhật tồn kho.
4. Khởi tạo Flutter app sau khi toolchain sẵn sàng, dùng chung API và bắt đầu với đăng nhập/tra cứu hàng.
