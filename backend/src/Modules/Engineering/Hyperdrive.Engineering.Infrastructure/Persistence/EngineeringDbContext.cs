using Hyperdrive.Engineering.Application.Abstractions;
using Hyperdrive.Engineering.Domain.Parts;
using Hyperdrive.SharedInfrastructure.Events;
using Hyperdrive.SharedInfrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Hyperdrive.Engineering.Infrastructure.Persistence;

public sealed class EngineeringDbContext(
    DbContextOptions<EngineeringDbContext> options,
    IDomainEventDispatcher dispatcher)
    : ModuleDbContextBase(options, dispatcher), IUnitOfWork
{
    public const string SchemaName = "engineering";

    protected override string Schema => SchemaName;

    public DbSet<Part> Parts => Set<Part>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(EngineeringDbContext).Assembly);
    }
}
