import { useEffect, useState } from 'react'
import {
  ArrowUpRight,
  Banknote,
  Bell,
  ChevronDown,
  CircleCheck,
  Clock3,
  LayoutDashboard,
  Menu,
  Package,
  ReceiptText,
  Search,
  ShoppingCart,
  TriangleAlert,
  X,
} from 'lucide-react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import ModulePage from './ModulePage'
import { dashboardPage, getGroupForPath, getPageByPath, navigationGroups } from './navigation'
import './App.css'

const sales = [
  { time: '08:00', amount: 22 },
  { time: '09:00', amount: 38 },
  { time: '10:00', amount: 30 },
  { time: '11:00', amount: 56 },
  { time: '12:00', amount: 42 },
  { time: '13:00', amount: 68 },
  { time: '14:00', amount: 48 },
  { time: '15:00', amount: 84 },
  { time: '16:00', amount: 62 },
  { time: '17:00', amount: 74 },
  { time: '18:00', amount: 52 },
  { time: '19:00', amount: 92 },
]

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const currentPage = getPageByPath(location.pathname)
  const activePage = currentPage?.label ?? 'Không tìm thấy'
  const activeGroupId = getGroupForPath(location.pathname)?.id
  const [period, setPeriod] = useState('Hôm nay')
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((current) => {
      const isCurrentlyExpanded = !(current[groupId] ?? (groupId !== activeGroupId))
      return { ...current, [groupId]: isCurrentlyExpanded }
    })
  }

  useEffect(() => {
    const controller = new AbortController()

    fetch('/api/health', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('API unavailable')
        setApiStatus('online')
      })
      .catch(() => {
        if (!controller.signal.aborted) setApiStatus('offline')
      })

    return () => controller.abort()
  }, [])

  return (
    <div className={`app-shell${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
      {mobileNavOpen && <button className="nav-backdrop" type="button" aria-label="Đóng menu" onClick={() => setMobileNavOpen(false)} />}
      <aside className={`sidebar${mobileNavOpen ? ' mobile-open' : ''}${sidebarCollapsed ? ' is-collapsed' : ''}`}>
        <Link className="brand" to="/" aria-label="Tạp hóa An Nhiên - Tổng quan" onClick={() => setMobileNavOpen(false)}>
          <span className="brand-mark">A</span>
          <span className="brand-copy">
            <strong>An Nhiên</strong>
            <small>QUẢN LÝ CỬA HÀNG</small>
          </span>
        </Link>

        <div className="store-switcher">
          <span className="store-avatar">AN</span>
          <span className="store-name">
            <strong>Cửa hàng An Nhiên</strong>
            <small>Chi nhánh trung tâm</small>
          </span>
          <ChevronDown size={16} aria-hidden="true" />
        </div>

        <nav className="primary-nav" aria-label="Điều hướng chính">
          <span className="nav-caption">VẬN HÀNH</span>
          <NavLink className={({ isActive }) => `nav-item${isActive ? ' is-active' : ''}`} end to={dashboardPage.path} onClick={() => setMobileNavOpen(false)}>
            <LayoutDashboard size={18} strokeWidth={1.8} aria-hidden="true" />
            <span>{dashboardPage.label}</span>
          </NavLink>
          {navigationGroups.map(({ id, label, icon: Icon, pages }) => {
            const isExpanded = !(collapsedGroups[id] ?? (id !== activeGroupId))

            return <div className={`nav-group${activeGroupId === id ? ' group-active' : ''}`} key={id}>
              <button className="nav-group-toggle" type="button" aria-expanded={isExpanded} onClick={() => toggleGroup(id)}>
                <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
                <span>{label}</span>
                <ChevronDown className={isExpanded ? 'chevron-open' : ''} size={14} aria-hidden="true" />
              </button>
              {isExpanded && <div className="nav-subitems">
                {pages.map((page) => (
                  <NavLink className={({ isActive }) => `nav-subitem${isActive ? ' is-active' : ''}`} key={page.path} to={page.path} onClick={() => setMobileNavOpen(false)}>
                    <span className="nav-subitem-dot" />
                    <span>{page.label}</span>
                    {page.path === '/products' && <span className="nav-count">7</span>}
                  </NavLink>
                ))}
              </div>}
            </div>
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className={`connection-status is-${apiStatus}`}>
            <span className="status-dot" />
            {apiStatus === 'online' && 'API đang hoạt động'}
            {apiStatus === 'checking' && 'Đang kết nối API'}
            {apiStatus === 'offline' && 'Chưa kết nối API'}
          </div>
          <button className="profile-button" type="button">
            <span className="profile-avatar">LT</span>
            <span className="profile-copy">
              <strong>Lan Trần</strong>
              <small>Quản lý cửa hàng</small>
            </span>
            <ChevronDown size={16} aria-hidden="true" />
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="sidebar-toggle icon-button" type="button" aria-label={mobileNavOpen ? 'Đóng menu' : sidebarCollapsed ? 'Mở menu' : 'Thu gọn menu'} onClick={() => {
            if (window.matchMedia('(max-width: 760px)').matches) setMobileNavOpen((open) => !open)
            else setSidebarCollapsed((collapsed) => !collapsed)
          }}>
            {mobileNavOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <Link className="header-brand" to="/" aria-label="An Nhiên - Tổng quan">
            <span className="header-brand-mark">A</span>
            <strong>An Nhiên</strong>
          </Link>
          <div className="breadcrumb">
            <span>Không gian làm việc</span>
            <span className="breadcrumb-divider">/</span>
            <strong>{activePage}</strong>
          </div>
          <div className="topbar-actions">
            <label className="search-box">
              <Search size={17} aria-hidden="true" />
              <input aria-label="Tìm kiếm" placeholder="Tìm hàng hóa, hóa đơn..." />
              <kbd>⌘ K</kbd>
            </label>
            <button className="icon-button notification-button" type="button" aria-label="Thông báo">
              <Bell size={18} aria-hidden="true" />
              <span />
            </button>
            <span className="topbar-date">Thứ Hai, 09 Tháng 11</span>
          </div>
        </header>

        <div className="content-wrap">
          {currentPage?.layout === 'dashboard' ? (
            <>
              <section className="page-heading">
                <div>
                  <p className="eyebrow">THỨ HAI · 09.11.2026</p>
                  <h1>Tổng quan</h1>
                  <p className="page-subtitle">Tình hình kinh doanh tại cửa hàng của bạn.</p>
                </div>
                <div className="heading-actions">
                  <span className="sample-label">DỮ LIỆU MINH HỌA</span>
                  <label className="period-select">
                    <span className="sr-only">Khoảng thời gian</span>
                    <select value={period} onChange={(event) => setPeriod(event.target.value)}>
                      <option>Hôm nay</option>
                      <option>7 ngày qua</option>
                      <option>Tháng này</option>
                    </select>
                    <ChevronDown size={15} aria-hidden="true" />
                  </label>
                </div>
              </section>

              <section className="metric-grid" aria-label="Chỉ số kinh doanh">
                <article className="metric-card metric-primary">
                  <div className="metric-topline">
                    <span>Doanh thu thuần</span>
                    <span className="metric-icon green"><Banknote size={18} /></span>
                  </div>
                  <strong className="metric-value">12.840.000 <small>₫</small></strong>
                  <div className="metric-foot">
                    <span className="trend-positive"><ArrowUpRight size={14} /> 8,4%</span>
                    <span>so với hôm qua</span>
                  </div>
                </article>
                <article className="metric-card">
                  <div className="metric-topline">
                    <span>Hóa đơn</span>
                    <span className="metric-icon blue"><ReceiptText size={18} /></span>
                  </div>
                  <strong className="metric-value">86 <small>đơn</small></strong>
                  <div className="metric-foot">
                    <span className="trend-positive"><ArrowUpRight size={14} /> 5,2%</span>
                    <span>so với hôm qua</span>
                  </div>
                </article>
                <article className="metric-card">
                  <div className="metric-topline">
                    <span>Giá trị trung bình</span>
                    <span className="metric-icon amber"><ShoppingCart size={18} /></span>
                  </div>
                  <strong className="metric-value">149.302 <small>₫</small></strong>
                  <div className="metric-foot">
                    <span className="trend-negative">−1,8%</span>
                    <span>so với hôm qua</span>
                  </div>
                </article>
                <article className="metric-card">
                  <div className="metric-topline">
                    <span>Hàng sắp hết</span>
                    <span className="metric-icon coral"><TriangleAlert size={18} /></span>
                  </div>
                  <strong className="metric-value">7 <small>sản phẩm</small></strong>
                  <div className="metric-foot">
                    <a href="/products" onClick={(event) => { event.preventDefault(); navigate('/products') }}>Xem danh sách <ArrowUpRight size={13} /></a>
                  </div>
                </article>
              </section>

              <section className="dashboard-grid">
                <article className="panel sales-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Doanh thu trong ngày</h2>
                      <p>Theo giờ · {period.toLowerCase()}</p>
                    </div>
                    <button className="text-action" type="button" onClick={() => navigate('/reports/sales')}>
                      Xem báo cáo <ArrowUpRight size={15} />
                    </button>
                  </div>
                  <div className="chart-summary">
                    <strong>12.840.000 <small>₫</small></strong>
                    <span><CircleCheck size={14} /> Cập nhật trực tiếp</span>
                  </div>
                  <div className="bar-chart" role="img" aria-label="Biểu đồ doanh thu theo giờ, dữ liệu minh họa">
                    <div className="chart-guides"><i /><i /><i /><i /></div>
                    <div className="bars">
                      {sales.map((item, index) => (
                        <div className="bar-column" key={item.time}>
                          <span className={`bar${index === 11 ? ' is-current' : ''}`} style={{ height: `${item.amount}%` }} />
                          <small>{item.time}</small>
                        </div>
                      ))}
                    </div>
                  </div>
                </article>

                <article className="panel stock-panel" id="inventory">
                  <div className="panel-heading">
                    <div>
                      <h2>Cần nhập thêm</h2>
                      <p>Sản phẩm dưới định mức tồn</p>
                    </div>
                    <button className="more-button" type="button" aria-label="Tùy chọn hàng sắp hết">···</button>
                  </div>
                  <div className="stock-list">
                    <div className="stock-row">
                      <span className="product-swatch swatch-orange">M</span>
                      <span className="product-copy"><strong>Mì tôm chua cay</strong><small>HH-00128 · Thùng 30 gói</small></span>
                      <span className="stock-level level-low"><strong>3</strong><small>còn lại</small></span>
                    </div>
                    <div className="stock-row">
                      <span className="product-swatch swatch-blue">S</span>
                      <span className="product-copy"><strong>Sữa tươi ít đường</strong><small>HH-00241 · Lốc 4 hộp</small></span>
                      <span className="stock-level level-low"><strong>5</strong><small>còn lại</small></span>
                    </div>
                    <div className="stock-row">
                      <span className="product-swatch swatch-pink">D</span>
                      <span className="product-copy"><strong>Dầu ăn thực vật</strong><small>HH-00087 · Chai 1 lít</small></span>
                      <span className="stock-level level-watch"><strong>8</strong><small>còn lại</small></span>
                    </div>
                  </div>
                  <button className="panel-footer-action" type="button" onClick={() => navigate('/products')}>
                    Xem tất cả 7 sản phẩm <ArrowUpRight size={14} />
                  </button>
                </article>
              </section>

              <section className="panel activity-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Hoạt động gần đây</h2>
                    <p>Các giao dịch mới nhất tại cửa hàng</p>
                  </div>
                  <button className="text-action" type="button" onClick={() => navigate('/invoices')}>
                    Tất cả giao dịch <ArrowUpRight size={15} />
                  </button>
                </div>
                <div className="activity-table-wrap">
                  <table className="activity-table">
                    <thead><tr><th>GIAO DỊCH</th><th>NHÂN VIÊN</th><th>THỜI GIAN</th><th>GIÁ TRỊ</th><th>TRẠNG THÁI</th></tr></thead>
                    <tbody>
                      <tr><td><span className="transaction-icon sale"><ShoppingCart size={15} /></span><span><strong>Hóa đơn #HD-00862</strong><small>Bán hàng tại quầy</small></span></td><td>Lan Trần</td><td><Clock3 size={14} /> 10:42</td><td className="amount-cell">482.000 ₫</td><td><span className="status-pill paid">Hoàn tất</span></td></tr>
                      <tr><td><span className="transaction-icon purchase"><Package size={15} /></span><span><strong>Phiếu nhập #PN-00194</strong><small>Nhập hàng từ nhà cung cấp</small></span></td><td>Minh Nguyễn</td><td><Clock3 size={14} /> 10:18</td><td className="amount-cell">3.250.000 ₫</td><td><span className="status-pill received">Đã nhập kho</span></td></tr>
                      <tr><td><span className="transaction-icon sale"><ShoppingCart size={15} /></span><span><strong>Hóa đơn #HD-00861</strong><small>Bán hàng tại quầy</small></span></td><td>Lan Trần</td><td><Clock3 size={14} /> 09:56</td><td className="amount-cell">126.000 ₫</td><td><span className="status-pill paid">Hoàn tất</span></td></tr>
                    </tbody>
                  </table>
                </div>
              </section>
              <p className="demo-note">Các số liệu trên chỉ phục vụ dựng giao diện, chưa lấy từ dữ liệu cửa hàng.</p>
            </>
          ) : currentPage ? <ModulePage key={currentPage.path} page={currentPage} /> : (
            <section className="module-placeholder">
              <span className="placeholder-icon"><Package size={22} /></span>
              <p className="eyebrow">KHÔNG TÌM THẤY TRANG</p>
              <h1>Đường dẫn không hợp lệ</h1>
              <p>Trang bạn mở chưa có trong danh mục hệ thống.</p>
              <button className="back-dashboard" type="button" onClick={() => navigate('/')}>
                Về tổng quan
              </button>
            </section>
          )}
        </div>
        <footer className="app-footer"><span>An Nhiên · Quản lý cửa hàng</span><span>Phiên bản khởi tạo 0.1.0</span></footer>
      </main>
    </div>
  )
}

export default App
