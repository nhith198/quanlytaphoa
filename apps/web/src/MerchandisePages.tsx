import { useEffect, useState, type FormEvent } from 'react'
import { CirclePlus, ClipboardCheck, Search, X } from 'lucide-react'
import type { ProductResponse } from './productTypes'

type PageKind = 'price-books' | 'stock-takes' | 'internal-use' | 'damaged-stock'

type PriceBook = {
  id: number
  name: string
  isActive: boolean
  startsOn: string | null
  endsOn: string | null
  itemCount: number
  createdAt: string
}

type PriceBookItem = {
  productId: number
  sku: string
  name: string
  unit: string
  defaultSalePrice: number
  price: number | null
}

type StockTake = {
  id: number
  code: string
  status: string
  note: string | null
  itemCount: number
  totalDifference: number
  createdAt: string
  confirmedAt: string | null
}

type InventoryVoucher = {
  id: number
  code: string
  type: 'internal_use' | 'damaged'
  status: string
  note: string | null
  itemCount: number
  totalQuantity: number
  createdAt: string
  confirmedAt: string | null
}

type ProductList = { items: ProductResponse[]; totalCount: number }
type NoticeState = { kind: 'success' | 'error'; message: string }

const money = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 })
const dateTime = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' })

async function readError(response: Response, fallback: string): Promise<string> {
  const problem = await response.json().catch(() => null) as { title?: string; detail?: string } | null
  return problem?.detail ?? problem?.title ?? fallback
}

async function fetchProducts(signal?: AbortSignal): Promise<ProductResponse[]> {
  const response = await fetch('/api/products?page=1&pageSize=100', { signal })
  if (!response.ok) throw new Error(await readError(response, 'Không tải được danh sách hàng hóa.'))
  return (await response.json() as ProductList).items
}

function PageHeading({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <section className="page-heading">
      <div><p className="eyebrow">QUẢN LÝ HÀNG HÓA & KHO</p><h1>{title}</h1><p className="page-subtitle">{description}</p></div>
      {action}
    </section>
  )
}

function Notice({ notice, onClose }: { notice: NoticeState | null; onClose: () => void }) {
  if (!notice) return null
  return <div className={`module-notice${notice.kind === 'error' ? ' notice-error' : ''}`} role={notice.kind === 'error' ? 'alert' : 'status'}>{notice.message}<button type="button" aria-label="Đóng thông báo" onClick={onClose}>×</button></div>
}

function PriceBooksPage() {
  const [books, setBooks] = useState<PriceBook[]>([])
  const [products, setProducts] = useState<PriceBookItem[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [name, setName] = useState('')
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [booksLoading, setBooksLoading] = useState(true)
  const [itemsLoading, setItemsLoading] = useState(true)
  const [notice, setNotice] = useState<NoticeState | null>(null)
  const loading = booksLoading || itemsLoading

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/price-books', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(await readError(response, 'Không tải được bảng giá.'))
        return await response.json() as PriceBook[]
      })
      .then((result) => {
        setBooks(result)
        if (result.length > 0) setSelectedId((current) => current || String(result[0].id))
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setNotice({ kind: 'error', message: cause instanceof Error ? cause.message : 'Không tải được bảng giá.' })
      })
      .finally(() => {
        if (!controller.signal.aborted) setBooksLoading(false)
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!selectedId) return
    const controller = new AbortController()
    fetch(`/api/price-books/${selectedId}/items`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(await readError(response, 'Không tải được giá theo sản phẩm.'))
        const result = await response.json() as PriceBookItem[]
        setProducts(result)
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setNotice({ kind: 'error', message: cause instanceof Error ? cause.message : 'Không tải được giá theo sản phẩm.' })
      })
      .finally(() => {
        if (!controller.signal.aborted) setItemsLoading(false)
      })
    return () => controller.abort()
  }, [selectedId])

  const createBook = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    try {
      const response = await fetch('/api/price-books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (!response.ok) throw new Error(await readError(response, 'Không thể tạo bảng giá.'))
      const created = await response.json() as PriceBook
      setName('')
      setCreating(false)
      setItemsLoading(true)
      setSelectedId(String(created.id))
      setBooks((current) => [created, ...current])
      setNotice({ kind: 'success', message: `Đã tạo bảng giá ${created.name}.` })
    } catch (cause) {
      setNotice({ kind: 'error', message: cause instanceof Error ? cause.message : 'Không thể tạo bảng giá.' })
    } finally {
      setSaving(false)
    }
  }

  const savePrices = async () => {
    if (!selectedId || products.length === 0) return
    setSaving(true)
    try {
      const response = await fetch(`/api/price-books/${selectedId}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: products.map((product) => ({ productId: product.productId, price: product.price ?? product.defaultSalePrice })) }),
      })
      if (!response.ok) throw new Error(await readError(response, 'Không thể lưu giá.'))
      setBooks((current) => current.map((book) => book.id === Number(selectedId) ? { ...book, itemCount: products.length } : book))
      setNotice({ kind: 'success', message: 'Đã lưu giá cho các sản phẩm.' })
    } catch (cause) {
      setNotice({ kind: 'error', message: cause instanceof Error ? cause.message : 'Không thể lưu giá.' })
    } finally {
      setSaving(false)
    }
  }

  const setActive = async (book: PriceBook) => {
    try {
      const response = await fetch(`/api/price-books/${book.id}/active`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !book.isActive }),
      })
      if (!response.ok) throw new Error(await readError(response, 'Không thể cập nhật trạng thái bảng giá.'))
      const updated = await response.json() as PriceBook
      setBooks((current) => current.map((item) => item.id === book.id ? updated : item))
      setNotice({ kind: 'success', message: updated.isActive ? 'Đã bật bảng giá.' : 'Đã tắt bảng giá.' })
    } catch (cause) {
      setNotice({ kind: 'error', message: cause instanceof Error ? cause.message : 'Không thể cập nhật bảng giá.' })
    }
  }

  const filteredProducts = products.filter((product) => `${product.sku} ${product.name}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')))
  const selectedBook = books.find((book) => String(book.id) === selectedId)

  return (
    <>
      <PageHeading title="Thiết lập giá" description="Tạo bảng giá và thiết lập giá bán riêng cho từng sản phẩm."
        action={<button className="primary-action" type="button" onClick={() => setCreating(true)}><CirclePlus size={16} />Tạo bảng giá</button>} />
      <Notice notice={notice} onClose={() => setNotice(null)} />
      <section className="merchandise-grid pricebook-grid">
        <article className="panel merchandise-sidebar">
          <div className="merchandise-panel-heading"><div><h2>Bảng giá</h2><p>{books.length} bảng giá</p></div></div>
          {loading && books.length === 0 && <p className="merchandise-empty">Đang tải bảng giá...</p>}
          {books.map((book) => (
            <button type="button" key={book.id} className={`pricebook-option${String(book.id) === selectedId ? ' selected' : ''}`} onClick={() => { if (String(book.id) !== selectedId) { setItemsLoading(true); setSelectedId(String(book.id)) } }}>
              <span><strong>{book.name}</strong><small>{book.itemCount} sản phẩm · {book.isActive ? 'Đang áp dụng' : 'Đang tắt'}</small></span>
              <span className={`status-pill${book.isActive ? ' paid' : ''}`}>{book.isActive ? 'Bật' : 'Tắt'}</span>
            </button>
          ))}
          {!loading && books.length === 0 && <p className="merchandise-empty">Chưa có bảng giá. Tạo bảng đầu tiên để bắt đầu.</p>}
        </article>

        <article className="panel merchandise-main">
          <div className="merchandise-panel-heading">
            <div><h2>{selectedBook?.name ?? 'Giá theo sản phẩm'}</h2><p>{selectedBook ? `${products.length} sản phẩm trong danh mục` : 'Chọn hoặc tạo một bảng giá để thiết lập giá.'}</p></div>
            {selectedBook && <button className="subtle-button" type="button" onClick={() => setActive(selectedBook)}>{selectedBook.isActive ? 'Tắt bảng giá' : 'Bật bảng giá'}</button>}
          </div>
          {selectedBook && <div className="list-toolbar"><label className="list-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mã hoặc tên sản phẩm..." /></label><button className="primary-action" type="button" disabled={saving || loading || products.length === 0} onClick={savePrices}>{saving ? 'Đang lưu...' : 'Lưu giá'}</button></div>}
          {selectedBook && <div className="records-table-wrap"><table className="records-table merchandise-table"><thead><tr><th>MÃ HÀNG</th><th>TÊN HÀNG</th><th>GIÁ BÁN CHUNG</th><th>GIÁ TRONG BẢNG</th></tr></thead><tbody>
            {filteredProducts.map((product) => <tr key={product.productId}><td><strong className="record-code">{product.sku}</strong></td><td>{product.name}<small className="cell-subtext">{product.unit}</small></td><td>{money.format(product.defaultSalePrice)} ₫</td><td><label className="price-input"><input aria-label={`Giá ${product.name}`} type="number" min="0" step="0.01" value={product.price ?? product.defaultSalePrice} onChange={(event) => setProducts((current) => current.map((item) => item.productId === product.productId ? { ...item, price: event.target.value === '' ? null : Number(event.target.value) } : item))} />₫</label></td></tr>)}
            {!loading && filteredProducts.length === 0 && <tr><td className="empty-cell" colSpan={4}>Chưa có sản phẩm trong bảng giá.</td></tr>}
            {loading && <tr><td className="empty-cell" colSpan={4}>Đang tải...</td></tr>}
          </tbody></table></div>}
        </article>
      </section>

      {creating && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreating(false) }}><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="pricebook-title"><header><h2 id="pricebook-title">Tạo bảng giá</h2><button className="dialog-close" type="button" aria-label="Đóng" onClick={() => setCreating(false)}><X size={18} /></button></header><form onSubmit={createBook}><label className="dialog-label">Tên bảng giá<input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ví dụ: Giá khách sỉ" /></label><footer><button className="subtle-button" type="button" onClick={() => setCreating(false)}>Hủy</button><button className="primary-action" type="submit" disabled={saving}>{saving ? 'Đang tạo...' : 'Tạo bảng giá'}</button></footer></form></section></div>}
    </>
  )
}

function useProductsAndPageData<T>(url: string, defaultValue: T) {
  const [items, setItems] = useState<T>(defaultValue)
  const [products, setProducts] = useState<ProductResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<NoticeState | null>(null)
  const [refreshVersion, setRefreshVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([fetch(url, { signal: controller.signal }), fetchProducts(controller.signal)])
      .then(async ([response, productList]) => {
        if (!response.ok) throw new Error(await readError(response, 'Không tải được chứng từ.'))
        setItems(await response.json() as T)
        setProducts(productList)
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setNotice({ kind: 'error', message: cause instanceof Error ? cause.message : 'Không tải được chứng từ.' })
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [url, refreshVersion])

  const refresh = () => {
    setLoading(true)
    setRefreshVersion((version) => version + 1)
  }

  return { items, setItems, products, loading, notice, setNotice, refresh }
}

function StockTakePage() {
  const { items, products, loading, notice, setNotice, refresh } = useProductsAndPageData<StockTake[]>('/api/stock-takes', [])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [note, setNote] = useState('')
  const [counts, setCounts] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const startStockTake = () => {
    setCounts(Object.fromEntries(products.map((product) => [product.id, String(product.stockQuantity)])))
    setNote('')
    setDialogOpen(true)
  }

  const createStockTake = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    try {
      const response = await fetch('/api/stock-takes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note, items: products.map((product) => ({ productId: product.id, countedQuantity: Number(counts[product.id] ?? product.stockQuantity) })) }),
      })
      if (!response.ok) throw new Error(await readError(response, 'Không thể tạo phiếu kiểm kho.'))
      setNotice({ kind: 'success', message: 'Đã tạo phiếu kiểm kho nháp.' })
      setDialogOpen(false)
      refresh()
    } catch (cause) {
      setNotice({ kind: 'error', message: cause instanceof Error ? cause.message : 'Không thể tạo phiếu kiểm kho.' })
    } finally {
      setSaving(false)
    }
  }

  const confirmStockTake = async (take: StockTake) => {
    try {
      const response = await fetch(`/api/stock-takes/${take.id}/confirm`, { method: 'POST' })
      if (!response.ok) throw new Error(await readError(response, 'Không thể chốt phiếu kiểm kho.'))
      setNotice({ kind: 'success', message: `Đã chốt ${take.code}; tồn kho đã được cập nhật.` })
      refresh()
    } catch (cause) {
      setNotice({ kind: 'error', message: cause instanceof Error ? cause.message : 'Không thể chốt phiếu kiểm kho.' })
    }
  }

  const filteredProducts = products.filter((product) => `${product.sku} ${product.name}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')))

  return (
    <>
      <PageHeading title="Kiểm kho" description="Đếm thực tế, đối chiếu tồn hệ thống và chốt chênh lệch."
        action={<button className="primary-action" type="button" disabled={products.length === 0} onClick={startStockTake}><ClipboardCheck size={16} />Tạo phiếu kiểm kho</button>} />
      <Notice notice={notice} onClose={() => setNotice(null)} />
      <section className="panel merchandise-panel">
        <div className="merchandise-panel-heading"><div><h2>Phiếu kiểm kho</h2><p>{items.length} phiếu · {products.length} sản phẩm đang bán</p></div><button className="subtle-button" type="button" onClick={refresh}>Làm mới</button></div>
        <div className="records-table-wrap"><table className="records-table merchandise-table"><thead><tr><th>MÃ PHIẾU</th><th>NGÀY TẠO</th><th>SẢN PHẨM</th><th>CHÊNH LỆCH</th><th>GHI CHÚ</th><th>TRẠNG THÁI</th><th /></tr></thead><tbody>
          {items.map((take) => <tr key={take.id}><td><strong className="record-code">{take.code}</strong></td><td>{dateTime.format(new Date(take.createdAt))}</td><td>{take.itemCount}</td><td>{take.totalDifference > 0 ? '+' : ''}{take.totalDifference}</td><td>{take.note || '—'}</td><td><StatusPill status={take.status} /></td><td>{take.status === 'draft' && <button className="subtle-button action-small" type="button" onClick={() => confirmStockTake(take)}>Chốt phiếu</button>}</td></tr>)}
          {!loading && items.length === 0 && <tr><td className="empty-cell" colSpan={7}>Chưa có phiếu kiểm kho.</td></tr>}
          {loading && <tr><td className="empty-cell" colSpan={7}>Đang tải...</td></tr>}
        </tbody></table></div>
      </section>

      {dialogOpen && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialogOpen(false) }}><section className="product-dialog stock-count-dialog" role="dialog" aria-modal="true" aria-labelledby="stocktake-title"><header><div><h2 id="stocktake-title">Tạo phiếu kiểm kho</h2><p>Nhập số lượng thực tế cho từng sản phẩm.</p></div><button type="button" aria-label="Đóng" onClick={() => setDialogOpen(false)}><X size={18} /></button></header><form onSubmit={createStockTake}><label className="dialog-label">Ghi chú<input maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Lý do hoặc ghi chú kiểm kho" /></label><label className="list-search stock-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm sản phẩm..." /></label><div className="stock-count-list">{filteredProducts.map((product) => <label className="stock-count-row" key={product.id}><span><strong>{product.name}</strong><small>{product.sku} · Tồn hệ thống: {product.stockQuantity} {product.unit}</small></span><input aria-label={`Số lượng thực tế ${product.name}`} type="number" min="0" step="0.001" required value={counts[product.id] ?? String(product.stockQuantity)} onChange={(event) => setCounts((current) => ({ ...current, [product.id]: event.target.value }))} /></label>)}</div><footer><button className="subtle-button" type="button" onClick={() => setDialogOpen(false)}>Hủy</button><button className="primary-action" type="submit" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu phiếu nháp'}</button></footer></form></section></div>}
    </>
  )
}

function InventoryVoucherPage({ type }: { type: 'internal_use' | 'damaged' }) {
  const title = type === 'internal_use' ? 'Xuất dùng nội bộ' : 'Xuất hủy'
  const { items, products, loading, notice, setNotice, refresh } = useProductsAndPageData<InventoryVoucher[]>(`/api/inventory-vouchers?type=${type}`, [])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [note, setNote] = useState('')
  const [quantities, setQuantities] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const openDialog = () => {
    setQuantities(Object.fromEntries(products.map((product) => [product.id, '0'])))
    setNote('')
    setDialogOpen(true)
  }

  const createVoucher = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const selectedItems = products.filter((product) => Number(quantities[product.id] ?? 0) > 0).map((product) => ({ productId: product.id, quantity: Number(quantities[product.id]) }))
    if (selectedItems.length === 0) {
      setNotice({ kind: 'error', message: 'Nhập số lượng cho ít nhất một sản phẩm.' })
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/inventory-vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, note, items: selectedItems }),
      })
      if (!response.ok) throw new Error(await readError(response, 'Không thể tạo phiếu xuất.'))
      setDialogOpen(false)
      setNotice({ kind: 'success', message: 'Đã tạo phiếu nháp. Tồn kho chỉ thay đổi sau khi chốt phiếu.' })
      refresh()
    } catch (cause) {
      setNotice({ kind: 'error', message: cause instanceof Error ? cause.message : 'Không thể tạo phiếu xuất.' })
    } finally {
      setSaving(false)
    }
  }

  const confirmVoucher = async (voucher: InventoryVoucher) => {
    try {
      const response = await fetch(`/api/inventory-vouchers/${voucher.id}/confirm`, { method: 'POST' })
      if (!response.ok) throw new Error(await readError(response, 'Không thể chốt phiếu xuất.'))
      setNotice({ kind: 'success', message: `Đã chốt ${voucher.code}; tồn kho đã giảm.` })
      refresh()
    } catch (cause) {
      setNotice({ kind: 'error', message: cause instanceof Error ? cause.message : 'Không thể chốt phiếu xuất.' })
    }
  }

  const filteredProducts = products.filter((product) => `${product.sku} ${product.name}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')))

  return (
    <>
      <PageHeading title={title} description={type === 'internal_use' ? 'Ghi nhận hàng xuất sử dụng trong cửa hàng.' : 'Ghi nhận hàng hỏng, hết hạn hoặc cần loại khỏi tồn kho.'}
        action={<button className="primary-action" type="button" disabled={products.length === 0} onClick={openDialog}><CirclePlus size={16} />Tạo phiếu</button>} />
      <Notice notice={notice} onClose={() => setNotice(null)} />
      <section className="panel merchandise-panel">
        <div className="merchandise-panel-heading"><div><h2>Phiếu {type === 'internal_use' ? 'xuất dùng' : 'xuất hủy'}</h2><p>{items.length} phiếu</p></div><button className="subtle-button" type="button" onClick={refresh}>Làm mới</button></div>
        <div className="records-table-wrap"><table className="records-table merchandise-table"><thead><tr><th>MÃ PHIẾU</th><th>NGÀY TẠO</th><th>SẢN PHẨM</th><th>TỔNG SỐ LƯỢNG</th><th>GHI CHÚ</th><th>TRẠNG THÁI</th><th /></tr></thead><tbody>
          {items.map((voucher) => <tr key={voucher.id}><td><strong className="record-code">{voucher.code}</strong></td><td>{dateTime.format(new Date(voucher.createdAt))}</td><td>{voucher.itemCount}</td><td>{voucher.totalQuantity}</td><td>{voucher.note || '—'}</td><td><StatusPill status={voucher.status} /></td><td>{voucher.status === 'draft' && <button className="subtle-button action-small" type="button" onClick={() => confirmVoucher(voucher)}>Chốt phiếu</button>}</td></tr>)}
          {!loading && items.length === 0 && <tr><td className="empty-cell" colSpan={7}>Chưa có phiếu.</td></tr>}
          {loading && <tr><td className="empty-cell" colSpan={7}>Đang tải...</td></tr>}
        </tbody></table></div>
      </section>

      {dialogOpen && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialogOpen(false) }}><section className="product-dialog stock-count-dialog" role="dialog" aria-modal="true" aria-labelledby="voucher-title"><header><div><h2 id="voucher-title">{title}</h2><p>Phiếu nháp chưa làm thay đổi tồn kho.</p></div><button type="button" aria-label="Đóng" onClick={() => setDialogOpen(false)}><X size={18} /></button></header><form onSubmit={createVoucher}><label className="dialog-label">Ghi chú<input maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Lý do xuất dùng/xuất hủy" /></label><label className="list-search stock-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm sản phẩm..." /></label><div className="stock-count-list">{filteredProducts.map((product) => <label className="stock-count-row" key={product.id}><span><strong>{product.name}</strong><small>{product.sku} · Tồn: {product.stockQuantity} {product.unit}</small></span><input aria-label={`Số lượng ${product.name}`} type="number" min="0" max={product.stockQuantity} step="0.001" value={quantities[product.id] ?? '0'} onChange={(event) => setQuantities((current) => ({ ...current, [product.id]: event.target.value }))} /></label>)}</div><footer><button className="subtle-button" type="button" onClick={() => setDialogOpen(false)}>Hủy</button><button className="primary-action" type="submit" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu phiếu nháp'}</button></footer></form></section></div>}
    </>
  )
}

function StatusPill({ status }: { status: string }) {
  return <span className={`status-pill${status === 'confirmed' ? ' paid' : ' received'}`}>{status === 'confirmed' ? 'Đã chốt' : 'Phiếu nháp'}</span>
}

export default function MerchandisePage({ path }: { path: PageKind }) {
  if (path === 'price-books') return <PriceBooksPage />
  if (path === 'stock-takes') return <StockTakePage />
  if (path === 'internal-use') return <InventoryVoucherPage type="internal_use" />
  return <InventoryVoucherPage type="damaged" />
}
