using Hyperdrive.Manufacturing.Application.Abstractions;
using Hyperdrive.Manufacturing.Application.Parts;
using Hyperdrive.Manufacturing.Domain.Parts;
using Hyperdrive.Manufacturing.Infrastructure.Persistence;
using Hyperdrive.Manufacturing.Infrastructure.Persistence.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Hyperdrive.Manufacturing.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddManufacturingInfrastructure(
        this IServiceCollection services,
        string connectionString)
    {
        services.AddDbContext<ManufacturingDbContext>(opt =>
            opt.UseNpgsql(connectionString, npg =>
                npg.MigrationsHistoryTable("__ef_migrations_history", ManufacturingDbContext.SchemaName)));

        services.AddScoped<IUnitOfWork>(sp => sp.GetRequiredService<ManufacturingDbContext>());
        services.AddScoped<IPartRepository, PartRepository>();
        services.AddScoped<IPartReader, PartReader>();

        return services;
    }
}
