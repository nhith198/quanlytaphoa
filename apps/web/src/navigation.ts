import type { LucideIcon } from 'lucide-react'
import {
  Banknote,
  ChartNoAxesCombined,
  ClipboardList,
  Globe2,
  Package,
  ReceiptText,
  Settings2,
  ShoppingCart,
  Truck,
  UsersRound,
  UserRoundCog,
} from 'lucide-react'

export type PageLayout =
  | 'dashboard'
  | 'pos'
  | 'catalog'
  | 'purchase'
  | 'orders'
  | 'customers'
  | 'employees'
  | 'cash'
  | 'reports'
  | 'online'
  | 'tax'
  | 'settings'

export type AppPage = {
  label: string
  path: string
  layout: PageLayout
}

export type NavigationGroup = {
  id: string
  label: string
  icon: LucideIcon
  pages: AppPage[]
}

export const dashboardPage: AppPage = {
  label: 'Tổng quan',
  path: '/',
  layout: 'dashboard',
}

export const navigationGroups: NavigationGroup[] = [
  {
    id: 'sales',
    label: 'Bán hàng',
    icon: ShoppingCart,
    pages: [{ label: 'Màn hình bán hàng', path: '/pos', layout: 'pos' }],
  },
  {
    id: 'products',
    label: 'Hàng hóa',
    icon: Package,
    pages: [
      { label: 'Danh sách hàng hóa', path: '/products', layout: 'catalog' },
      { label: 'Thiết lập giá', path: '/price-books', layout: 'catalog' },
      { label: 'Kiểm kho', path: '/stock-takes', layout: 'catalog' },
      { label: 'Xuất dùng nội bộ', path: '/internal-use', layout: 'catalog' },
      { label: 'Xuất hủy', path: '/damaged-stock', layout: 'catalog' },
    ],
  },
  {
    id: 'purchasing',
    label: 'Mua hàng',
    icon: Truck,
    pages: [
      { label: 'Nhà cung cấp', path: '/suppliers', layout: 'purchase' },
      { label: 'Hóa đơn đầu vào', path: '/purchase-invoices', layout: 'purchase' },
      { label: 'Nhập hàng', path: '/purchases', layout: 'purchase' },
      { label: 'Trả hàng nhập', path: '/purchase-returns', layout: 'purchase' },
      { label: 'Mua dịch vụ', path: '/service-purchases', layout: 'purchase' },
    ],
  },
  {
    id: 'orders',
    label: 'Đơn hàng & giao hàng',
    icon: ReceiptText,
    pages: [
      { label: 'Đặt hàng', path: '/orders', layout: 'orders' },
      { label: 'Hóa đơn', path: '/invoices', layout: 'orders' },
      { label: 'Trả hàng', path: '/returns', layout: 'orders' },
      { label: 'Vận đơn', path: '/shipments', layout: 'orders' },
      { label: 'Quản lý giao hàng', path: '/deliveries', layout: 'orders' },
      { label: 'Đối tác giao hàng', path: '/delivery-partners', layout: 'orders' },
    ],
  },
  {
    id: 'customers',
    label: 'Khách hàng',
    icon: UsersRound,
    pages: [
      { label: 'Danh sách khách hàng', path: '/customers', layout: 'customers' },
      { label: 'Nhóm khách hàng', path: '/customer-groups', layout: 'customers' },
      { label: 'Gửi tin chăm sóc', path: '/customer-messages', layout: 'customers' },
      { label: 'Cửa hàng online trên Zalo', path: '/zalo-store', layout: 'online' },
    ],
  },
  {
    id: 'employees',
    label: 'Nhân viên',
    icon: UserRoundCog,
    pages: [
      { label: 'Danh sách nhân viên', path: '/employees', layout: 'employees' },
      { label: 'Lịch làm việc', path: '/schedules', layout: 'employees' },
      { label: 'Bảng chấm công', path: '/attendance', layout: 'employees' },
      { label: 'Bảng lương', path: '/payroll', layout: 'employees' },
      { label: 'Bảng hoa hồng', path: '/commissions', layout: 'employees' },
      { label: 'Thiết lập nhân viên', path: '/employee-settings', layout: 'settings' },
    ],
  },
  {
    id: 'cash',
    label: 'Sổ quỹ',
    icon: Banknote,
    pages: [{ label: 'Sổ quỹ', path: '/cashbook', layout: 'cash' }],
  },
  {
    id: 'reports',
    label: 'Báo cáo',
    icon: ChartNoAxesCombined,
    pages: [
      { label: 'Cuối ngày', path: '/reports/end-of-day', layout: 'reports' },
      { label: 'Bán hàng', path: '/reports/sales', layout: 'reports' },
      { label: 'Đặt hàng', path: '/reports/orders', layout: 'reports' },
      { label: 'Hàng hóa', path: '/reports/products', layout: 'reports' },
      { label: 'Khách hàng', path: '/reports/customers', layout: 'reports' },
      { label: 'Nhà cung cấp', path: '/reports/suppliers', layout: 'reports' },
      { label: 'Nhân viên', path: '/reports/employees', layout: 'reports' },
      { label: 'Kênh bán hàng', path: '/reports/channels', layout: 'reports' },
      { label: 'Tài chính', path: '/reports/finance', layout: 'reports' },
    ],
  },
  {
    id: 'online',
    label: 'Bán online',
    icon: Globe2,
    pages: [
      { label: 'Đơn hàng online', path: '/online-sales', layout: 'online' },
      { label: 'Website bán hàng', path: '/online-store', layout: 'online' },
    ],
  },
  {
    id: 'tax',
    label: 'Thuế & Kế toán',
    icon: ClipboardList,
    pages: [
      { label: 'Thuế & Kế toán', path: '/tax-accounting', layout: 'tax' },
      { label: 'Hóa đơn điện tử', path: '/electronic-invoices', layout: 'tax' },
    ],
  },
  {
    id: 'settings',
    label: 'Thiết lập',
    icon: Settings2,
    pages: [
      { label: 'Thông tin cửa hàng', path: '/settings/store', layout: 'settings' },
      { label: 'Người dùng & phân quyền', path: '/settings/users', layout: 'settings' },
      { label: 'Chi nhánh', path: '/settings/branches', layout: 'settings' },
      { label: 'Bảo mật', path: '/settings/security', layout: 'settings' },
      { label: 'Khóa sổ', path: '/settings/closing', layout: 'settings' },
      { label: 'Lịch sử thao tác', path: '/settings/audit-log', layout: 'settings' },
      { label: 'Dữ liệu', path: '/settings/data', layout: 'settings' },
    ],
  },
]

export const allPages = [dashboardPage, ...navigationGroups.flatMap((group) => group.pages)]

export const getPageByPath = (path: string): AppPage | undefined =>
  allPages.find((page) => page.path === path)

export const getGroupForPath = (path: string): NavigationGroup | undefined =>
  navigationGroups.find((group) => group.pages.some((page) => page.path === path))
