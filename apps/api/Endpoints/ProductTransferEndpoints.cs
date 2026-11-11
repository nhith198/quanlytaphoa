using System.Globalization;
using System.Text;
using CsvHelper;
using CsvHelper.Configuration;
using api.Contracts;
using api.Data;
using Microsoft.AspNetCore.Http.HttpResults;
using MySqlConnector;

namespace api.Endpoints;

public static class ProductTransferEndpoints
{
    private const long MaximumImportBytes = 5 * 1024 * 1024;
    private const int MaximumImportRows = 10_000;

    public static void MapProductTransferEndpoints(this WebApplication app)
    {
        app.MapGet("/api/products/export", ExportProducts)
            .WithName("ExportProducts")
            .WithSummary("Exports active products to a UTF-8 CSV file.");

        app.MapPost("/api/products/import", ImportProducts)
            .DisableAntiforgery()
            .WithName("ImportProducts")
            .WithSummary("Imports a CSV product catalog atomically.");

        app.MapGet("/api/products/import-template", DownloadTemplate)
            .WithName("DownloadProductImportTemplate")
            .WithSummary("Downloads the product import CSV template.");
    }

    private static async Task<Results<FileContentHttpResult, ProblemHttpResult>> ExportProducts(
        StoreDatabase database,
        CancellationToken cancellationToken)
    {
        if (!database.IsConfigured) return DatabaseUnavailable<FileContentHttpResult>();

        await using var connection = database.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT p.sku, p.barcode, p.name, c.name AS category_name, p.unit, p.cost_price, p.sale_price,
                   p.stock_quantity, p.minimum_stock, p.product_type, p.supplier_name, p.location,
                   p.is_direct_sale, p.is_channel_linked
            FROM products p LEFT JOIN product_categories c ON c.id = p.category_id
            WHERE p.is_active = 1 ORDER BY p.name, p.id
            """;
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var rows = new List<ProductCsvRow>();
        while (await reader.ReadAsync(cancellationToken))
        {
            rows.Add(new ProductCsvRow
            {
                Sku = reader.GetString("sku"),
                Barcode = reader.IsDBNull(reader.GetOrdinal("barcode")) ? null : reader.GetString("barcode"),
                Name = reader.GetString("name"),
                Category = reader.IsDBNull(reader.GetOrdinal("category_name")) ? null : reader.GetString("category_name"),
                Unit = reader.GetString("unit"),
                CostPrice = reader.GetDecimal("cost_price"),
                SalePrice = reader.GetDecimal("sale_price"),
                StockQuantity = reader.GetDecimal("stock_quantity"),
                MinimumStock = reader.GetDecimal("minimum_stock"),
                ProductType = reader.GetString("product_type"),
                SupplierName = reader.IsDBNull(reader.GetOrdinal("supplier_name")) ? null : reader.GetString("supplier_name"),
                Location = reader.IsDBNull(reader.GetOrdinal("location")) ? null : reader.GetString("location"),
                IsDirectSale = reader.GetBoolean("is_direct_sale"),
                IsChannelLinked = reader.GetBoolean("is_channel_linked"),
            });
        }

        using var textWriter = new StringWriter(CultureInfo.InvariantCulture);
        using (var csv = new CsvWriter(textWriter, CultureInfo.InvariantCulture))
        {
            csv.WriteRecords(rows);
        }

        var content = new UTF8Encoding(encoderShouldEmitUTF8Identifier: true).GetPreamble()
            .Concat(Encoding.UTF8.GetBytes(textWriter.ToString()))
            .ToArray();
        return TypedResults.File(content, "text/csv; charset=utf-8", "danh-sach-hang-hoa.csv");
    }

    private static async Task<Results<Ok<ProductImportResultResponse>, ProblemHttpResult>> ImportProducts(
        IFormFile file,
        StoreDatabase database,
        CancellationToken cancellationToken)
    {
        if (!database.IsConfigured) return DatabaseUnavailable<ProductImportResultResponse>();
        if (file.Length == 0) return BadRequest("File nhập không có dữ liệu.");
        if (file.Length > MaximumImportBytes) return BadRequest("File nhập vượt quá giới hạn 5 MB.");

        List<ProductCsvRow> rows;
        try
        {
            await using var stream = file.OpenReadStream();
            using var textReader = new StreamReader(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true);
            using var csv = new CsvReader(textReader, new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                PrepareHeaderForMatch = args => args.Header.Trim(),
                MissingFieldFound = null,
                HeaderValidated = null,
            });
            rows = csv.GetRecords<ProductCsvRow>().Take(MaximumImportRows + 1).ToList();
        }
        catch (CsvHelperException)
        {
            return BadRequest("Không đọc được CSV. Hãy tải mẫu import và giữ nguyên tên cột.");
        }
        catch (Exception exception) when (exception is FormatException or InvalidOperationException)
        {
            return BadRequest("CSV chứa giá trị không hợp lệ. Hãy kiểm tra số lượng, giá và loại hàng.");
        }

        if (rows.Count == 0) return BadRequest("CSV không có dòng hàng hóa.");
        if (rows.Count > MaximumImportRows) return BadRequest("File vượt quá giới hạn 10.000 dòng.");

        var duplicateSku = rows.GroupBy(row => row.Sku.Trim(), StringComparer.OrdinalIgnoreCase).Any(group => string.IsNullOrWhiteSpace(group.Key) || group.Count() > 1);
        if (duplicateSku) return BadRequest("Mã hàng trong file bị trống hoặc trùng lặp.");

        var invalidRow = rows.FirstOrDefault(row =>
            string.IsNullOrWhiteSpace(row.Name) ||
            string.IsNullOrWhiteSpace(row.Unit) ||
            row.CostPrice < 0 || row.SalePrice < 0 || row.StockQuantity < 0 || row.MinimumStock < 0 ||
            !IsValidProductType(row.ProductType));
        if (invalidRow is not null)
        {
            return BadRequest($"Dòng {rows.IndexOf(invalidRow) + 2} thiếu tên/đơn vị hoặc có giá trị âm/loại hàng không hợp lệ.");
        }

        await using var connection = database.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
        var categories = new Dictionary<string, long>(StringComparer.OrdinalIgnoreCase);
        var created = 0;
        var updated = 0;

        try
        {
            foreach (var row in rows)
            {
                var categoryId = await GetOrCreateCategoryAsync(connection, transaction, row.Category, categories, cancellationToken);
                await using var command = connection.CreateCommand();
                command.Transaction = transaction;
                command.CommandText = """
                    INSERT INTO products
                        (sku, barcode, name, category_id, unit, cost_price, sale_price, stock_quantity, minimum_stock,
                         product_type, supplier_name, location, is_direct_sale, is_channel_linked)
                    VALUES
                        (@sku, @barcode, @name, @categoryId, @unit, @costPrice, @salePrice, @stockQuantity, @minimumStock,
                         @productType, @supplierName, @location, @isDirectSale, @isChannelLinked)
                    ON DUPLICATE KEY UPDATE
                        barcode = VALUES(barcode), name = VALUES(name), category_id = VALUES(category_id), unit = VALUES(unit),
                        cost_price = VALUES(cost_price), sale_price = VALUES(sale_price), stock_quantity = VALUES(stock_quantity),
                        minimum_stock = VALUES(minimum_stock), product_type = VALUES(product_type), supplier_name = VALUES(supplier_name),
                        location = VALUES(location), is_direct_sale = VALUES(is_direct_sale), is_channel_linked = VALUES(is_channel_linked),
                        is_active = 1
                    """;
                command.Parameters.AddWithValue("@sku", row.Sku.Trim());
                command.Parameters.AddWithValue("@barcode", (object?)Normalize(row.Barcode) ?? DBNull.Value);
                command.Parameters.AddWithValue("@name", row.Name.Trim());
                command.Parameters.AddWithValue("@categoryId", (object?)categoryId ?? DBNull.Value);
                command.Parameters.AddWithValue("@unit", row.Unit.Trim());
                command.Parameters.AddWithValue("@costPrice", row.CostPrice);
                command.Parameters.AddWithValue("@salePrice", row.SalePrice);
                command.Parameters.AddWithValue("@stockQuantity", row.StockQuantity);
                command.Parameters.AddWithValue("@minimumStock", row.MinimumStock);
                command.Parameters.AddWithValue("@productType", row.ProductType.Trim().ToLowerInvariant());
                command.Parameters.AddWithValue("@supplierName", (object?)Normalize(row.SupplierName) ?? DBNull.Value);
                command.Parameters.AddWithValue("@location", (object?)Normalize(row.Location) ?? DBNull.Value);
                command.Parameters.AddWithValue("@isDirectSale", row.IsDirectSale);
                command.Parameters.AddWithValue("@isChannelLinked", row.IsChannelLinked);
                var affected = await command.ExecuteNonQueryAsync(cancellationToken);
                if (affected == 1) created++;
                else updated++;
            }

            await transaction.CommitAsync(cancellationToken);
        }
        catch (MySqlException exception) when (exception.Number is 1062 or 1452)
        {
            await transaction.RollbackAsync(cancellationToken);
            return TypedResults.Problem("Mã vạch bị trùng hoặc nhóm hàng không hợp lệ; không có dòng nào được nhập.", statusCode: StatusCodes.Status409Conflict);
        }

        return TypedResults.Ok(new ProductImportResultResponse(created, updated, 0));
    }

    private static IResult DownloadTemplate()
    {
        var row = new ProductCsvRow
        {
            Sku = "HH-00001",
            Barcode = "8930000000000",
            Name = "Ten hang mau",
            Category = "Thực phẩm khô",
            Unit = "gói",
            CostPrice = 10000,
            SalePrice = 12000,
            StockQuantity = 0,
            MinimumStock = 5,
            ProductType = "goods",
            SupplierName = "",
            Location = "Kệ A1",
            IsDirectSale = true,
            IsChannelLinked = false,
        };
        using var writer = new StringWriter(CultureInfo.InvariantCulture);
        using (var csv = new CsvWriter(writer, CultureInfo.InvariantCulture)) csv.WriteRecords([row]);
        var content = new UTF8Encoding(encoderShouldEmitUTF8Identifier: true).GetPreamble()
            .Concat(Encoding.UTF8.GetBytes(writer.ToString()))
            .ToArray();
        return TypedResults.File(content, "text/csv; charset=utf-8", "mau-import-hang-hoa.csv");
    }

    private static async Task<long?> GetOrCreateCategoryAsync(
        MySqlConnection connection,
        MySqlTransaction transaction,
        string? name,
        IDictionary<string, long> categories,
        CancellationToken cancellationToken)
    {
        var normalizedName = Normalize(name);
        if (normalizedName is null) return null;
        if (categories.TryGetValue(normalizedName, out var cachedId)) return cachedId;

        await using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = "INSERT INTO product_categories (name) VALUES (@name) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)";
        command.Parameters.AddWithValue("@name", normalizedName);
        await command.ExecuteNonQueryAsync(cancellationToken);
        var id = command.LastInsertedId;
        categories[normalizedName] = id;
        return id;
    }

    private static bool IsValidProductType(string type) =>
        type.Trim().ToLowerInvariant() is "goods" or "service" or "combo";

    private static string? Normalize(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static ProblemHttpResult BadRequest(string message) =>
        TypedResults.Problem(message, statusCode: StatusCodes.Status400BadRequest);

    private static ProblemHttpResult DatabaseUnavailable<T>() =>
        TypedResults.Problem("MySQL is not configured.", statusCode: StatusCodes.Status503ServiceUnavailable);
}

public sealed class ProductCsvRow
{
    public string Sku { get; set; } = string.Empty;
    public string? Barcode { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Category { get; set; }
    public string Unit { get; set; } = string.Empty;
    public decimal CostPrice { get; set; }
    public decimal SalePrice { get; set; }
    public decimal StockQuantity { get; set; }
    public decimal MinimumStock { get; set; }
    public string ProductType { get; set; } = "goods";
    public string? SupplierName { get; set; }
    public string? Location { get; set; }
    public bool IsDirectSale { get; set; } = true;
    public bool IsChannelLinked { get; set; }
}
