using System.ComponentModel.DataAnnotations;

namespace api.Contracts;

/// <summary>Payload for creating a price book.</summary>
public sealed record CreatePriceBookRequest
{
    [Required, StringLength(120)]
    public required string Name { get; init; }

    public DateOnly? StartsOn { get; init; }

    public DateOnly? EndsOn { get; init; }
}

/// <summary>A configured price book.</summary>
public sealed record PriceBookResponse(
    long Id,
    string Name,
    bool IsActive,
    DateOnly? StartsOn,
    DateOnly? EndsOn,
    int ItemCount,
    DateTimeOffset CreatedAt);

/// <summary>Activation state for a price book.</summary>
public sealed record SetPriceBookActiveRequest(bool IsActive);

/// <summary>A product's default and price-book-specific price.</summary>
public sealed record PriceBookItemResponse(
    long ProductId,
    string Sku,
    string Name,
    string Unit,
    decimal DefaultSalePrice,
    decimal? Price);

/// <summary>Price for one product in a price book.</summary>
public sealed record SavePriceBookItemRequest
{
    [Range(1, long.MaxValue)]
    public long ProductId { get; init; }

    [Range(typeof(decimal), "0", "999999999999")]
    public decimal Price { get; init; }
}

/// <summary>Bulk price updates for one price book.</summary>
public sealed record SavePriceBookItemsRequest
{
    [Required, MinLength(1)]
    public required IReadOnlyList<SavePriceBookItemRequest> Items { get; init; }
}

/// <summary>One product count submitted for a stock take.</summary>
public sealed record StockTakeItemRequest
{
    [Range(1, long.MaxValue)]
    public long ProductId { get; init; }

    [Range(typeof(decimal), "0", "999999999999")]
    public decimal CountedQuantity { get; init; }
}

/// <summary>Payload for opening a stock take draft.</summary>
public sealed record CreateStockTakeRequest
{
    [StringLength(500)]
    public string? Note { get; init; }

    [Required, MinLength(1)]
    public required IReadOnlyList<StockTakeItemRequest> Items { get; init; }
}

/// <summary>A stock take summary.</summary>
public sealed record StockTakeResponse(
    long Id,
    string Code,
    string Status,
    string? Note,
    int ItemCount,
    decimal TotalDifference,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ConfirmedAt);

/// <summary>One expected and counted quantity in a stock take.</summary>
public sealed record StockTakeLineResponse(
    long ProductId,
    string Sku,
    string Name,
    string Unit,
    decimal ExpectedQuantity,
    decimal CountedQuantity,
    decimal Difference);

/// <summary>A stock take with its item lines.</summary>
public sealed record StockTakeDetailResponse(
    StockTakeResponse StockTake,
    IReadOnlyList<StockTakeLineResponse> Items);

/// <summary>One product and quantity for a stock-out voucher.</summary>
public sealed record InventoryVoucherItemRequest
{
    [Range(1, long.MaxValue)]
    public long ProductId { get; init; }

    [Range(typeof(decimal), "0.001", "999999999999")]
    public decimal Quantity { get; init; }
}

/// <summary>Payload for an internal-use or damaged-stock voucher.</summary>
public sealed record CreateInventoryVoucherRequest
{
    [Required, StringLength(32)]
    public required string Type { get; init; }

    [StringLength(500)]
    public string? Note { get; init; }

    [Required, MinLength(1)]
    public required IReadOnlyList<InventoryVoucherItemRequest> Items { get; init; }
}

/// <summary>A stock-out voucher summary.</summary>
public sealed record InventoryVoucherResponse(
    long Id,
    string Code,
    string Type,
    string Status,
    string? Note,
    int ItemCount,
    decimal TotalQuantity,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ConfirmedAt);
