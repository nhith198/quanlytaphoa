export type ProductResponse = {
  id: number
  sku: string
  barcode: string | null
  name: string
  categoryId: number | null
  categoryName: string | null
  unit: string
  costPrice: number
  salePrice: number
  stockQuantity: number
  minimumStock: number
  productType: string
  supplierName: string | null
  location: string | null
  isDirectSale: boolean
  isChannelLinked: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type ProductCategoryResponse = {
  id: number
  name: string
}
