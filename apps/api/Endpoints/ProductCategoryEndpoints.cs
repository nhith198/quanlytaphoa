using api.Contracts;
using api.Data;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;

namespace api.Endpoints;

public static class ProductCategoryEndpoints
{
    public static void MapProductCategoryEndpoints(this WebApplication app)
    {
        var categories = app.MapGroup("/api/product-categories").WithTags("Product Categories");
        categories.MapPost("/", CreateCategory)
            .WithName("CreateProductCategory")
            .WithSummary("Creates a product category.");
        categories.MapDelete("/{id:long}", DeleteCategory)
            .WithName("DeleteProductCategory")
            .WithSummary("Deletes a category that is not assigned to a product.");
    }

    private static async Task<Results<Created<ProductCategoryResponse>, Conflict<ProblemDetails>, ProblemHttpResult>> CreateCategory(
        CreateProductCategoryRequest request,
        StoreDatabase database,
        CancellationToken cancellationToken)
    {
        if (!database.IsConfigured) return DatabaseUnavailable();
        var name = request.Name.Trim();
        if (string.IsNullOrWhiteSpace(name)) return TypedResults.Problem("Tên nhóm hàng không được để trống.", statusCode: StatusCodes.Status400BadRequest);

        await using var connection = database.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = "INSERT INTO product_categories (name) VALUES (@name)";
        command.Parameters.AddWithValue("@name", name);
        try
        {
            await command.ExecuteNonQueryAsync(cancellationToken);
        }
        catch (MySqlException exception) when (exception.Number == 1062)
        {
            return TypedResults.Conflict(new ProblemDetails { Title = "Tên nhóm hàng đã tồn tại.", Status = StatusCodes.Status409Conflict });
        }

        var id = command.LastInsertedId;
        return TypedResults.Created($"/api/product-categories/{id}", new ProductCategoryResponse(id, name));
    }

    private static async Task<Results<NoContent, NotFound, Conflict<ProblemDetails>, ProblemHttpResult>> DeleteCategory(
        long id,
        StoreDatabase database,
        CancellationToken cancellationToken)
    {
        if (!database.IsConfigured) return DatabaseUnavailable();
        await using var connection = database.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = "DELETE FROM product_categories WHERE id = @id";
        command.Parameters.AddWithValue("@id", id);
        try
        {
            var affected = await command.ExecuteNonQueryAsync(cancellationToken);
            return affected == 0 ? TypedResults.NotFound() : TypedResults.NoContent();
        }
        catch (MySqlException exception) when (exception.Number == 1451)
        {
            return TypedResults.Conflict(new ProblemDetails { Title = "Không thể xóa nhóm đang có hàng hóa.", Status = StatusCodes.Status409Conflict });
        }
    }

    private static ProblemHttpResult DatabaseUnavailable() =>
        TypedResults.Problem("MySQL is not configured.", statusCode: StatusCodes.Status503ServiceUnavailable);
}
