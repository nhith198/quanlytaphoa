using api.Contracts;
using api.Data;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;

namespace api.Endpoints;

public static class ProductEndpoints
{
    public static void MapProductEndpoints(this WebApplication app)
    {
        var products = app.MapGroup("/api/products").WithTags("Products");

        products.MapGet("/", GetProducts)
            .WithName("GetProducts")
            .WithSummary("Searches and pages through products.");

        products.MapGet("/{id:long}", GetProductById)
            .WithName("GetProductById")
            .WithSummary("Gets one product by ID.");

        products.MapPost("/", CreateProduct)
            .WithName("CreateProduct")
            .WithSummary("Creates a product.");

        products.MapPut("/{id:long}", UpdateProduct)
            .WithName("UpdateProduct")
            .WithSummary("Updates a product.");

        products.MapDelete("/{id:long}", DeactivateProduct)
            .WithName("DeactivateProduct")
            .WithSummary("Marks a product as inactive without deleting history.");

        app.MapGet("/api/product-categories", GetCategories)
            .WithName("GetProductCategories")
            .WithSummary("Lists product categories.");
    }

    private static async Task<Results<Ok<ProductListResponse>, ProblemHttpResult>> GetProducts(
        string? search,
        long? categoryId,
        string? stockStatus,
        string? productType,
        string? supplierName,
        string? location,
        bool? isDirectSale,
        bool? isChannelLinked,
        DateOnly? createdFrom,
        DateOnly? createdTo,
        string? status,
        int? page,
        int? pageSize,
        bool? includeInactive,
        StoreDatabase database,
        CancellationToken cancellationToken)
    {
        if (!database.IsConfigured)
        {
            return DatabaseUnavailable<ProductListResponse>();
        }

        var currentPage = Math.Max(page ?? 1, 1);
        var currentPageSize = Math.Clamp(pageSize ?? 20, 1, 100);
        var offset = (currentPage - 1) * currentPageSize;
        var searchPattern = string.IsNullOrWhiteSpace(search) ? null : $"%{search.Trim()}%";
        var normalizedStockStatus = string.IsNullOrWhiteSpace(stockStatus) ? null : stockStatus.Trim().ToLowerInvariant();
        var normalizedProductType = string.IsNullOrWhiteSpace(productType) ? null : productType.Trim().ToLowerInvariant();
        var supplierPattern = string.IsNullOrWhiteSpace(supplierName) ? null : $"%{supplierName.Trim()}%";
        var locationPattern = string.IsNullOrWhiteSpace(location) ? null : $"%{location.Trim()}%";
        var normalizedStatus = string.IsNullOrWhiteSpace(status) ? null : status.Trim().ToLowerInvariant();
        if (normalizedStatus is not null && normalizedStatus is not ("active" or "inactive"))
            return TypedResults.Problem("status chỉ nhận active hoặc inactive.", statusCode: StatusCodes.Status400BadRequest);
        if (normalizedStockStatus is not null && normalizedStockStatus is not ("out" or "low" or "normal"))
            return TypedResults.Problem("stockStatus chỉ nhận out, low hoặc normal.", statusCode: StatusCodes.Status400BadRequest);
        if (normalizedProductType is not null && normalizedProductType is not ("goods" or "service" or "combo"))
            return TypedResults.Problem("productType chỉ nhận goods, service hoặc combo.", statusCode: StatusCodes.Status400BadRequest);
        if (createdFrom.HasValue && createdTo.HasValue && createdFrom > createdTo)
            return TypedResults.Problem("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.", statusCode: StatusCodes.Status400BadRequest);
        var createdFromValue = createdFrom?.ToDateTime(TimeOnly.MinValue);
        var createdToExclusive = createdTo?.AddDays(1).ToDateTime(TimeOnly.MinValue);

        await using var connection = database.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var countCommand = connection.CreateCommand();
        countCommand.CommandText = """
            SELECT COUNT(*)
            FROM products p
                 WHERE ((@status IS NULL AND (@includeInactive = 1 OR p.is_active = 1))
                     OR (@status = 'active' AND p.is_active = 1)
                     OR (@status = 'inactive' AND p.is_active = 0))
                            AND (@categoryId IS NULL OR p.category_id = @categoryId)
                            AND (@productType IS NULL OR p.product_type = @productType)
                            AND (@supplierName IS NULL OR p.supplier_name LIKE @supplierName)
                            AND (@location IS NULL OR p.location LIKE @location)
                            AND (@isDirectSale IS NULL OR p.is_direct_sale = @isDirectSale)
                            AND (@isChannelLinked IS NULL OR p.is_channel_linked = @isChannelLinked)
                            AND (@createdFrom IS NULL OR p.created_at >= @createdFrom)
                            AND (@createdTo IS NULL OR p.created_at < @createdTo)
                            AND (@stockStatus IS NULL
                                     OR (@stockStatus = 'out' AND p.stock_quantity = 0)
                                     OR (@stockStatus = 'low' AND p.stock_quantity > 0 AND p.stock_quantity <= p.minimum_stock)
                                     OR (@stockStatus = 'normal' AND p.stock_quantity > p.minimum_stock))
              AND (@search IS NULL OR p.sku LIKE @search OR p.name LIKE @search OR p.barcode LIKE @search)
            """;
        countCommand.Parameters.AddWithValue("@includeInactive", includeInactive == true);
                AddProductFilters(countCommand, categoryId, normalizedStockStatus, normalizedProductType, supplierPattern, locationPattern, isDirectSale, isChannelLinked, createdFromValue, createdToExclusive, normalizedStatus, searchPattern);
        var totalCount = Convert.ToInt32(await countCommand.ExecuteScalarAsync(cancellationToken));

        await using var command = connection.CreateCommand();
        command.CommandText = """
                 SELECT p.id, p.sku, p.barcode, p.name, p.category_id, c.name AS category_name,
                     p.unit, p.cost_price, p.sale_price, p.stock_quantity, p.minimum_stock,
                     p.product_type, p.supplier_name, p.location, p.is_direct_sale, p.is_channel_linked,
                   p.is_active, p.created_at, p.updated_at
            FROM products p
            LEFT JOIN product_categories c ON c.id = p.category_id
                 WHERE ((@status IS NULL AND (@includeInactive = 1 OR p.is_active = 1))
                     OR (@status = 'active' AND p.is_active = 1)
                     OR (@status = 'inactive' AND p.is_active = 0))
                AND (@categoryId IS NULL OR p.category_id = @categoryId)
                AND (@productType IS NULL OR p.product_type = @productType)
                AND (@supplierName IS NULL OR p.supplier_name LIKE @supplierName)
                AND (@location IS NULL OR p.location LIKE @location)
                AND (@isDirectSale IS NULL OR p.is_direct_sale = @isDirectSale)
                AND (@isChannelLinked IS NULL OR p.is_channel_linked = @isChannelLinked)
                AND (@createdFrom IS NULL OR p.created_at >= @createdFrom)
                AND (@createdTo IS NULL OR p.created_at < @createdTo)
                AND (@stockStatus IS NULL
                    OR (@stockStatus = 'out' AND p.stock_quantity = 0)
                    OR (@stockStatus = 'low' AND p.stock_quantity > 0 AND p.stock_quantity <= p.minimum_stock)
                    OR (@stockStatus = 'normal' AND p.stock_quantity > p.minimum_stock))
              AND (@search IS NULL OR p.sku LIKE @search OR p.name LIKE @search OR p.barcode LIKE @search)
            ORDER BY p.name, p.id
            LIMIT @pageSize OFFSET @offset
            """;
        command.Parameters.AddWithValue("@includeInactive", includeInactive == true);
        AddProductFilters(command, categoryId, normalizedStockStatus, normalizedProductType, supplierPattern, locationPattern, isDirectSale, isChannelLinked, createdFromValue, createdToExclusive, normalizedStatus, searchPattern);
        command.Parameters.AddWithValue("@pageSize", currentPageSize);
        command.Parameters.AddWithValue("@offset", offset);

        var items = new List<ProductResponse>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(ReadProduct(reader));
        }

        return TypedResults.Ok(new ProductListResponse(items, currentPage, currentPageSize, totalCount));
    }

    private static async Task<Results<Ok<ProductResponse>, NotFound, ProblemHttpResult>> GetProductById(
        long id,
        StoreDatabase database,
        CancellationToken cancellationToken)
    {
        if (!database.IsConfigured)
        {
            return DatabaseUnavailable<ProductResponse>();
        }

        var product = await FindProductAsync(id, database, cancellationToken);
        return product is null ? TypedResults.NotFound() : TypedResults.Ok(product);
    }

    private static async Task<Results<Created<ProductResponse>, Conflict<ProblemDetails>, ProblemHttpResult>> CreateProduct(
        SaveProductRequest request,
        StoreDatabase database,
        CancellationToken cancellationToken)
    {
        if (!database.IsConfigured)
        {
            return DatabaseUnavailable<ProductResponse>();
        }

        await using var connection = database.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            INSERT INTO products
                (sku, barcode, name, category_id, unit, cost_price, sale_price, stock_quantity, minimum_stock,
                 product_type, supplier_name, location, is_direct_sale, is_channel_linked)
            VALUES
                (@sku, @barcode, @name, @categoryId, @unit, @costPrice, @salePrice, @stockQuantity, @minimumStock,
                 @productType, @supplierName, @location, @isDirectSale, @isChannelLinked)
            """;
        AddProductParameters(command, request);

        try
        {
            await command.ExecuteNonQueryAsync(cancellationToken);
        }
        catch (MySqlException exception) when (exception.Number == 1062)
        {
            return DuplicateProduct();
        }

        var productId = command.LastInsertedId;
        var product = await FindProductAsync(productId, database, cancellationToken);
        if (product is null)
        {
            return TypedResults.Problem("The product was created but could not be loaded.", statusCode: StatusCodes.Status500InternalServerError);
        }

        return TypedResults.Created($"/api/products/{productId}", product);
    }

    private static async Task<Results<Ok<ProductResponse>, NotFound, Conflict<ProblemDetails>, ProblemHttpResult>> UpdateProduct(
        long id,
        SaveProductRequest request,
        StoreDatabase database,
        CancellationToken cancellationToken)
    {
        if (!database.IsConfigured)
        {
            return DatabaseUnavailable<ProductResponse>();
        }

        await using var connection = database.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            UPDATE products
            SET sku = @sku, barcode = @barcode, name = @name, category_id = @categoryId, unit = @unit,
                cost_price = @costPrice, sale_price = @salePrice, stock_quantity = @stockQuantity,
                minimum_stock = @minimumStock, product_type = @productType, supplier_name = @supplierName,
                location = @location, is_direct_sale = @isDirectSale, is_channel_linked = @isChannelLinked
            WHERE id = @id AND is_active = 1
            """;
        AddProductParameters(command, request);
        command.Parameters.AddWithValue("@id", id);

        try
        {
            var affectedRows = await command.ExecuteNonQueryAsync(cancellationToken);
            if (affectedRows == 0)
            {
                var existing = await FindProductAsync(id, database, cancellationToken, includeInactive: true);
                return existing is null ? TypedResults.NotFound() : TypedResults.Ok(existing);
            }
        }
        catch (MySqlException exception) when (exception.Number == 1062)
        {
            return DuplicateProduct();
        }

        var product = await FindProductAsync(id, database, cancellationToken);
        return product is null ? TypedResults.NotFound() : TypedResults.Ok(product);
    }

    private static async Task<Results<NoContent, NotFound, ProblemHttpResult>> DeactivateProduct(
        long id,
        StoreDatabase database,
        CancellationToken cancellationToken)
    {
        if (!database.IsConfigured)
        {
            return DatabaseUnavailable<ProductResponse>();
        }

        await using var connection = database.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = "UPDATE products SET is_active = 0 WHERE id = @id AND is_active = 1";
        command.Parameters.AddWithValue("@id", id);
        var affectedRows = await command.ExecuteNonQueryAsync(cancellationToken);
        return affectedRows == 0 ? TypedResults.NotFound() : TypedResults.NoContent();
    }

    private static async Task<Results<Ok<IReadOnlyList<ProductCategoryResponse>>, ProblemHttpResult>> GetCategories(
        StoreDatabase database,
        CancellationToken cancellationToken)
    {
        if (!database.IsConfigured)
        {
            return DatabaseUnavailable<IReadOnlyList<ProductCategoryResponse>>();
        }

        await using var connection = database.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT id, name FROM product_categories ORDER BY name";
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var categories = new List<ProductCategoryResponse>();
        while (await reader.ReadAsync(cancellationToken))
        {
            categories.Add(new ProductCategoryResponse(reader.GetInt64("id"), reader.GetString("name")));
        }

        return TypedResults.Ok<IReadOnlyList<ProductCategoryResponse>>(categories);
    }

    private static async Task<ProductResponse?> FindProductAsync(
        long id,
        StoreDatabase database,
        CancellationToken cancellationToken,
        bool includeInactive = false)
    {
        await using var connection = database.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
                 SELECT p.id, p.sku, p.barcode, p.name, p.category_id, c.name AS category_name,
                     p.unit, p.cost_price, p.sale_price, p.stock_quantity, p.minimum_stock,
                     p.product_type, p.supplier_name, p.location, p.is_direct_sale, p.is_channel_linked,
                   p.is_active, p.created_at, p.updated_at
            FROM products p
            LEFT JOIN product_categories c ON c.id = p.category_id
            WHERE p.id = @id AND (@includeInactive = 1 OR p.is_active = 1)
            """;
        command.Parameters.AddWithValue("@id", id);
        command.Parameters.AddWithValue("@includeInactive", includeInactive);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? ReadProduct(reader) : null;
    }

    private static ProductResponse ReadProduct(MySqlDataReader reader)
    {
        var createdAt = DateTime.SpecifyKind(reader.GetDateTime("created_at"), DateTimeKind.Utc);
        var updatedAt = DateTime.SpecifyKind(reader.GetDateTime("updated_at"), DateTimeKind.Utc);

        return new ProductResponse(
            reader.GetInt64("id"),
            reader.GetString("sku"),
            reader.IsDBNull(reader.GetOrdinal("barcode")) ? null : reader.GetString("barcode"),
            reader.GetString("name"),
            reader.IsDBNull(reader.GetOrdinal("category_id")) ? null : reader.GetInt64("category_id"),
            reader.IsDBNull(reader.GetOrdinal("category_name")) ? null : reader.GetString("category_name"),
            reader.GetString("unit"),
            reader.GetDecimal("cost_price"),
            reader.GetDecimal("sale_price"),
            reader.GetDecimal("stock_quantity"),
            reader.GetDecimal("minimum_stock"),
            reader.GetString("product_type"),
            reader.IsDBNull(reader.GetOrdinal("supplier_name")) ? null : reader.GetString("supplier_name"),
            reader.IsDBNull(reader.GetOrdinal("location")) ? null : reader.GetString("location"),
            reader.GetBoolean("is_direct_sale"),
            reader.GetBoolean("is_channel_linked"),
            reader.GetBoolean("is_active"),
            new DateTimeOffset(createdAt),
            new DateTimeOffset(updatedAt));
    }

    private static void AddProductParameters(MySqlCommand command, SaveProductRequest request)
    {
        command.Parameters.AddWithValue("@sku", request.Sku.Trim());
        command.Parameters.AddWithValue("@barcode", (object?)request.Barcode?.Trim() ?? DBNull.Value);
        command.Parameters.AddWithValue("@name", request.Name.Trim());
        command.Parameters.AddWithValue("@categoryId", (object?)request.CategoryId ?? DBNull.Value);
        command.Parameters.AddWithValue("@unit", request.Unit.Trim());
        command.Parameters.AddWithValue("@costPrice", request.CostPrice);
        command.Parameters.AddWithValue("@salePrice", request.SalePrice);
        command.Parameters.AddWithValue("@stockQuantity", request.StockQuantity);
        command.Parameters.AddWithValue("@minimumStock", request.MinimumStock);
        command.Parameters.AddWithValue("@productType", request.ProductType.Trim());
        command.Parameters.AddWithValue("@supplierName", (object?)request.SupplierName?.Trim() ?? DBNull.Value);
        command.Parameters.AddWithValue("@location", (object?)request.Location?.Trim() ?? DBNull.Value);
        command.Parameters.AddWithValue("@isDirectSale", request.IsDirectSale);
        command.Parameters.AddWithValue("@isChannelLinked", request.IsChannelLinked);
    }

    private static void AddProductFilters(
        MySqlCommand command,
        long? categoryId,
        string? stockStatus,
        string? productType,
        string? supplierName,
        string? location,
        bool? isDirectSale,
        bool? isChannelLinked,
        DateTime? createdFrom,
        DateTime? createdTo,
        string? status,
        string? search)
    {
        command.Parameters.AddWithValue("@categoryId", (object?)categoryId ?? DBNull.Value);
        command.Parameters.AddWithValue("@stockStatus", (object?)stockStatus ?? DBNull.Value);
        command.Parameters.AddWithValue("@productType", (object?)productType ?? DBNull.Value);
        command.Parameters.AddWithValue("@supplierName", (object?)supplierName ?? DBNull.Value);
        command.Parameters.AddWithValue("@location", (object?)location ?? DBNull.Value);
        command.Parameters.AddWithValue("@isDirectSale", (object?)isDirectSale ?? DBNull.Value);
        command.Parameters.AddWithValue("@isChannelLinked", (object?)isChannelLinked ?? DBNull.Value);
        command.Parameters.AddWithValue("@createdFrom", (object?)createdFrom ?? DBNull.Value);
        command.Parameters.AddWithValue("@createdTo", (object?)createdTo ?? DBNull.Value);
        command.Parameters.AddWithValue("@status", (object?)status ?? DBNull.Value);
        command.Parameters.AddWithValue("@search", (object?)search ?? DBNull.Value);
    }

    private static Conflict<ProblemDetails> DuplicateProduct() =>
        TypedResults.Conflict(new ProblemDetails
        {
            Title = "Mã hàng hoặc mã vạch đã tồn tại.",
            Status = StatusCodes.Status409Conflict,
        });

    private static ProblemHttpResult DatabaseUnavailable<T>() =>
        TypedResults.Problem("MySQL is not configured. Set the ConnectionStrings__StoreDb environment variable.", statusCode: StatusCodes.Status503ServiceUnavailable);
}
