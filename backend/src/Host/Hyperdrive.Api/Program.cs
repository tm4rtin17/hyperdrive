using Hyperdrive.Engineering.Api;
using Hyperdrive.Engineering.Infrastructure.Persistence;
using Hyperdrive.SharedInfrastructure;
using Microsoft.EntityFrameworkCore;
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
    var db = scope.ServiceProvider.GetRequiredService<EngineeringDbContext>();
    await db.Database.EnsureCreatedAsync();
}

app.MapGet("/health", () => Results.Ok(new { status = "ok", service = "hyperdrive-api" }));

// === Module endpoint mapping ===
app.MapEngineeringEndpoints();
// Future: app.MapQualityEndpoints();

app.Run();
