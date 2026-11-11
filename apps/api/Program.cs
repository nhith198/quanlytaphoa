using api.Data;
using api.Endpoints;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddValidation();
builder.Services.AddSingleton<StoreDatabase>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapProductEndpoints();
app.MapProductCategoryEndpoints();
app.MapProductTransferEndpoints();
app.MapPriceBookEndpoints();
app.MapInventoryEndpoints();

var storeDatabase = app.Services.GetRequiredService<StoreDatabase>();
if (storeDatabase.IsConfigured)
{
    await storeDatabase.InitializeAsync();
}

app.MapGet("/api/health", (StoreDatabase database) =>
        TypedResults.Ok(new HealthResponse("ok", DateTimeOffset.UtcNow, database.IsConfigured, database.DatabaseName)))
    .WithName("GetHealth")
    .WithSummary("Checks whether the API is responding.");

app.Run();

/// <summary>Represents the API health status.</summary>
public sealed record HealthResponse(string Status, DateTimeOffset UtcTime, bool DatabaseConfigured, string? DatabaseName);
