using api.Contracts;
using api.Data;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;

namespace api.Endpoints;

public static class PriceBookEndpoints
{
    public static void MapPriceBookEndpoints(this WebApplication app)
    {
        var priceBooks = app.MapGroup("/api/price-books").WithTags("Price Books");

        priceBooks.MapGet("/", GetPriceBooks)
            .WithName("GetPriceBooks");
        priceBooks.MapPost("/", CreatePriceBook)
            .WithName("CreatePriceBook");
        priceBooks.MapPut("/{id:long}/active", SetPriceBookActive)
            .WithName("SetPriceBookActive");
        priceBooks.MapGet("/{id:long}/items", GetPriceBookItems)
            .WithName("GetPriceBookItems");
        priceBooks.MapPut("/{id:long}/items", SavePriceBookItems)
            .WithName("SavePriceBookItems");
    }

    private static async Task<Results<Ok<IReadOnlyList<PriceBookResponse>>, ProblemHttpResult>> GetPriceBooks(
        StoreDatabase database,
        CancellationToken cancellationToken)
    {
        if (!database.IsConfigured) return DatabaseUnavailable<IReadOnlyList<PriceBookResponse>>();

        await using var connection = database.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT b.id, b.name, b.is_active, b.starts_on, b.ends_on, COUNT(i.product_id) AS item_count, b.created_at
            FROM price_books b
            LEFT JOIN price_book_items i ON i.price_book_id = b.id
            GROUP BY b.id, b.name, b.is_active, b.starts_on, b.ends_on, b.created_at
            ORDER BY b.created_at DESC, b.id DESC
            """;
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var results = new List<PriceBookResponse>();
        while (await reader.ReadAsync(cancellationToken)) results.Add(ReadPriceBook(reader));
        return TypedResults.Ok<IReadOnlyList<PriceBookResponse>>(results);
    }

    private static async Task<Results<Created<PriceBookResponse>, ProblemHttpResult>> CreatePriceBook(
        CreatePriceBookRequest request,
        StoreDatabase database,
        CancellationToken cancellationToken)
    {
        if (!database.IsConfigured) return DatabaseUnavailable<PriceBookResponse>();
        if (request.StartsOn.HasValue && request.EndsOn.HasValue && request.StartsOn > request.EndsOn)
        {
            return TypedResults.Problem("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.", statusCode: StatusCodes.Status400BadRequest);
        }

        await using var connection = database.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = "INSERT INTO price_books (name, starts_on, ends_on) VALUES (@name, @startsOn, @endsOn)";
        command.Parameters.AddWithValue("@name", request.Name.Trim());
        command.Parameters.AddWithValue("@startsOn", ToDatabaseDate(request.StartsOn));
        command.Parameters.AddWithValue("@endsOn", ToDatabaseDate(request.EndsOn));
        await command.ExecuteNonQueryAsync(cancellationToken);

        var id = command.LastInsertedId;
        var priceBook = await FindPriceBookAsync(id, database, cancellationToken);
        if (priceBook is null) return TypedResults.Problem("Không tải được bảng giá vừa tạo.", statusCode: StatusCodes.Status500InternalServerError);
        return TypedResults.Created($"/api/price-books/{id}", priceBook);
    }

    private static async Task<Results<Ok<PriceBookResponse>, NotFound, ProblemHttpResult>> SetPriceBookActive(
        long id,
        SetPriceBookActiveRequest request,
        StoreDatabase database,
        CancellationToken cancellationToken)
    {
        if (!database.IsConfigured) return DatabaseUnavailable<PriceBookResponse>();

        await using var connection = database.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = "UPDATE price_books SET is_active = @active WHERE id = @id";
        command.Parameters.AddWithValue("@active", request.IsActive);
        command.Parameters.AddWithValue("@id", id);
        await command.ExecuteNonQueryAsync(cancellationToken);

        var priceBook = await FindPriceBookAsync(id, database, cancellationToken);
        return priceBook is null ? TypedResults.NotFound() : TypedResults.Ok(priceBook);
    }

    private static async Task<Results<Ok<IReadOnlyList<PriceBookItemResponse>>, NotFound, ProblemHttpResult>> GetPriceBookItems(
        long id,
        StoreDatabase database,
        CancellationToken cancellationToken)
    {
        if (!database.IsConfigured) return DatabaseUnavailable<IReadOnlyList<PriceBookItemResponse>>();
        if (!await PriceBookExistsAsync(id, database, cancellationToken)) return TypedResults.NotFound();

        await using var connection = database.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT p.id, p.sku, p.name, p.unit, p.sale_price, i.price
            FROM products p
            LEFT JOIN price_book_items i ON i.product_id = p.id AND i.price_book_id = @priceBookId
            WHERE p.is_active = 1
            ORDER BY p.name, p.id
            """;
        command.Parameters.AddWithValue("@priceBookId", id);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var items = new List<PriceBookItemResponse>();
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(new PriceBookItemResponse(
                reader.GetInt64("id"),
                reader.GetString("sku"),
                reader.GetString("name"),
                reader.GetString("unit"),
                reader.GetDecimal("sale_price"),
                reader.IsDBNull(reader.GetOrdinal("price")) ? null : reader.GetDecimal("price")));
        }

        return TypedResults.Ok<IReadOnlyList<PriceBookItemResponse>>(items);
    }

    private static async Task<Results<NoContent, NotFound, ProblemHttpResult>> SavePriceBookItems(
        long id,
        SavePriceBookItemsRequest request,
        StoreDatabase database,
        CancellationToken cancellationToken)
    {
        if (!database.IsConfigured) return DatabaseUnavailable<PriceBookResponse>();
        if (request.Items.Select(item => item.ProductId).Distinct().Count() != request.Items.Count)
        {
            return TypedResults.Problem("Danh sách có mã hàng bị lặp.", statusCode: StatusCodes.Status400BadRequest);
        }

        await using var connection = database.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        await using (var existsCommand = connection.CreateCommand())
        {
            existsCommand.Transaction = transaction;
            existsCommand.CommandText = "SELECT id FROM price_books WHERE id = @id FOR UPDATE";
            existsCommand.Parameters.AddWithValue("@id", id);
            if (await existsCommand.ExecuteScalarAsync(cancellationToken) is null)
            {
                await transaction.RollbackAsync(cancellationToken);
                return TypedResults.NotFound();
            }
        }

        foreach (var item in request.Items)
        {
            await using var command = connection.CreateCommand();
            command.Transaction = transaction;
            command.CommandText = """
                INSERT INTO price_book_items (price_book_id, product_id, price)
                VALUES (@priceBookId, @productId, @price)
                ON DUPLICATE KEY UPDATE price = VALUES(price)
                """;
            command.Parameters.AddWithValue("@priceBookId", id);
            command.Parameters.AddWithValue("@productId", item.ProductId);
            command.Parameters.AddWithValue("@price", item.Price);
            try
            {
                await command.ExecuteNonQueryAsync(cancellationToken);
            }
            catch (MySqlException exception) when (exception.Number == 1452)
            {
                await transaction.RollbackAsync(cancellationToken);
                return TypedResults.Problem("Một hoặc nhiều sản phẩm không tồn tại.", statusCode: StatusCodes.Status400BadRequest);
            }
        }

        await transaction.CommitAsync(cancellationToken);
        return TypedResults.NoContent();
    }

    private static async Task<PriceBookResponse?> FindPriceBookAsync(long id, StoreDatabase database, CancellationToken cancellationToken)
    {
        await using var connection = database.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT b.id, b.name, b.is_active, b.starts_on, b.ends_on, COUNT(i.product_id) AS item_count, b.created_at
            FROM price_books b LEFT JOIN price_book_items i ON i.price_book_id = b.id
            WHERE b.id = @id GROUP BY b.id, b.name, b.is_active, b.starts_on, b.ends_on, b.created_at
            """;
        command.Parameters.AddWithValue("@id", id);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? ReadPriceBook(reader) : null;
    }

    private static async Task<bool> PriceBookExistsAsync(long id, StoreDatabase database, CancellationToken cancellationToken)
    {
        await using var connection = database.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT EXISTS(SELECT 1 FROM price_books WHERE id = @id)";
        command.Parameters.AddWithValue("@id", id);
        return Convert.ToBoolean(await command.ExecuteScalarAsync(cancellationToken));
    }

    private static PriceBookResponse ReadPriceBook(MySqlDataReader reader)
    {
        var createdAt = DateTime.SpecifyKind(reader.GetDateTime("created_at"), DateTimeKind.Utc);
        return new PriceBookResponse(
            reader.GetInt64("id"),
            reader.GetString("name"),
            reader.GetBoolean("is_active"),
            reader.IsDBNull(reader.GetOrdinal("starts_on")) ? null : DateOnly.FromDateTime(reader.GetDateTime("starts_on")),
            reader.IsDBNull(reader.GetOrdinal("ends_on")) ? null : DateOnly.FromDateTime(reader.GetDateTime("ends_on")),
            reader.GetInt32("item_count"),
            new DateTimeOffset(createdAt));
    }

    private static object ToDatabaseDate(DateOnly? date) =>
        date.HasValue ? date.Value.ToDateTime(TimeOnly.MinValue) : DBNull.Value;

    private static ProblemHttpResult DatabaseUnavailable<T>() =>
        TypedResults.Problem("MySQL is not configured. Set ConnectionStrings__StoreDb in appsettings.Development.json.", statusCode: StatusCodes.Status503ServiceUnavailable);
}
