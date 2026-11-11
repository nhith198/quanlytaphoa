import { useDeferredValue, useEffect, useRef, useState, type FormEvent } from 'react'
import { Ban, CirclePlus, Columns3, Download, Pencil, Search, SlidersHorizontal, Upload, X } from 'lucide-react'
import type { ProductCategoryResponse, ProductResponse } from './productTypes'

type ProductListResponse = {
  items: ProductResponse[]
  page: number
  pageSize: number
  totalCount: number
}

type ProductForm = {
  sku: string
  barcode: string
  name: string
  categoryId: string
  unit: string
  productType: string
  supplierName: string
  location: string
  isDirectSale: boolean
  isChannelLinked: boolean
  costPrice: string
  salePrice: string
  stockQuantity: string
  minimumStock: string
}

const emptyForm: ProductForm = {
  sku: '',
  barcode: '',
  name: '',
  categoryId: '',
  unit: 'cái',
  productType: 'goods',
  supplierName: '',
  location: '',
  isDirectSale: true,
  isChannelLinked: false,
  costPrice: '0',
  salePrice: '0',
  stockQuantity: '0',
  minimumStock: '0',
}

const pageSize = 20
const currency = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 })
async function readError(response: Response, fallback: string): Promise<string> {
  const problem = await response.json().catch(() => null) as { title?: string; detail?: string } | null
  return problem?.detail ?? problem?.title ?? fallback
}

const columnDefinitions = [
  { key: 'sku', label: 'Mã hàng' },
  { key: 'barcode', label: 'Mã vạch' },
  { key: 'name', label: 'Tên hàng hóa' },
  { key: 'category', label: 'Nhóm hàng' },
  { key: 'productType', label: 'Loại hàng' },
  { key: 'costPrice', label: 'Giá vốn' },
  { key: 'salePrice', label: 'Giá bán' },
  { key: 'stock', label: 'Tồn kho' },
  { key: 'supplier', label: 'Nhà cung cấp' },
  { key: 'location', label: 'Vị trí' },
  { key: 'createdAt', label: 'Ngày tạo' },
  { key: 'status', label: 'Trạng thái' },
] as const
type ProductColumn = (typeof columnDefinitions)[number]['key']
const defaultColumns: ProductColumn[] = ['sku', 'name', 'category', 'salePrice', 'stock', 'status']

export default function ProductCatalogPage() {
  const [products, setProducts] = useState<ProductResponse[]>([])
  const [categories, setCategories] = useState<ProductCategoryResponse[]>([])
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [categoryId, setCategoryId] = useState('')
  const [stockStatus, setStockStatus] = useState('')
  const [productTypeFilter, setProductTypeFilter] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [saleFilter, setSaleFilter] = useState('')
  const [channelFilter, setChannelFilter] = useState('')
  const [createdFrom, setCreatedFrom] = useState('')
  const [createdTo, setCreatedTo] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [categoryName, setCategoryName] = useState('')
  const [visibleColumns, setVisibleColumns] = useState<ProductColumn[]>(defaultColumns)
  const [editingProduct, setEditingProduct] = useState<ProductResponse | null>(null)
  const [deactivatingProduct, setDeactivatingProduct] = useState<ProductResponse | null>(null)
  const [form, setForm] = useState<ProductForm>(emptyForm)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const importInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/product-categories', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Không tải được nhóm hàng.')
        setCategories(await response.json() as ProductCategoryResponse[])
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted && cause instanceof Error) setError(cause.message)
      })

    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
    if (deferredSearch.trim()) params.set('search', deferredSearch.trim())
    if (categoryId) params.set('categoryId', categoryId)
    if (stockStatus) params.set('stockStatus', stockStatus)
    if (productTypeFilter) params.set('productType', productTypeFilter)
    if (supplierFilter.trim()) params.set('supplierName', supplierFilter.trim())
    if (locationFilter.trim()) params.set('location', locationFilter.trim())
    if (saleFilter) params.set('isDirectSale', saleFilter)
    if (channelFilter) params.set('isChannelLinked', channelFilter)
    if (createdFrom) params.set('createdFrom', createdFrom)
    if (createdTo) params.set('createdTo', createdTo)
    if (statusFilter) params.set('status', statusFilter)

    fetch(`/api/products?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          const detail = await response.json().catch(() => null) as { detail?: string } | null
          throw new Error(detail?.detail ?? 'Không tải được danh sách hàng hóa.')
        }
        const result = await response.json() as ProductListResponse
        setProducts(result.items)
        setTotalCount(result.totalCount)
        setError('')
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted && cause instanceof Error) setError(cause.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [categoryId, channelFilter, createdFrom, createdTo, deferredSearch, locationFilter, page, productTypeFilter, refreshVersion, saleFilter, statusFilter, stockStatus, supplierFilter])

  const openNewProductType = (productType: string) => {
    setEditingProduct(null)
    setForm({ ...emptyForm, productType })
    setError('')
    setFormOpen(true)
  }

  const openEditProduct = (product: ProductResponse) => {
    setEditingProduct(product)
    setForm({
      sku: product.sku,
      barcode: product.barcode ?? '',
      name: product.name,
      categoryId: product.categoryId ? String(product.categoryId) : '',
      unit: product.unit,
      productType: product.productType,
      supplierName: product.supplierName ?? '',
      location: product.location ?? '',
      isDirectSale: product.isDirectSale,
      isChannelLinked: product.isChannelLinked,
      costPrice: String(product.costPrice),
      salePrice: String(product.salePrice),
      stockQuantity: String(product.stockQuantity),
      minimumStock: String(product.minimumStock),
    })
    setError('')
    setFormOpen(true)
  }

  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      ...form,
      barcode: form.barcode.trim() || null,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      supplierName: form.supplierName.trim() || null,
      location: form.location.trim() || null,
      costPrice: Number(form.costPrice),
      salePrice: Number(form.salePrice),
      stockQuantity: Number(form.stockQuantity),
      minimumStock: Number(form.minimumStock),
    }

    try {
      const response = await fetch(editingProduct ? `/api/products/${editingProduct.id}` : '/api/products', {
        method: editingProduct ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const detail = await response.json().catch(() => null) as { title?: string; detail?: string } | null
        throw new Error(detail?.detail ?? detail?.title ?? 'Không thể lưu hàng hóa.')
      }

      setNotice(editingProduct ? 'Đã cập nhật hàng hóa.' : 'Đã thêm hàng hóa mới.')
      setFormOpen(false)
      setPage(1)
      setLoading(true)
      setRefreshVersion((version) => version + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể lưu hàng hóa.')
    } finally {
      setSaving(false)
    }
  }

  const createCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      const response = await fetch('/api/product-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: categoryName.trim() }),
      })
      if (!response.ok) throw new Error(await readError(response, 'Không thể tạo nhóm hàng.'))
      const category = await response.json() as ProductCategoryResponse
      setCategories((current) => [...current, category].sort((first, second) => first.name.localeCompare(second.name, 'vi')))
      setCategoryId(String(category.id))
      setCategoryName('')
      setCategoryDialogOpen(false)
      setPage(1)
      setNotice(`Đã tạo nhóm hàng ${category.name}.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể tạo nhóm hàng.')
    }
  }

  const deleteCategory = async (category: ProductCategoryResponse) => {
    try {
      const response = await fetch(`/api/product-categories/${category.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error(await readError(response, 'Không thể xóa nhóm hàng đang có sản phẩm.'))
      setCategories((current) => current.filter((item) => item.id !== category.id))
      if (categoryId === String(category.id)) setCategoryId('')
      setNotice(`Đã xóa nhóm hàng ${category.name}.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể xóa nhóm hàng.')
    }
  }

  const importProducts = async (file?: File) => {
    if (!file) return
    setError('')
    const data = new FormData()
    data.append('file', file)
    try {
      const response = await fetch('/api/products/import', { method: 'POST', body: data })
      if (!response.ok) throw new Error(await readError(response, 'Không thể nhập file hàng hóa.'))
      const result = await response.json() as { created: number; updated: number; failed: number }
      setNotice(`Đã nhập ${result.created} mới, cập nhật ${result.updated}, lỗi ${result.failed}.`)
      setLoading(true)
      setRefreshVersion((version) => version + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể nhập file hàng hóa.')
    } finally {
      if (importInput.current) importInput.current.value = ''
    }
  }

  const toggleColumn = (column: ProductColumn) => {
    setVisibleColumns((current) => current.includes(column)
      ? current.filter((value) => value !== column)
      : [...current, column])
  }

  const deactivateProduct = async () => {
    if (!deactivatingProduct) return
    setError('')

    try {
      const response = await fetch(`/api/products/${deactivatingProduct.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Không thể ngừng kinh doanh hàng hóa.')
      setNotice(`Đã ngừng kinh doanh ${deactivatingProduct.name}.`)
      setDeactivatingProduct(null)
      setLoading(true)
      setRefreshVersion((version) => version + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể ngừng kinh doanh hàng hóa.')
    }
  }

  const firstItem = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const lastItem = Math.min(page * pageSize, totalCount)
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))
  const activeColumns = columnDefinitions.filter((column) => visibleColumns.includes(column.key))

  const renderCell = (product: ProductResponse, column: ProductColumn) => {
    switch (column) {
      case 'sku': return <strong className="record-code">{product.sku}</strong>
      case 'barcode': return product.barcode || '—'
      case 'name': return <span className="product-name-cell"><strong>{product.name}</strong><small>{product.unit}</small></span>
      case 'category': return product.categoryName || 'Chưa phân nhóm'
      case 'productType': return product.productType === 'service' ? 'Dịch vụ' : product.productType === 'combo' ? 'Combo' : 'Hàng hóa'
      case 'costPrice': return <span className="product-price">{currency.format(product.costPrice)} ₫</span>
      case 'salePrice': return <span className="product-price">{currency.format(product.salePrice)} ₫</span>
      case 'stock': return <span className={product.stockQuantity <= product.minimumStock ? 'stock-badge low' : 'stock-badge'}>{product.stockQuantity} {product.unit}</span>
      case 'supplier': return product.supplierName || '—'
      case 'location': return product.location || '—'
      case 'createdAt': return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short' }).format(new Date(product.createdAt))
      case 'status': return <span className={`status-pill${product.isActive ? ' paid' : ' received'}`}>{product.isActive ? product.stockQuantity <= product.minimumStock ? 'Sắp hết' : 'Đang bán' : 'Ngừng bán'}</span>
    }
  }

  const resetFilters = () => {
    setCategoryId('')
    setStockStatus('')
    setProductTypeFilter('')
    setSupplierFilter('')
    setLocationFilter('')
    setSaleFilter('')
    setChannelFilter('')
    setCreatedFrom('')
    setCreatedTo('')
    setStatusFilter('')
    setPage(1)
    setLoading(true)
  }

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">QUẢN LÝ CỬA HÀNG</p>
          <h1>Danh sách hàng hóa</h1>
          <p className="page-subtitle">Quản lý danh mục, giá bán và số lượng hàng hóa.</p>
        </div>
        <div className="catalog-primary-actions">
          <div className="catalog-create-menu"><button className="primary-action" type="button" onClick={() => openNewProductType('goods')}><CirclePlus size={16} />Tạo mới</button><details className="catalog-create-dropdown"><summary className="primary-action create-menu-chevron" aria-label="Chọn loại hàng hóa">▾</summary><div><button type="button" onClick={() => openNewProductType('goods')}>Hàng hóa</button><button type="button" onClick={() => openNewProductType('service')}>Dịch vụ</button><button type="button" onClick={() => openNewProductType('combo')}>Combo</button></div></details></div>
          <button className="subtle-button" type="button" onClick={() => importInput.current?.click()}><Upload size={15} />Import file</button>
          <a className="subtle-button" href="/api/products/import-template" download><Download size={15} />Mẫu file</a>
          <a className="subtle-button" href="/api/products/export" download><Download size={15} />Xuất file</a>
          <input ref={importInput} className="sr-only" type="file" accept=".csv,text/csv" onChange={(event) => importProducts(event.target.files?.[0])} />
        </div>
      </section>

      {notice && <div className="module-notice" role="status">{notice}<button type="button" aria-label="Đóng thông báo" onClick={() => setNotice('')}>×</button></div>}
      {error && !formOpen && <div className="module-error" role="alert">{error}</div>}

      <section className="module-list-panel panel">
        <div className="list-panel-heading">
          <div><h2>Hàng hóa</h2><p>{totalCount} sản phẩm</p></div>
          <div className="catalog-heading-actions">
            <button className="subtle-button" type="button" onClick={() => setCategoryDialogOpen(true)}><CirclePlus size={14} />Tạo nhóm hàng</button>
            <span className="catalog-connection"><span />Kết nối dữ liệu</span>
          </div>
        </div>
        <div className="list-toolbar">
          <label className="list-search">
            <Search size={16} aria-hidden="true" />
            <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); setLoading(true) }} placeholder="Tìm theo mã, tên hoặc mã vạch..." aria-label="Tìm hàng hóa" />
          </label>
          <label className="filter-select">
            <span className="sr-only">Nhóm hàng</span>
            <select aria-label="Nhóm hàng" value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setPage(1); setLoading(true) }}><option value="">Tất cả nhóm hàng</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
          </label>
          <label className="filter-select"><span className="sr-only">Tiêu chí tồn kho</span><select aria-label="Tiêu chí tồn kho" value={stockStatus} onChange={(event) => { setStockStatus(event.target.value); setPage(1); setLoading(true) }}><option value="">Tất cả tồn kho</option><option value="out">Hết hàng</option><option value="low">Sắp hết hàng</option><option value="normal">Còn hàng</option></select></label>
          <details className="column-picker"><summary><Columns3 size={15} />Ẩn/hiện cột</summary><div>{columnDefinitions.map((column) => <label key={column.key}><input type="checkbox" checked={visibleColumns.includes(column.key)} onChange={() => toggleColumn(column.key)} />{column.label}</label>)}</div></details>
        </div>
        <details className="advanced-filters"><summary><SlidersHorizontal size={15} />Bộ lọc nâng cao</summary><div className="advanced-filter-grid">
          <label>Loại hàng<select value={productTypeFilter} onChange={(event) => { setProductTypeFilter(event.target.value); setPage(1); setLoading(true) }}><option value="">Tất cả loại hàng</option><option value="goods">Hàng hóa</option><option value="service">Dịch vụ</option><option value="combo">Combo</option></select></label>
          <label>Trạng thái<select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); setLoading(true) }}><option value="">Hàng đang kinh doanh</option><option value="active">Đang kinh doanh</option><option value="inactive">Ngừng kinh doanh</option></select></label>
          <label>Nhà cung cấp<input value={supplierFilter} onChange={(event) => { setSupplierFilter(event.target.value); setPage(1); setLoading(true) }} placeholder="Tìm nhà cung cấp" /></label>
          <label>Vị trí<input value={locationFilter} onChange={(event) => { setLocationFilter(event.target.value); setPage(1); setLoading(true) }} placeholder="Kho hoặc kệ hàng" /></label>
          <label>Bán trực tiếp<select value={saleFilter} onChange={(event) => { setSaleFilter(event.target.value); setPage(1); setLoading(true) }}><option value="">Tất cả</option><option value="true">Có</option><option value="false">Không</option></select></label>
          <label>Liên kết kênh bán<select value={channelFilter} onChange={(event) => { setChannelFilter(event.target.value); setPage(1); setLoading(true) }}><option value="">Tất cả</option><option value="true">Có</option><option value="false">Không</option></select></label>
          <label>Tạo từ<input type="date" value={createdFrom} onChange={(event) => { setCreatedFrom(event.target.value); setPage(1); setLoading(true) }} /></label>
          <label>Tạo đến<input type="date" value={createdTo} onChange={(event) => { setCreatedTo(event.target.value); setPage(1); setLoading(true) }} /></label>
          <button className="subtle-button reset-filters" type="button" onClick={resetFilters}>Xóa bộ lọc</button>
        </div></details>
        <div className="records-table-wrap">
          <table className="records-table product-table">
            <thead><tr>{activeColumns.map((column) => <th key={column.key}>{column.label.toLocaleUpperCase('vi')}</th>)}<th aria-label="Thao tác" /></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={activeColumns.length + 1} className="empty-cell">Đang tải dữ liệu...</td></tr>}
              {!loading && products.map((product) => (
                <tr key={product.id}>
                  {activeColumns.map((column) => <td key={column.key}>{renderCell(product, column.key)}</td>)}
                  <td><div className="product-row-actions"><button type="button" aria-label={`Sửa ${product.name}`} onClick={() => openEditProduct(product)}><Pencil size={15} /></button><button type="button" aria-label={`Ngừng bán ${product.name}`} onClick={() => setDeactivatingProduct(product)}><Ban size={15} /></button></div></td>
                </tr>
              ))}
              {!loading && products.length === 0 && <tr><td colSpan={activeColumns.length + 1} className="empty-cell">Chưa có hàng hóa phù hợp.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="list-pagination">
          <span>{firstItem}-{lastItem} trong {totalCount} sản phẩm</span>
          <div><button type="button" disabled={page <= 1} onClick={() => { setPage((value) => value - 1); setLoading(true) }}>Trước</button><button className="page-number" type="button">{page} / {pageCount}</button><button type="button" disabled={page >= pageCount} onClick={() => { setPage((value) => value + 1); setLoading(true) }}>Sau</button></div>
        </div>
      </section>

      {formOpen && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setFormOpen(false) }}>
          <section className="product-dialog" role="dialog" aria-modal="true" aria-labelledby="product-dialog-title">
            <header><div><h2 id="product-dialog-title">{editingProduct ? 'Sửa hàng hóa' : 'Thêm hàng hóa'}</h2><p>Thông tin được lưu vào danh mục cửa hàng.</p></div><button type="button" aria-label="Đóng" onClick={() => setFormOpen(false)}><X size={18} /></button></header>
            {error && <div className="module-error" role="alert">{error}</div>}
            <form onSubmit={saveProduct}>
              <div className="product-form-grid">
                <label>Mã hàng<input required maxLength={64} value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} /></label>
                <label>Mã vạch<input maxLength={64} value={form.barcode} onChange={(event) => setForm({ ...form, barcode: event.target.value })} /></label>
                <label className="form-wide">Tên hàng hóa<input required maxLength={200} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
                <label>Nhóm hàng<select value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}><option value="">Chưa phân nhóm</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
                <label>Đơn vị tính<input required maxLength={40} value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} /></label>
                <label>Loại hàng<select value={form.productType} onChange={(event) => setForm({ ...form, productType: event.target.value })}><option value="goods">Hàng hóa</option><option value="service">Dịch vụ</option><option value="combo">Combo</option></select></label>
                <label>Nhà cung cấp<input maxLength={160} value={form.supplierName} onChange={(event) => setForm({ ...form, supplierName: event.target.value })} /></label>
                <label>Vị trí<input maxLength={120} value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="Ví dụ: Kệ A1" /></label>
                <label className="toggle-field"><input type="checkbox" checked={form.isDirectSale} onChange={(event) => setForm({ ...form, isDirectSale: event.target.checked })} />Bán trực tiếp</label>
                <label className="toggle-field"><input type="checkbox" checked={form.isChannelLinked} onChange={(event) => setForm({ ...form, isChannelLinked: event.target.checked })} />Liên kết kênh bán</label>
                <label>Giá vốn<input type="number" min="0" step="0.01" value={form.costPrice} onChange={(event) => setForm({ ...form, costPrice: event.target.value })} /></label>
                <label>Giá bán<input type="number" min="0" step="0.01" value={form.salePrice} onChange={(event) => setForm({ ...form, salePrice: event.target.value })} /></label>
                <label>Tồn kho<input type="number" min="0" step="0.001" value={form.stockQuantity} onChange={(event) => setForm({ ...form, stockQuantity: event.target.value })} /></label>
                <label>Định mức tồn tối thiểu<input type="number" min="0" step="0.001" value={form.minimumStock} onChange={(event) => setForm({ ...form, minimumStock: event.target.value })} /></label>
              </div>
              <footer><button className="subtle-button" type="button" onClick={() => setFormOpen(false)}>Hủy</button><button className="primary-action" type="submit" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu hàng hóa'}</button></footer>
            </form>
          </section>
        </div>
      )}

      {categoryDialogOpen && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCategoryDialogOpen(false) }}><section className="confirm-dialog category-dialog" role="dialog" aria-modal="true" aria-labelledby="category-dialog-title"><header><h2 id="category-dialog-title">Quản lý nhóm hàng</h2><button className="dialog-close" type="button" aria-label="Đóng" onClick={() => setCategoryDialogOpen(false)}><X size={18} /></button></header><form onSubmit={createCategory}><label className="dialog-label">Tên nhóm hàng<input required maxLength={120} value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Tạo nhóm hàng mới" /></label><footer><button className="primary-action" type="submit">Tạo nhóm</button></footer></form><div className="category-list">{categories.map((category) => <div key={category.id}><span>{category.name}</span><button className="category-delete" type="button" onClick={() => deleteCategory(category)} aria-label={`Xóa nhóm ${category.name}`}>Xóa</button></div>)}</div></section></div>}

      {deactivatingProduct && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeactivatingProduct(null) }}>
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="deactivate-title">
            <h2 id="deactivate-title">Ngừng kinh doanh hàng hóa?</h2>
            <p>{deactivatingProduct.name} sẽ được ẩn khỏi danh sách bán hàng. Lịch sử giao dịch được giữ nguyên.</p>
            <footer><button className="subtle-button" type="button" onClick={() => setDeactivatingProduct(null)}>Hủy</button><button className="primary-action" type="button" onClick={deactivateProduct}>Ngừng bán</button></footer>
          </section>
        </div>
      )}
    </>
  )
}
