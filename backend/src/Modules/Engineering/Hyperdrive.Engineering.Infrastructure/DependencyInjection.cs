using Hyperdrive.Engineering.Application.Abstractions;
using Hyperdrive.Engineering.Application.Lifecycle;
using Hyperdrive.Engineering.Application.Parts;
using Hyperdrive.Engineering.Domain.Parts;
using Hyperdrive.Engineering.Infrastructure.Persistence;
using Hyperdrive.Engineering.Infrastructure.Persistence.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Hyperdrive.Engineering.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddEngineeringInfrastructure(
        this IServiceCollection services,
        string connectionString)
    {
        services.AddDbContext<EngineeringDbContext>(opt =>
            opt.UseNpgsql(connectionString, npg =>
                npg.MigrationsHistoryTable("__ef_migrations_history", EngineeringDbContext.SchemaName)));

        services.AddScoped<IUnitOfWork>(sp => sp.GetRequiredService<EngineeringDbContext>());
        services.AddScoped<IPartRepository, PartRepository>();
        services.AddScoped<IPartReader, PartReader>();
        services.AddScoped<ILifecycleReader, LifecycleReader>();

        return services;
    }
}
