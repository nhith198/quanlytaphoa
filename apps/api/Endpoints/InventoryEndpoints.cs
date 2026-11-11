using api.Contracts;
using api.Data;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;

namespace api.Endpoints;

public static class InventoryEndpoints
{
    private const string DraftStatus = "draft";
    private const string ConfirmedStatus = "confirmed";

    public static void MapInventoryEndpoints(this WebApplication app)
    {
        var stockTakes = app.MapGroup("/api/stock-takes").WithTags("Inventory");
        stockTakes.MapGet("/", GetStockTakes).WithName("GetStockTakes");
        stockTakes.MapPost("/", CreateStockTake).WithName("CreateStockTake");
        stockTakes.MapGet("/{id:long}", GetStockTake).WithName("GetStockTake");
        stockTakes.MapPost("/{id:long}/confirm", ConfirmStockTake).WithName("ConfirmStockTake");

        var vouchers = app.MapGroup("/api/inventory-vouchers").WithTags("Inventory");
        vouchers.MapGet("/", GetVouchers).WithName("GetInventoryVouchers");
        vouchers.MapPost("/", CreateVoucher).WithName("CreateInventoryVoucher");
        vouchers.MapGet("/{id:long}", GetVoucher).WithName("GetInventoryVoucher");
        vouchers.MapPost("/{id:long}/confirm", ConfirmVoucher).WithName("ConfirmInventoryVoucher");
    }

    private static async Task<Results<Ok<IReadOnlyList<StockTakeResponse>>, ProblemHttpResult>> GetStockTakes(
        StoreDatabase database,
        CancellationToken cancellationToken)
    {
        if (!database.IsConfigured) return DatabaseUnavailable<IReadOnlyList<StockTakeResponse>>();
        await using var connection = database.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT s.id, s.code, s.status, s.note, COUNT(i.product_id) AS item_count,
                   COALESCE(SUM(i.counted_quantity - i.expected_quantity), 0) AS total_difference,
                   s.created_at, s.confirmed_at
            FROM stock_takes s LEFT JOIN stock_take_items i ON i.stock_take_id = s.id
            GROUP BY s.id, s.code, s.status, s.note, s.created_at, s.confirmed_at
            ORDER BY s.created_at DESC, s.id DESC
            LIMIT 200
            """;
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var result = new List<StockTakeResponse>();
        while (await reader.ReadAsync(cancellationToken)) result.Add(ReadStockTake(reader));
        return TypedResults.Ok<IReadOnlyList<StockTakeResponse>>(result);
    }

    private static async Task<Results<Created<StockTakeDetailResponse>, ProblemHttpResult>> CreateStockTake(
        CreateStockTakeRequest request,
        StoreDatabase database,
        CancellationToken cancellationToken)
    {
        if (!database.IsConfigured) return DatabaseUnavailable<StockTakeDetailResponse>();
        if (HasDuplicateProducts(request.Items.Select(item => item.ProductId))) return BadRequest("Phiếu kiểm kho có sản phẩm bị lặp.");

        await using var connection = database.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
        var code = CreateDocumentCode("KK");

        await using (var command = connection.CreateCommand())
        {
            command.Transaction = transaction;
            command.CommandText = "INSERT INTO stock_takes (code, note) VALUES (@code, @note)";
            command.Parameters.AddWithValue("@code", code);
            command.Parameters.AddWithValue("@note", (object?)NormalizeNote(request.Note) ?? DBNull.Value);
            await command.ExecuteNonQueryAsync(cancellationToken);
            var stockTakeId = command.LastInsertedId;

            foreach (var item in request.Items.OrderBy(item => item.ProductId))
            {
                await using var productCommand = connection.CreateCommand();
                productCommand.Transaction = transaction;
                productCommand.CommandText = "SELECT stock_quantity FROM products WHERE id = @id AND is_active = 1 FOR UPDATE";
                productCommand.Parameters.AddWithValue("@id", item.ProductId);
                var expected = await productCommand.ExecuteScalarAsync(cancellationToken);
                if (expected is null)
                {
                    await transaction.RollbackAsync(cancellationToken);
                    return BadRequest("Phiếu có sản phẩm không tồn tại hoặc đã ngừng bán.");
                }

                await using var itemCommand = connection.CreateCommand();
                itemCommand.Transaction = transaction;
                itemCommand.CommandText = "INSERT INTO stock_take_items (stock_take_id, product_id, expected_quantity, counted_quantity) VALUES (@stockTakeId, @productId, @expected, @counted)";
                itemCommand.Parameters.AddWithValue("@stockTakeId", stockTakeId);
                itemCommand.Parameters.AddWithValue("@productId", item.ProductId);
                itemCommand.Parameters.AddWithValue("@expected", Convert.ToDecimal(expected));
                itemCommand.Parameters.AddWithValue("@counted", item.CountedQuantity);
                await itemCommand.ExecuteNonQueryAsync(cancellationToken);
            }

            await transaction.CommitAsync(cancellationToken);
            var detail = await FindStockTakeAsync(stockTakeId, database, cancellationToken);
            if (detail is null) return TypedResults.Problem("Không tải được phiếu kiểm kho vừa tạo.", statusCode: StatusCodes.Status500InternalServerError);
            return TypedResults.Created($"/api/stock-takes/{stockTakeId}", detail);
        }
    }

    private static async Task<Results<Ok<StockTakeDetailResponse>, NotFound, ProblemHttpResult>> GetStockTake(
        long id,
        StoreDatabase database,
        CancellationToken cancellationToken)
    {
        if (!database.IsConfigured) return DatabaseUnavailable<StockTakeDetailResponse>();
        var detail = await FindStockTakeAsync(id, database, cancellationToken);
        return detail is null ? TypedResults.NotFound() : TypedResults.Ok(detail);
    }

    private static async Task<Results<NoContent, NotFound, Conflict<ProblemDetails>, ProblemHttpResult>> ConfirmStockTake(
        long id,
        StoreDatabase database,
        CancellationToken cancellationToken)
    {
        if (!database.IsConfigured) return DatabaseUnavailable<StockTakeDetailResponse>();
        await using var connection = database.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        var status = await ReadLockedStatusAsync(connection, transaction, "stock_takes", id, cancellationToken);
        if (status is null)
        {
            await transaction.RollbackAsync(cancellationToken);
            return TypedResults.NotFound();
        }
        if (status != DraftStatus)
        {
            await transaction.RollbackAsync(cancellationToken);
            return Conflict("Phiếu kiểm kho đã được xác nhận trước đó.");
        }

        var items = await ReadLockedStockTakeItemsAsync(connection, transaction, id, cancellationToken);
        if (items.Count == 0)
        {
            await transaction.RollbackAsync(cancellationToken);
            return BadRequestConflict("Phiếu kiểm kho chưa có sản phẩm.");
        }

        foreach (var item in items)
        {
            if (item.CurrentQuantity != item.ExpectedQuantity)
            {
                await transaction.RollbackAsync(cancellationToken);
                return Conflict($"Tồn kho của {item.Sku} đã thay đổi sau khi lập phiếu. Hãy lập phiếu kiểm mới.");
            }

            var difference = item.CountedQuantity - item.ExpectedQuantity;
            if (difference == 0) continue;
            await SetProductQuantityAsync(connection, transaction, item.ProductId, item.CountedQuantity, cancellationToken);
            await AddMovementAsync(connection, transaction, item.ProductId, "stock_take", await GetStockTakeCodeAsync(connection, transaction, id, cancellationToken), item.ExpectedQuantity, difference, item.CountedQuantity, cancellationToken);
        }

        await using (var confirm = connection.CreateCommand())
        {
            confirm.Transaction = transaction;
            confirm.CommandText = "UPDATE stock_takes SET status = @status, confirmed_at = UTC_TIMESTAMP(6) WHERE id = @id AND status = @draft";
            confirm.Parameters.AddWithValue("@status", ConfirmedStatus);
            confirm.Parameters.AddWithValue("@draft", DraftStatus);
            confirm.Parameters.AddWithValue("@id", id);
            await confirm.ExecuteNonQueryAsync(cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);
        return TypedResults.NoContent();
    }

    private static async Task<Results<Ok<IReadOnlyList<InventoryVoucherResponse>>, ProblemHttpResult>> GetVouchers(
        string? type,
        StoreDatabase database,
        CancellationToken cancellationToken)
    {
        if (!database.IsConfigured) return DatabaseUnavailable<IReadOnlyList<InventoryVoucherResponse>>();
        if (type is not null && !IsVoucherType(type)) return BadRequest("Loại phiếu không hợp lệ.");

        await using var connection = database.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT v.id, v.code, v.voucher_type, v.status, v.note, COUNT(i.product_id) AS item_count,
                   COALESCE(SUM(i.quantity), 0) AS total_quantity, v.created_at, v.confirmed_at
            FROM inventory_vouchers v LEFT JOIN inventory_voucher_items i ON i.voucher_id = v.id
            WHERE (@type IS NULL OR v.voucher_type = @type)
            GROUP BY v.id, v.code, v.voucher_type, v.status, v.note, v.created_at, v.confirmed_at
            ORDER BY v.created_at DESC, v.id DESC
            LIMIT 200
            """;
        command.Parameters.AddWithValue("@type", (object?)type ?? DBNull.Value);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var result = new List<InventoryVoucherResponse>();
        while (await reader.ReadAsync(cancellationToken)) result.Add(ReadVoucher(reader));
        return TypedResults.Ok<IReadOnlyList<InventoryVoucherResponse>>(result);
    }

    private static async Task<Results<Created<InventoryVoucherResponse>, ProblemHttpResult>> CreateVoucher(
        CreateInventoryVoucherRequest request,
        StoreDatabase database,
        CancellationToken cancellationToken)
    {
        var type = request.Type.Trim().ToLowerInvariant();
        if (!database.IsConfigured) return DatabaseUnavailable<InventoryVoucherResponse>();
        if (!IsVoucherType(type)) return BadRequest("Loại phiếu chỉ nhận internal_use hoặc damaged.");
        if (HasDuplicateProducts(request.Items.Select(item => item.ProductId))) return BadRequest("Phiếu có sản phẩm bị lặp.");

        await using var connection = database.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
        var code = CreateDocumentCode(type == "internal_use" ? "XNB" : "XH");
        long id;

        await using (var command = connection.CreateCommand())
        {
            command.Transaction = transaction;
            command.CommandText = "INSERT INTO inventory_vouchers (code, voucher_type, note) VALUES (@code, @type, @note)";
            command.Parameters.AddWithValue("@code", code);
            command.Parameters.AddWithValue("@type", type);
            command.Parameters.AddWithValue("@note", (object?)NormalizeNote(request.Note) ?? DBNull.Value);
            await command.ExecuteNonQueryAsync(cancellationToken);
            id = command.LastInsertedId;
        }

        foreach (var item in request.Items.OrderBy(item => item.ProductId))
        {
            await using var product = connection.CreateCommand();
            product.Transaction = transaction;
            product.CommandText = "SELECT cost_price FROM products WHERE id = @id AND is_active = 1 FOR UPDATE";
            product.Parameters.AddWithValue("@id", item.ProductId);
            var unitCost = await product.ExecuteScalarAsync(cancellationToken);
            if (unitCost is null)
            {
                await transaction.RollbackAsync(cancellationToken);
                return BadRequest("Phiếu có sản phẩm không tồn tại hoặc đã ngừng bán.");
            }

            await using var line = connection.CreateCommand();
            line.Transaction = transaction;
            line.CommandText = "INSERT INTO inventory_voucher_items (voucher_id, product_id, quantity, unit_cost) VALUES (@voucherId, @productId, @quantity, @unitCost)";
            line.Parameters.AddWithValue("@voucherId", id);
            line.Parameters.AddWithValue("@productId", item.ProductId);
            line.Parameters.AddWithValue("@quantity", item.Quantity);
            line.Parameters.AddWithValue("@unitCost", Convert.ToDecimal(unitCost));
            await line.ExecuteNonQueryAsync(cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);
        var voucher = await FindVoucherAsync(id, database, cancellationToken);
        if (voucher is null) return TypedResults.Problem("Không tải được phiếu vừa tạo.", statusCode: StatusCodes.Status500InternalServerError);
        return TypedResults.Created($"/api/inventory-vouchers/{id}", voucher);
    }

    private static async Task<Results<Ok<InventoryVoucherResponse>, NotFound, ProblemHttpResult>> GetVoucher(
        long id,
        StoreDatabase database,
        CancellationToken cancellationToken)
    {
        if (!database.IsConfigured) return DatabaseUnavailable<InventoryVoucherResponse>();
        var voucher = await FindVoucherAsync(id, database, cancellationToken);
        return voucher is null ? TypedResults.NotFound() : TypedResults.Ok(voucher);
    }

    private static async Task<Results<NoContent, NotFound, Conflict<ProblemDetails>, ProblemHttpResult>> ConfirmVoucher(
        long id,
        StoreDatabase database,
        CancellationToken cancellationToken)
    {
        if (!database.IsConfigured) return DatabaseUnavailable<InventoryVoucherResponse>();
        await using var connection = database.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        await using var header = connection.CreateCommand();
        header.Transaction = transaction;
        header.CommandText = "SELECT voucher_type, status, code FROM inventory_vouchers WHERE id = @id FOR UPDATE";
        header.Parameters.AddWithValue("@id", id);
        string type;
        string status;
        string code;
        await using (var reader = await header.ExecuteReaderAsync(cancellationToken))
        {
            if (!await reader.ReadAsync(cancellationToken))
            {
                await transaction.RollbackAsync(cancellationToken);
                return TypedResults.NotFound();
            }
            type = reader.GetString("voucher_type");
            status = reader.GetString("status");
            code = reader.GetString("code");
        }

        if (status != DraftStatus)
        {
            await transaction.RollbackAsync(cancellationToken);
            return Conflict("Phiếu đã được xác nhận trước đó.");
        }

        var items = await ReadLockedVoucherItemsAsync(connection, transaction, id, cancellationToken);
        if (items.Count == 0)
        {
            await transaction.RollbackAsync(cancellationToken);
            return BadRequestConflict("Phiếu chưa có sản phẩm.");
        }

        foreach (var item in items)
        {
            if (item.CurrentQuantity < item.Quantity)
            {
                await transaction.RollbackAsync(cancellationToken);
                return Conflict($"Tồn kho {item.Sku} không đủ để xác nhận phiếu.");
            }

            var after = item.CurrentQuantity - item.Quantity;
            await SetProductQuantityAsync(connection, transaction, item.ProductId, after, cancellationToken);
            await AddMovementAsync(connection, transaction, item.ProductId, type, code, item.CurrentQuantity, -item.Quantity, after, cancellationToken);
        }

        await using var confirm = connection.CreateCommand();
        confirm.Transaction = transaction;
        confirm.CommandText = "UPDATE inventory_vouchers SET status = @status, confirmed_at = UTC_TIMESTAMP(6) WHERE id = @id AND status = @draft";
        confirm.Parameters.AddWithValue("@status", ConfirmedStatus);
        confirm.Parameters.AddWithValue("@draft", DraftStatus);
        confirm.Parameters.AddWithValue("@id", id);
        await confirm.ExecuteNonQueryAsync(cancellationToken);

        await transaction.CommitAsync(cancellationToken);
        return TypedResults.NoContent();
    }

    private static async Task<StockTakeDetailResponse?> FindStockTakeAsync(long id, StoreDatabase database, CancellationToken cancellationToken)
    {
        await using var connection = database.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var header = connection.CreateCommand();
        header.CommandText = """
            SELECT s.id, s.code, s.status, s.note, COUNT(i.product_id) AS item_count,
                   COALESCE(SUM(i.counted_quantity - i.expected_quantity), 0) AS total_difference,
                   s.created_at, s.confirmed_at
            FROM stock_takes s LEFT JOIN stock_take_items i ON i.stock_take_id = s.id
            WHERE s.id = @id GROUP BY s.id, s.code, s.status, s.note, s.created_at, s.confirmed_at
            """;
        header.Parameters.AddWithValue("@id", id);
        StockTakeResponse summary;
        await using (var reader = await header.ExecuteReaderAsync(cancellationToken))
        {
            if (!await reader.ReadAsync(cancellationToken)) return null;
            summary = ReadStockTake(reader);
        }

        await using var itemsCommand = connection.CreateCommand();
        itemsCommand.CommandText = """
            SELECT i.product_id, p.sku, p.name, p.unit, i.expected_quantity, i.counted_quantity
            FROM stock_take_items i JOIN products p ON p.id = i.product_id
            WHERE i.stock_take_id = @id ORDER BY p.name
            """;
        itemsCommand.Parameters.AddWithValue("@id", id);
        await using var itemsReader = await itemsCommand.ExecuteReaderAsync(cancellationToken);
        var items = new List<StockTakeLineResponse>();
        while (await itemsReader.ReadAsync(cancellationToken))
        {
            var expected = itemsReader.GetDecimal("expected_quantity");
            var counted = itemsReader.GetDecimal("counted_quantity");
            items.Add(new StockTakeLineResponse(itemsReader.GetInt64("product_id"), itemsReader.GetString("sku"), itemsReader.GetString("name"), itemsReader.GetString("unit"), expected, counted, counted - expected));
        }

        return new StockTakeDetailResponse(summary, items);
    }

    private static async Task<List<LockedStockTakeItem>> ReadLockedStockTakeItemsAsync(
        MySqlConnection connection,
        MySqlTransaction transaction,
        long id,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = """
            SELECT i.product_id, p.sku, i.expected_quantity, i.counted_quantity, p.stock_quantity AS current_quantity
            FROM stock_take_items i JOIN products p ON p.id = i.product_id
            WHERE i.stock_take_id = @id ORDER BY i.product_id FOR UPDATE
            """;
        command.Parameters.AddWithValue("@id", id);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var items = new List<LockedStockTakeItem>();
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(new LockedStockTakeItem(reader.GetInt64("product_id"), reader.GetString("sku"), reader.GetDecimal("expected_quantity"), reader.GetDecimal("counted_quantity"), reader.GetDecimal("current_quantity")));
        }
        return items;
    }

    private static async Task<List<LockedVoucherItem>> ReadLockedVoucherItemsAsync(
        MySqlConnection connection,
        MySqlTransaction transaction,
        long id,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = """
            SELECT i.product_id, p.sku, i.quantity, p.stock_quantity AS current_quantity
            FROM inventory_voucher_items i JOIN products p ON p.id = i.product_id
            WHERE i.voucher_id = @id ORDER BY i.product_id FOR UPDATE
            """;
        command.Parameters.AddWithValue("@id", id);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var items = new List<LockedVoucherItem>();
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(new LockedVoucherItem(reader.GetInt64("product_id"), reader.GetString("sku"), reader.GetDecimal("quantity"), reader.GetDecimal("current_quantity")));
        }
        return items;
    }

    private static async Task<InventoryVoucherResponse?> FindVoucherAsync(long id, StoreDatabase database, CancellationToken cancellationToken)
    {
        await using var connection = database.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT v.id, v.code, v.voucher_type, v.status, v.note, COUNT(i.product_id) AS item_count,
                   COALESCE(SUM(i.quantity), 0) AS total_quantity, v.created_at, v.confirmed_at
            FROM inventory_vouchers v LEFT JOIN inventory_voucher_items i ON i.voucher_id = v.id
            WHERE v.id = @id GROUP BY v.id, v.code, v.voucher_type, v.status, v.note, v.created_at, v.confirmed_at
            """;
        command.Parameters.AddWithValue("@id", id);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? ReadVoucher(reader) : null;
    }

    private static async Task<string?> ReadLockedStatusAsync(
        MySqlConnection connection,
        MySqlTransaction transaction,
        string table,
        long id,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = $"SELECT status FROM `{table}` WHERE id = @id FOR UPDATE";
        command.Parameters.AddWithValue("@id", id);
        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is null ? null : Convert.ToString(result);
    }

    private static async Task<string> GetStockTakeCodeAsync(MySqlConnection connection, MySqlTransaction transaction, long id, CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = "SELECT code FROM stock_takes WHERE id = @id";
        command.Parameters.AddWithValue("@id", id);
        return Convert.ToString(await command.ExecuteScalarAsync(cancellationToken))!;
    }

    private static async Task SetProductQuantityAsync(MySqlConnection connection, MySqlTransaction transaction, long productId, decimal quantity, CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = "UPDATE products SET stock_quantity = @quantity WHERE id = @id";
        command.Parameters.AddWithValue("@quantity", quantity);
        command.Parameters.AddWithValue("@id", productId);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task AddMovementAsync(
        MySqlConnection connection,
        MySqlTransaction transaction,
        long productId,
        string movementType,
        string referenceCode,
        decimal before,
        decimal change,
        decimal after,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = """
            INSERT INTO inventory_movements (product_id, movement_type, reference_code, quantity_before, quantity_change, quantity_after)
            VALUES (@productId, @type, @reference, @before, @change, @after)
            """;
        command.Parameters.AddWithValue("@productId", productId);
        command.Parameters.AddWithValue("@type", movementType);
        command.Parameters.AddWithValue("@reference", referenceCode);
        command.Parameters.AddWithValue("@before", before);
        command.Parameters.AddWithValue("@change", change);
        command.Parameters.AddWithValue("@after", after);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static StockTakeResponse ReadStockTake(MySqlDataReader reader) =>
        new(reader.GetInt64("id"), reader.GetString("code"), reader.GetString("status"), reader.IsDBNull(reader.GetOrdinal("note")) ? null : reader.GetString("note"), reader.GetInt32("item_count"), reader.GetDecimal("total_difference"), ReadUtc(reader.GetDateTime("created_at")), reader.IsDBNull(reader.GetOrdinal("confirmed_at")) ? null : ReadUtc(reader.GetDateTime("confirmed_at")));

    private static InventoryVoucherResponse ReadVoucher(MySqlDataReader reader) =>
        new(reader.GetInt64("id"), reader.GetString("code"), reader.GetString("voucher_type"), reader.GetString("status"), reader.IsDBNull(reader.GetOrdinal("note")) ? null : reader.GetString("note"), reader.GetInt32("item_count"), reader.GetDecimal("total_quantity"), ReadUtc(reader.GetDateTime("created_at")), reader.IsDBNull(reader.GetOrdinal("confirmed_at")) ? null : ReadUtc(reader.GetDateTime("confirmed_at")));

    private static DateTimeOffset ReadUtc(DateTime value) => new(DateTime.SpecifyKind(value, DateTimeKind.Utc));
    private static string CreateDocumentCode(string prefix) => $"{prefix}-{DateTime.UtcNow:yyMMdd}-{Guid.NewGuid():N}"[..(prefix.Length + 7 + 7)];
    private static string? NormalizeNote(string? note) => string.IsNullOrWhiteSpace(note) ? null : note.Trim();
    private static bool HasDuplicateProducts(IEnumerable<long> ids) => ids.Distinct().Count() == ids.Count();
    private static bool IsVoucherType(string type) => type is "internal_use" or "damaged";
    private static ProblemHttpResult BadRequest(string message) => TypedResults.Problem(message, statusCode: StatusCodes.Status400BadRequest);
    private static ProblemHttpResult BadRequestConflict(string message) => TypedResults.Problem(message, statusCode: StatusCodes.Status409Conflict);
    private static Conflict<ProblemDetails> Conflict(string message) => TypedResults.Conflict(new ProblemDetails { Title = message, Status = StatusCodes.Status409Conflict });
    private static ProblemHttpResult DatabaseUnavailable<T>() => TypedResults.Problem("MySQL is not configured.", statusCode: StatusCodes.Status503ServiceUnavailable);

    private sealed record LockedStockTakeItem(long ProductId, string Sku, decimal ExpectedQuantity, decimal CountedQuantity, decimal CurrentQuantity);
    private sealed record LockedVoucherItem(long ProductId, string Sku, decimal Quantity, decimal CurrentQuantity);
}
