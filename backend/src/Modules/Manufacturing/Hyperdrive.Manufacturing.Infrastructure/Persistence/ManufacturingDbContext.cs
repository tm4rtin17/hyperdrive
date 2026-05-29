using Hyperdrive.Manufacturing.Application.Abstractions;
using Hyperdrive.Manufacturing.Domain.Parts;
using Hyperdrive.SharedInfrastructure.Events;
using Hyperdrive.SharedInfrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Hyperdrive.Manufacturing.Infrastructure.Persistence;

public sealed class ManufacturingDbContext(
    DbContextOptions<ManufacturingDbContext> options,
    IDomainEventDispatcher dispatcher)
    : ModuleDbContextBase(options, dispatcher), IUnitOfWork
{
    public const string SchemaName = "manufacturing";

    protected override string Schema => SchemaName;

    public DbSet<Part> Parts => Set<Part>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ManufacturingDbContext).Assembly);
    }
}
