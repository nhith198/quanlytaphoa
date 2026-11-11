using System.ComponentModel.DataAnnotations;

namespace api.Contracts;

/// <summary>Data for creating or updating a product.</summary>
public sealed record SaveProductRequest
{
    [Required, StringLength(64)]
    public required string Sku { get; init; }

    [StringLength(64)]
    public string? Barcode { get; init; }

    [Required, StringLength(200)]
    public required string Name { get; init; }

    public long? CategoryId { get; init; }

    [Required, StringLength(40)]
    public required string Unit { get; init; }

    [Required, StringLength(24)]
    public string ProductType { get; init; } = "goods";

    [StringLength(160)]
    public string? SupplierName { get; init; }

    [StringLength(120)]
    public string? Location { get; init; }

    public bool IsDirectSale { get; init; } = true;

    public bool IsChannelLinked { get; init; }

    [Range(typeof(decimal), "0", "999999999999")]
    public decimal CostPrice { get; init; }

    [Range(typeof(decimal), "0", "999999999999")]
    public decimal SalePrice { get; init; }

    [Range(typeof(decimal), "0", "999999999999")]
    public decimal StockQuantity { get; init; }

    [Range(typeof(decimal), "0", "999999999999")]
    public decimal MinimumStock { get; init; }
}

/// <summary>A product and its current catalog and stock values.</summary>
public sealed record ProductResponse(
    long Id,
    string Sku,
    string? Barcode,
    string Name,
    long? CategoryId,
    string? CategoryName,
    string Unit,
    decimal CostPrice,
    decimal SalePrice,
    decimal StockQuantity,
    decimal MinimumStock,
    string ProductType,
    string? SupplierName,
    string? Location,
    bool IsDirectSale,
    bool IsChannelLinked,
    bool IsActive,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

/// <summary>A paged collection of products.</summary>
public sealed record ProductListResponse(
    IReadOnlyList<ProductResponse> Items,
    int Page,
    int PageSize,
    int TotalCount);

/// <summary>A product category available in the catalog.</summary>
public sealed record ProductCategoryResponse(long Id, string Name);

/// <summary>Payload for creating a product category.</summary>
public sealed record CreateProductCategoryRequest
{
    [Required, StringLength(120)]
    public required string Name { get; init; }
}

/// <summary>Summary returned after importing a product CSV.</summary>
public sealed record ProductImportResultResponse(int Created, int Updated, int Failed);
