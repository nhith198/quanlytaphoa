using MySqlConnector;

namespace api.Data;

public sealed class StoreDatabase
{
    private const string DefaultDatabaseName = "quanly_taphoa";
    private readonly string? _connectionString;

    public StoreDatabase(IConfiguration configuration)
    {
        var configuredConnectionString = configuration.GetConnectionString("StoreDb");
        if (string.IsNullOrWhiteSpace(configuredConnectionString))
        {
            return;
        }

        if (configuredConnectionString.Contains("CHANGE_ME", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var builder = new MySqlConnectionStringBuilder(configuredConnectionString);
        if (string.IsNullOrWhiteSpace(builder.Database))
        {
            builder.Database = DefaultDatabaseName;
        }

        if (!IsSafeDatabaseName(builder.Database))
        {
            throw new InvalidOperationException("The configured database name contains unsupported characters.");
        }

        _connectionString = builder.ConnectionString;
        DatabaseName = builder.Database;
    }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_connectionString);

    public string? DatabaseName { get; }

    public MySqlConnection CreateConnection()
    {
        if (_connectionString is null)
        {
            throw new InvalidOperationException("The StoreDb connection string is not configured.");
        }

        return new MySqlConnection(_connectionString);
    }

    public async Task InitializeAsync(CancellationToken cancellationToken = default)
    {
        if (_connectionString is null || DatabaseName is null)
        {
            return;
        }

        var serverBuilder = new MySqlConnectionStringBuilder(_connectionString)
        {
            Database = string.Empty,
        };

        await using (var serverConnection = new MySqlConnection(serverBuilder.ConnectionString))
        {
            await serverConnection.OpenAsync(cancellationToken);
            await using var createDatabase = serverConnection.CreateCommand();
            createDatabase.CommandText = $"CREATE DATABASE IF NOT EXISTS `{DatabaseName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci";
            await createDatabase.ExecuteNonQueryAsync(cancellationToken);
        }

        await using var connection = CreateConnection();
        await connection.OpenAsync(cancellationToken);

        foreach (var statement in SchemaStatements)
        {
            await using var command = connection.CreateCommand();
            command.CommandText = statement;
            await command.ExecuteNonQueryAsync(cancellationToken);
        }

        await EnsureProductColumnsAsync(connection, cancellationToken);
        await SeedCategoriesAsync(connection, cancellationToken);
    }

    private static readonly string[] SchemaStatements =
    [
        """
        CREATE TABLE IF NOT EXISTS product_categories (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            name VARCHAR(120) NOT NULL,
            created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            PRIMARY KEY (id),
            UNIQUE KEY uq_product_categories_name (name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """,
        """
        CREATE TABLE IF NOT EXISTS products (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            sku VARCHAR(64) NOT NULL,
            barcode VARCHAR(64) NULL,
            name VARCHAR(200) NOT NULL,
            category_id BIGINT UNSIGNED NULL,
            unit VARCHAR(40) NOT NULL,
            cost_price DECIMAL(18,2) NOT NULL DEFAULT 0,
            sale_price DECIMAL(18,2) NOT NULL DEFAULT 0,
            stock_quantity DECIMAL(18,3) NOT NULL DEFAULT 0,
            minimum_stock DECIMAL(18,3) NOT NULL DEFAULT 0,
            product_type VARCHAR(24) NOT NULL DEFAULT 'goods',
            supplier_name VARCHAR(160) NULL,
            location VARCHAR(120) NULL,
            is_direct_sale BOOLEAN NOT NULL DEFAULT TRUE,
            is_channel_linked BOOLEAN NOT NULL DEFAULT FALSE,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
            PRIMARY KEY (id),
            UNIQUE KEY uq_products_sku (sku),
            UNIQUE KEY uq_products_barcode (barcode),
            KEY ix_products_name (name),
            KEY ix_products_category_id (category_id),
            KEY ix_products_type (product_type),
            CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES product_categories (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """,
        """
        CREATE TABLE IF NOT EXISTS price_books (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            name VARCHAR(120) NOT NULL,
            starts_on DATE NULL,
            ends_on DATE NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
            PRIMARY KEY (id),
            KEY ix_price_books_active (is_active, starts_on, ends_on)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """,
        """
        CREATE TABLE IF NOT EXISTS price_book_items (
            price_book_id BIGINT UNSIGNED NOT NULL,
            product_id BIGINT UNSIGNED NOT NULL,
            price DECIMAL(18,2) NOT NULL,
            updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
            PRIMARY KEY (price_book_id, product_id),
            KEY ix_price_book_items_product (product_id),
            CONSTRAINT fk_price_book_items_book FOREIGN KEY (price_book_id) REFERENCES price_books (id),
            CONSTRAINT fk_price_book_items_product FOREIGN KEY (product_id) REFERENCES products (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """,
        """
        CREATE TABLE IF NOT EXISTS stock_takes (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            code VARCHAR(40) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'draft',
            note VARCHAR(500) NULL,
            created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            confirmed_at DATETIME(6) NULL,
            PRIMARY KEY (id),
            UNIQUE KEY uq_stock_takes_code (code),
            KEY ix_stock_takes_status_created (status, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """,
        """
        CREATE TABLE IF NOT EXISTS stock_take_items (
            stock_take_id BIGINT UNSIGNED NOT NULL,
            product_id BIGINT UNSIGNED NOT NULL,
            expected_quantity DECIMAL(18,3) NOT NULL,
            counted_quantity DECIMAL(18,3) NOT NULL,
            PRIMARY KEY (stock_take_id, product_id),
            KEY ix_stock_take_items_product (product_id),
            CONSTRAINT fk_stock_take_items_take FOREIGN KEY (stock_take_id) REFERENCES stock_takes (id),
            CONSTRAINT fk_stock_take_items_product FOREIGN KEY (product_id) REFERENCES products (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """,
        """
        CREATE TABLE IF NOT EXISTS inventory_vouchers (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            code VARCHAR(40) NOT NULL,
            voucher_type VARCHAR(24) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'draft',
            note VARCHAR(500) NULL,
            created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            confirmed_at DATETIME(6) NULL,
            PRIMARY KEY (id),
            UNIQUE KEY uq_inventory_vouchers_code (code),
            KEY ix_inventory_vouchers_type_status (voucher_type, status, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """,
        """
        CREATE TABLE IF NOT EXISTS inventory_voucher_items (
            voucher_id BIGINT UNSIGNED NOT NULL,
            product_id BIGINT UNSIGNED NOT NULL,
            quantity DECIMAL(18,3) NOT NULL,
            unit_cost DECIMAL(18,2) NOT NULL DEFAULT 0,
            PRIMARY KEY (voucher_id, product_id),
            KEY ix_inventory_voucher_items_product (product_id),
            CONSTRAINT fk_inventory_voucher_items_voucher FOREIGN KEY (voucher_id) REFERENCES inventory_vouchers (id),
            CONSTRAINT fk_inventory_voucher_items_product FOREIGN KEY (product_id) REFERENCES products (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """,
        """
        CREATE TABLE IF NOT EXISTS inventory_movements (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            product_id BIGINT UNSIGNED NOT NULL,
            movement_type VARCHAR(32) NOT NULL,
            reference_code VARCHAR(40) NOT NULL,
            quantity_before DECIMAL(18,3) NOT NULL,
            quantity_change DECIMAL(18,3) NOT NULL,
            quantity_after DECIMAL(18,3) NOT NULL,
            created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            PRIMARY KEY (id),
            KEY ix_inventory_movements_product_created (product_id, created_at),
            KEY ix_inventory_movements_reference (reference_code),
            CONSTRAINT fk_inventory_movements_product FOREIGN KEY (product_id) REFERENCES products (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """,
    ];

    private static readonly (string Name, string Definition)[] ProductColumnMigrations =
    [
        ("product_type", "VARCHAR(24) NOT NULL DEFAULT 'goods'"),
        ("supplier_name", "VARCHAR(160) NULL"),
        ("location", "VARCHAR(120) NULL"),
        ("is_direct_sale", "BOOLEAN NOT NULL DEFAULT TRUE"),
        ("is_channel_linked", "BOOLEAN NOT NULL DEFAULT FALSE"),
    ];

    private static async Task EnsureProductColumnsAsync(MySqlConnection connection, CancellationToken cancellationToken)
    {
        foreach (var (name, definition) in ProductColumnMigrations)
        {
            await using var command = connection.CreateCommand();
            command.CommandText = $"ALTER TABLE products ADD COLUMN `{name}` {definition}";
            try
            {
                await command.ExecuteNonQueryAsync(cancellationToken);
            }
            catch (MySqlException exception) when (exception.Number == 1060)
            {
            }
        }
    }

    private static async Task SeedCategoriesAsync(MySqlConnection connection, CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = """
            INSERT INTO product_categories (name)
            VALUES ('Thực phẩm khô'), ('Đồ uống'), ('Gia vị'), ('Đồ gia dụng')
            ON DUPLICATE KEY UPDATE name = VALUES(name)
            """;
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static bool IsSafeDatabaseName(string name) =>
        name.Length is > 0 and <= 64 && name.All(character => char.IsAsciiLetterOrDigit(character) || character == '_');
}
