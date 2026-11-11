import { useState } from 'react'
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  CirclePlus,
  Clock3,
  FileText,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'
import type { AppPage, PageLayout } from './navigation'
import ProductCatalogPage from './ProductCatalogPage'
import MerchandisePage from './MerchandisePages'

type ModuleRecord = string[]

const columnsByLayout: Partial<Record<PageLayout, string[]>> = {
  catalog: ['MÃ HÀNG', 'TÊN HÀNG HÓA', 'NHÓM HÀNG', 'GIÁ BÁN', 'TỒN KHO', 'TRẠNG THÁI'],
  purchase: ['MÃ CHỨNG TỪ', 'ĐỐI TÁC', 'NGÀY TẠO', 'TỔNG TIỀN', 'ĐÃ THANH TOÁN', 'TRẠNG THÁI'],
  orders: ['MÃ CHỨNG TỪ', 'KHÁCH HÀNG', 'THỜI GIAN', 'TỔNG TIỀN', 'KÊNH BÁN', 'TRẠNG THÁI'],
  customers: ['MÃ KHÁCH', 'TÊN KHÁCH HÀNG', 'SỐ ĐIỆN THOẠI', 'SỐ HÓA ĐƠN', 'TỔNG CHI TIÊU', 'NHÓM'],
  employees: ['MÃ NHÂN VIÊN', 'HỌ VÀ TÊN', 'VAI TRÒ', 'CA LÀM VIỆC', 'DOANH SỐ', 'TRẠNG THÁI'],
  cash: ['MÃ PHIẾU', 'LOẠI PHIẾU', 'NỘI DUNG', 'NGÀY TẠO', 'NGƯỜI TẠO', 'GIÁ TRỊ'],
  reports: ['CHỈ TIÊU', 'KỲ BÁO CÁO', 'GIÁ TRỊ', 'SO VỚI KỲ TRƯỚC', 'CẬP NHẬT'],
  online: ['MÃ ĐƠN', 'KÊNH BÁN', 'KHÁCH HÀNG', 'NGÀY ĐẶT', 'TỔNG TIỀN', 'TRẠNG THÁI'],
  tax: ['MÃ HÓA ĐƠN', 'ĐỐI TÁC', 'NGÀY PHÁT HÀNH', 'MẪU SỐ', 'TỔNG TIỀN', 'TRẠNG THÁI'],
}

const recordsByLayout: Partial<Record<PageLayout, ModuleRecord[]>> = {
  catalog: [
    ['HH-00128', 'Mì tôm chua cay', 'Thực phẩm khô', '4.500 ₫', '36 gói', 'Đang bán'],
    ['HH-00241', 'Sữa tươi ít đường', 'Sữa & đồ uống', '32.000 ₫', '5 lốc', 'Sắp hết'],
    ['HH-00087', 'Dầu ăn thực vật', 'Gia vị', '48.000 ₫', '8 chai', 'Đang bán'],
    ['HH-00316', 'Nước mắm cá cơm', 'Gia vị', '29.500 ₫', '24 chai', 'Đang bán'],
    ['HH-00402', 'Bánh quy bơ hộp thiếc', 'Bánh kẹo', '56.000 ₫', '0 hộp', 'Hết hàng'],
  ],
  purchase: [
    ['PN-00194', 'Nhà phân phối Minh Phát', '09/11/2026', '3.250.000 ₫', '3.250.000 ₫', 'Đã nhập kho'],
    ['PN-00193', 'Thực phẩm An Bình', '08/11/2026', '1.860.000 ₫', '1.000.000 ₫', 'Còn công nợ'],
    ['PN-00192', 'Công ty Hàng tiêu dùng Việt', '07/11/2026', '4.120.000 ₫', '4.120.000 ₫', 'Đã nhập kho'],
    ['PN-00191', 'Nhà phân phối Minh Phát', '06/11/2026', '980.000 ₫', '0 ₫', 'Phiếu tạm'],
  ],
  orders: [
    ['HD-00862', 'Khách lẻ', '09/11/2026 10:42', '482.000 ₫', 'Tại quầy', 'Hoàn tất'],
    ['HD-00861', 'Nguyễn Thu Hà', '09/11/2026 09:56', '126.000 ₫', 'Tại quầy', 'Hoàn tất'],
    ['DH-00218', 'Trần Minh Anh', '09/11/2026 09:31', '860.000 ₫', 'Điện thoại', 'Chờ xử lý'],
    ['HD-00860', 'Khách lẻ', '09/11/2026 09:08', '215.000 ₫', 'Tại quầy', 'Hoàn tất'],
  ],
  customers: [
    ['KH-00048', 'Nguyễn Thu Hà', '0903 123 456', '18', '4.820.000 ₫', 'Thân thiết'],
    ['KH-00047', 'Trần Minh Anh', '0912 456 789', '12', '3.360.000 ₫', 'Thân thiết'],
    ['KH-00046', 'Lê Hoàng Nam', '0987 654 321', '6', '1.240.000 ₫', 'Thành viên'],
    ['KH-00045', 'Khách hàng mới', '0908 222 456', '1', '215.000 ₫', 'Mới'],
  ],
  employees: [
    ['NV-0008', 'Lan Trần', 'Quản lý', 'Ca sáng', '8.420.000 ₫', 'Đang làm'],
    ['NV-0007', 'Minh Nguyễn', 'Nhân viên kho', 'Ca sáng', '2.180.000 ₫', 'Đang làm'],
    ['NV-0006', 'Hà Phạm', 'Thu ngân', 'Ca chiều', '5.240.000 ₫', 'Đang làm'],
    ['NV-0005', 'Tuấn Lê', 'Bán hàng', 'Ca tối', '3.760.000 ₫', 'Nghỉ phép'],
  ],
  cash: [
    ['PT-00318', 'Phiếu thu', 'Thu tiền bán hàng', '09/11/2026 10:42', 'Lan Trần', '+482.000 ₫'],
    ['PC-00142', 'Phiếu chi', 'Thanh toán nhà cung cấp', '09/11/2026 10:18', 'Minh Nguyễn', '−1.500.000 ₫'],
    ['PT-00317', 'Phiếu thu', 'Khách thanh toán công nợ', '09/11/2026 09:40', 'Lan Trần', '+350.000 ₫'],
    ['PC-00141', 'Phiếu chi', 'Chi phí vận chuyển', '08/11/2026 17:20', 'Lan Trần', '−85.000 ₫'],
  ],
  reports: [
    ['Doanh thu thuần', 'Hôm nay', '12.840.000 ₫', '+8,4%', '10:45'],
    ['Số hóa đơn', 'Hôm nay', '86 hóa đơn', '+5,2%', '10:45'],
    ['Giá trị trả hàng', 'Hôm nay', '320.000 ₫', '−2,1%', '10:45'],
    ['Giá trị tồn kho', 'Hiện tại', '184.260.000 ₫', '+1,3%', '10:40'],
  ],
  online: [
    ['ON-00126', 'Website', 'Trần Minh Anh', '09/11/2026 10:31', '860.000 ₫', 'Chờ xác nhận'],
    ['ON-00125', 'Zalo', 'Phạm Ngọc Mai', '09/11/2026 10:04', '425.000 ₫', 'Đang chuẩn bị'],
    ['ON-00124', 'Website', 'Nguyễn Gia Bảo', '09/11/2026 09:48', '1.120.000 ₫', 'Đang giao'],
    ['ON-00123', 'Zalo', 'Lê Thu Hương', '09/11/2026 09:15', '218.000 ₫', 'Hoàn tất'],
  ],
  tax: [
    ['INV-00218', 'Nguyễn Thu Hà', '09/11/2026', '01GTKT', '482.000 ₫', 'Đã phát hành'],
    ['INV-00217', 'Công ty An Bình', '08/11/2026', '01GTKT', '3.250.000 ₫', 'Chờ đồng bộ'],
    ['INV-00216', 'Trần Minh Anh', '08/11/2026', '01GTKT', '860.000 ₫', 'Đã phát hành'],
  ],
}

const descriptions: Record<PageLayout, string> = {
  dashboard: '',
  pos: 'Tạo hóa đơn nhanh tại quầy và theo dõi giỏ hàng.',
  catalog: 'Quản lý danh mục, giá bán và số lượng hàng hóa.',
  purchase: 'Theo dõi nhà cung cấp và các nghiệp vụ mua hàng.',
  orders: 'Tra cứu đơn hàng, hóa đơn và trạng thái giao nhận.',
  customers: 'Quản lý hồ sơ và hoạt động chăm sóc khách hàng.',
  employees: 'Theo dõi nhân viên và các nghiệp vụ nhân sự.',
  cash: 'Theo dõi thu chi và số dư các tài khoản quỹ.',
  reports: 'Tổng hợp số liệu hoạt động theo kỳ được chọn.',
  online: 'Theo dõi đơn hàng và các kênh bán trực tuyến.',
  tax: 'Theo dõi chứng từ thuế và kết nối hóa đơn điện tử.',
  settings: 'Cấu hình hoạt động và quyền truy cập cửa hàng.',
}

const actionLabels: Record<PageLayout, string> = {
  dashboard: '',
  pos: 'Tạo hóa đơn',
  catalog: 'Thêm hàng hóa',
  purchase: 'Tạo phiếu nhập',
  orders: 'Tạo đơn hàng',
  customers: 'Thêm khách hàng',
  employees: 'Thêm nhân viên',
  cash: 'Tạo phiếu thu chi',
  reports: 'Xuất báo cáo',
  online: 'Kết nối kênh bán',
  tax: 'Kết nối hóa đơn điện tử',
  settings: 'Lưu thiết lập',
}

const settingsOptionsByPage: Record<string, string[]> = {
  'Thông tin cửa hàng': ['Thông tin chung', 'Địa chỉ & liên hệ', 'Thiết lập chứng từ'],
  'Người dùng & phân quyền': ['Tài khoản người dùng', 'Vai trò & quyền hạn', 'Lịch sử đăng nhập'],
  'Chi nhánh': ['Danh sách chi nhánh', 'Kho hàng', 'Quy tắc chuyển kho'],
  'Bảo mật': ['Chính sách mật khẩu', 'Phiên đăng nhập', 'Xác minh tài khoản'],
  'Khóa sổ': ['Kỳ khóa sổ', 'Quyền mở khóa', 'Lịch sử chốt kỳ'],
  'Lịch sử thao tác': ['Hoạt động người dùng', 'Thay đổi dữ liệu', 'Xuất nhật ký'],
  'Dữ liệu': ['Nhập dữ liệu', 'Xuất dữ liệu', 'Sao lưu & lưu trữ'],
  'Thiết lập nhân viên': ['Vai trò nhân viên', 'Ca làm việc', 'Quy tắc hoa hồng'],
}

function getRecords(layout: PageLayout): ModuleRecord[] {
  return recordsByLayout[layout] ?? []
}

function getColumns(layout: PageLayout): string[] {
  return columnsByLayout[layout] ?? []
}

function RecordTable({ layout, query }: { layout: PageLayout; query: string }) {
  const columns = getColumns(layout)
  const filteredRecords = getRecords(layout).filter((record) =>
    record.join(' ').toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')),
  )

  return (
    <div className="records-table-wrap">
      <table className="records-table">
        <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
        <tbody>
          {filteredRecords.map((record) => (
            <tr key={record[0]}>
              {record.map((value, index) => (
                <td key={`${record[0]}-${index}`}>
                  {index === 0 ? <strong className="record-code">{value}</strong> : value}
                </td>
              ))}
            </tr>
          ))}
          {filteredRecords.length === 0 && (
            <tr><td className="empty-cell" colSpan={columns.length}>Không tìm thấy dữ liệu phù hợp.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function ReportsSummary() {
  return (
    <section className="report-summary-grid" aria-label="Tóm tắt báo cáo">
      <article><span>Doanh thu thuần</span><strong>12.840.000 ₫</strong><small className="summary-up">↑ 8,4% so với kỳ trước</small></article>
      <article><span>Số hóa đơn</span><strong>86</strong><small className="summary-up">↑ 5,2% so với kỳ trước</small></article>
      <article><span>Giá trị trả hàng</span><strong>320.000 ₫</strong><small className="summary-down">↓ 2,1% so với kỳ trước</small></article>
    </section>
  )
}

function SettingsCards({ page }: { page: AppPage }) {
  const options = settingsOptionsByPage[page.label] ?? ['Thông tin chung', 'Quy tắc nghiệp vụ', 'Lịch sử thay đổi']

  return (
    <section className="settings-card-grid">
      {options.map((option, index) => (
        <article className="settings-option" key={option}>
          <span className={`settings-option-icon tone-${index}`}><Settings2 size={18} /></span>
          <div><h2>{option}</h2><p>Thiết lập {option.toLocaleLowerCase('vi')} cho cửa hàng.</p></div>
          <ArrowRight size={16} aria-hidden="true" />
        </article>
      ))}
    </section>
  )
}

function IntegrationCards({ page }: { page: AppPage }) {
  const options = page.layout === 'tax'
    ? ['Hóa đơn điện tử', 'Kết nối kế toán', 'Thông tin thuế']
    : ['Website bán hàng', 'Kênh mạng xã hội', 'Đồng bộ đơn hàng']

  return (
    <section className="integration-grid">
      {options.map((option, index) => (
        <article className="integration-card" key={option}>
          <span className={`integration-mark integration-${index}`}><Sparkles size={19} /></span>
          <h2>{option}</h2>
          <p>Kết nối dịch vụ để đồng bộ dữ liệu với hệ thống cửa hàng.</p>
          <span className="integration-state"><span />Chưa kết nối</span>
          <button type="button" className="subtle-button">Thiết lập kết nối <ArrowUpRight size={14} /></button>
        </article>
      ))}
    </section>
  )
}

function PointOfSale({ onNotice }: { onNotice: (message: string) => void }) {
  const [quantities, setQuantities] = useState([1, 2, 1])
  const products = [
    { name: 'Sữa tươi ít đường', detail: 'Lốc 4 hộp · HH-00241', price: 32000 },
    { name: 'Mì tôm chua cay', detail: 'Gói · HH-00128', price: 4500 },
    { name: 'Dầu ăn thực vật', detail: 'Chai 1 lít · HH-00087', price: 48000 },
  ]
  const total = products.reduce((sum, product, index) => sum + product.price * quantities[index], 0)

  const changeQuantity = (index: number, amount: number) => {
    setQuantities((current) => current.map((quantity, itemIndex) =>
      itemIndex === index ? Math.max(0, quantity + amount) : quantity,
    ))
  }

  return (
    <section className="pos-layout">
      <div className="pos-products panel">
        <div className="pos-search"><Search size={17} /><input placeholder="Quét mã vạch hoặc tìm hàng hóa" aria-label="Tìm hàng hóa" /><button type="button" aria-label="Bộ lọc"><SlidersHorizontal size={17} /></button></div>
        <div className="pos-category-row"><button className="selected" type="button">Tất cả</button><button type="button">Đồ uống</button><button type="button">Thực phẩm</button><button type="button">Gia dụng</button></div>
        <div className="pos-product-grid">
          {products.map((product, index) => (
            <button className="pos-product" key={product.name} type="button" onClick={() => changeQuantity(index, 1)}>
              <span className={`pos-product-art art-${index}`}>{product.name.slice(0, 1)}</span>
              <strong>{product.name}</strong>
              <small>{product.detail}</small>
              <span className="pos-product-bottom"><b>{product.price.toLocaleString('vi-VN')} ₫</b><CirclePlus size={17} /></span>
            </button>
          ))}
        </div>
        <p className="layout-demo-note">Dữ liệu hàng hóa minh họa · chưa lưu vào hệ thống</p>
      </div>
      <aside className="pos-cart panel">
        <div className="pos-cart-heading"><div><h2>Hóa đơn mới</h2><p>HD-00001 · Khách lẻ</p></div><button type="button" aria-label="Tùy chọn hóa đơn">···</button></div>
        <button className="customer-select" type="button"><span>Khách hàng</span><strong>Khách lẻ</strong><ChevronDown size={15} /></button>
        <div className="pos-cart-lines">
          {products.map((product, index) => quantities[index] > 0 && (
            <div className="pos-cart-line" key={product.name}>
              <span className={`pos-mini-art art-${index}`}>{product.name.slice(0, 1)}</span>
              <span className="pos-line-name"><strong>{product.name}</strong><small>{product.price.toLocaleString('vi-VN')} ₫</small></span>
              <span className="quantity-control"><button type="button" onClick={() => changeQuantity(index, -1)} aria-label={`Giảm ${product.name}`}>−</button><b>{quantities[index]}</b><button type="button" onClick={() => changeQuantity(index, 1)} aria-label={`Tăng ${product.name}`}>+</button></span>
            </div>
          ))}
          {quantities.every((quantity) => quantity === 0) && <p className="empty-cart">Chưa có sản phẩm trong hóa đơn.</p>}
        </div>
        <div className="pos-totals"><div><span>Tạm tính</span><strong>{total.toLocaleString('vi-VN')} ₫</strong></div><div><span>Giảm giá</span><button type="button" onClick={() => onNotice('Phần khuyến mại sẽ được bổ sung sau.')}>Thêm giảm giá</button></div><div className="pos-grand-total"><span>Khách cần trả</span><strong>{total.toLocaleString('vi-VN')} ₫</strong></div></div>
        <button className="checkout-button" type="button" onClick={() => onNotice('Đây là giao diện mẫu, hóa đơn chưa được lưu.')}>Thanh toán <span>{total.toLocaleString('vi-VN')} ₫</span></button>
      </aside>
    </section>
  )
}

export default function ModulePage({ page }: { page: AppPage }) {
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')
  const columns = getColumns(page.layout)
  const actionLabel = actionLabels[page.layout]
  const isListPage = columns.length > 0

  if (page.path === '/products') return <ProductCatalogPage />
  if (page.path === '/price-books') return <MerchandisePage path="price-books" />
  if (page.path === '/stock-takes') return <MerchandisePage path="stock-takes" />
  if (page.path === '/internal-use') return <MerchandisePage path="internal-use" />
  if (page.path === '/damaged-stock') return <MerchandisePage path="damaged-stock" />

  if (page.layout === 'pos') {
    return (
      <>
        <section className="page-heading">
          <div>
            <p className="eyebrow">BÁN HÀNG TẠI QUẦY</p>
            <h1>{page.label}</h1>
            <p className="page-subtitle">{descriptions[page.layout]}</p>
          </div>
          <span className="sample-label">GIAO DIỆN MẪU</span>
        </section>
        {notice && <div className="module-notice" role="status">{notice}<button type="button" onClick={() => setNotice('')} aria-label="Đóng thông báo">×</button></div>}
        <PointOfSale onNotice={setNotice} />
      </>
    )
  }

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">{page.path.startsWith('/reports') ? 'PHÂN TÍCH & BÁO CÁO' : 'QUẢN LÝ CỬA HÀNG'}</p>
          <h1>{page.label}</h1>
          <p className="page-subtitle">{descriptions[page.layout]}</p>
        </div>
        <div className="heading-actions">
          <span className="sample-label">GIAO DIỆN MẪU</span>
          {actionLabel && <button className="primary-action" type="button" onClick={() => setNotice('Giao diện đã sẵn sàng; thao tác sẽ được kết nối API ở giai đoạn nghiệp vụ.')}><CirclePlus size={15} />{actionLabel}</button>}
        </div>
      </section>

      {notice && <div className="module-notice" role="status"><Check size={15} />{notice}<button type="button" onClick={() => setNotice('')} aria-label="Đóng thông báo">×</button></div>}

      {page.layout === 'reports' && <ReportsSummary />}
      {page.layout === 'settings' && <SettingsCards page={page} />}
      {(page.layout === 'online' || page.layout === 'tax') && <IntegrationCards page={page} />}

      {isListPage && (
        <section className="module-list-panel panel">
          <div className="list-panel-heading">
            <div><h2>{page.label}</h2><p>{getRecords(page.layout).length} dòng dữ liệu minh họa</p></div>
            <button className="subtle-button" type="button" onClick={() => setNotice('Xuất file sẽ khả dụng sau khi kết nối dữ liệu thật.')}><ArrowDownToLine size={14} />Xuất file</button>
          </div>
          <div className="list-toolbar">
            <label className="list-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo mã, tên hoặc nội dung..." /></label>
            <label className="filter-select"><SlidersHorizontal size={15} /><select aria-label="Bộ lọc trạng thái"><option>Tất cả trạng thái</option><option>Đang hoạt động</option><option>Hoàn tất</option><option>Chờ xử lý</option></select><ChevronDown size={14} /></label>
            <button className="subtle-button filter-date" type="button" onClick={() => setNotice('Bộ chọn khoảng thời gian sẽ được bổ sung theo từng nghiệp vụ.')}><Clock3 size={14} />Thời gian<ChevronDown size={14} /></button>
          </div>
          <RecordTable layout={page.layout} query={query} />
          <div className="list-pagination"><span>Đang hiển thị {getRecords(page.layout).length} dòng mẫu</span><div><button type="button" disabled>Trước</button><button className="page-number" type="button">1</button><button type="button" disabled>Sau</button></div></div>
        </section>
      )}

      {!isListPage && page.layout === 'settings' && (
        <section className="settings-history panel"><div className="list-panel-heading"><div><h2>Lịch sử cấu hình</h2><p>Các thay đổi gần đây trong nhóm thiết lập này</p></div><button className="subtle-button" type="button"><FileText size={14} />Xem nhật ký</button></div><div className="settings-history-row"><span className="history-check"><Check size={14} /></span><span><strong>Cập nhật thiết lập cửa hàng</strong><small>Thông tin này đang hiển thị ở chế độ mẫu</small></span><time>Hôm nay</time></div></section>
      )}

      {page.layout === 'reports' && (
        <section className="report-chart panel"><div className="list-panel-heading"><div><h2>Xu hướng theo thời gian</h2><p>Số liệu tổng hợp theo ngày trong kỳ</p></div><button className="subtle-button" type="button" onClick={() => setNotice('Bộ lọc kỳ báo cáo sẽ được kết nối ở giai đoạn báo cáo.')}><Clock3 size={14} />Tháng này<ChevronDown size={14} /></button></div><div className="report-bars" aria-label="Biểu đồ mẫu"><i style={{ height: '42%' }} /><i style={{ height: '58%' }} /><i style={{ height: '47%' }} /><i style={{ height: '71%' }} /><i style={{ height: '62%' }} /><i style={{ height: '86%' }} /><i style={{ height: '66%' }} /><i style={{ height: '95%' }} /><i style={{ height: '74%' }} /><i style={{ height: '82%' }} /><i style={{ height: '69%' }} /><i style={{ height: '100%' }} /></div><div className="report-chart-labels"><span>01</span><span>05</span><span>10</span><span>15</span><span>20</span><span>25</span><span>30</span></div></section>
      )}

      {notice && <span className="sr-only" aria-live="polite">{notice}</span>}
    </>
  )
}
