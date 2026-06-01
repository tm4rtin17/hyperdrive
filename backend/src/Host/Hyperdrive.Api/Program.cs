using Hyperdrive.Engineering.Api;
using Hyperdrive.Engineering.Infrastructure.Persistence;
using Hyperdrive.Manufacturing.Api;
using Hyperdrive.Manufacturing.Infrastructure.Persistence;
using Hyperdrive.SharedInfrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((ctx, cfg) => cfg
    .ReadFrom.Configuration(ctx.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console());

var cs = builder.Configuration.GetConnectionString("Postgres")
         ?? throw new InvalidOperationException("Missing ConnectionStrings:Postgres.");

builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins(builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? ["http://localhost:3000"])
    .AllowAnyHeader()
    .AllowAnyMethod()));

builder.Services.AddProblemDetails();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddSharedInfrastructure();

// === Module registration ===
builder.Services.AddEngineeringModule(cs);
builder.Services.AddManufacturingModule(cs);
// Future: builder.Services.AddQualityModule(cs);
// Future: builder.Services.AddInventoryModule(cs);

var app = builder.Build();

app.UseSerilogRequestLogging();
app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseCors();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();

    await using var scope = app.Services.CreateAsyncScope();

    // EnsureCreated builds the database + this context's tables on a fresh volume.
    var engDb = scope.ServiceProvider.GetRequiredService<EngineeringDbContext>();
    await engDb.Database.EnsureCreatedAsync();

    // Additional module contexts share the same database, so EnsureCreated is a no-op
    // for them. Create their tables only when this module's schema isn't there yet.
    var mfgDb = scope.ServiceProvider.GetRequiredService<ManufacturingDbContext>();
    var schemaExists = await mfgDb.Database
        .SqlQuery<bool>($"SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = {ManufacturingDbContext.SchemaName}) AS \"Value\"")
        .SingleAsync();
    if (!schemaExists)
        await mfgDb.GetService<IRelationalDatabaseCreator>().CreateTablesAsync();

    // Incremental, data-preserving schema additions for volumes created before a feature landed.
    // EnsureCreated/CreateTables only build missing schemas wholesale, so new tables on an
    // existing database must be created idempotently here. Never drops or rewrites existing data.
    await mfgDb.Database.ExecuteSqlRawAsync(
        """
        CREATE TABLE IF NOT EXISTS manufacturing.operation_dependencies (
            master_id uuid NOT NULL REFERENCES manufacturing.engineering_masters(id) ON DELETE CASCADE,
            predecessor_id uuid NOT NULL,
            successor_id uuid NOT NULL,
            CONSTRAINT pk_operation_dependencies PRIMARY KEY (master_id, predecessor_id, successor_id)
        );

        ALTER TABLE manufacturing.operations
            ADD COLUMN IF NOT EXISTS instructions text NOT NULL DEFAULT '';

        CREATE TABLE IF NOT EXISTS manufacturing.operation_attachments (
            id uuid PRIMARY KEY,
            operation_id uuid NOT NULL REFERENCES manufacturing.operations(id) ON DELETE CASCADE,
            file_name varchar(256) NOT NULL,
            content_type varchar(128) NOT NULL,
            file_size bigint NOT NULL,
            uploaded_at timestamptz NOT NULL,
            data bytea NOT NULL
        );
        CREATE INDEX IF NOT EXISTS ix_operation_attachments_operation_id
            ON manufacturing.operation_attachments (operation_id);

        ALTER TABLE manufacturing.engineering_masters
            ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
            ADD COLUMN IF NOT EXISTS changelog text NOT NULL DEFAULT '',
            ADD COLUMN IF NOT EXISTS approvers text[] NOT NULL DEFAULT '{{}}',
            ADD COLUMN IF NOT EXISTS revision varchar(3) NOT NULL DEFAULT 'A';

        CREATE TABLE IF NOT EXISTS manufacturing.master_attachments (
            id uuid PRIMARY KEY,
            master_id uuid NOT NULL REFERENCES manufacturing.engineering_masters(id) ON DELETE CASCADE,
            file_name varchar(256) NOT NULL,
            content_type varchar(128) NOT NULL,
            file_size bigint NOT NULL,
            uploaded_at timestamptz NOT NULL,
            data bytea NOT NULL
        );
        CREATE INDEX IF NOT EXISTS ix_master_attachments_master_id
            ON manufacturing.master_attachments (master_id);

        ALTER TABLE manufacturing.operations
            ADD COLUMN IF NOT EXISTS primary_buyoff_role integer NULL,
            ADD COLUMN IF NOT EXISTS secondary_buyoff_role integer NULL;
        ALTER TABLE manufacturing.steps
            ADD COLUMN IF NOT EXISTS primary_buyoff_role integer NULL,
            ADD COLUMN IF NOT EXISTS secondary_buyoff_role integer NULL;
        """);
}

app.MapGet("/health", () => Results.Ok(new { status = "ok", service = "hyperdrive-api" }));

// === Module endpoint mapping ===
app.MapEngineeringEndpoints();
app.MapManufacturingEndpoints();
// Future: app.MapQualityEndpoints();

app.Run();
