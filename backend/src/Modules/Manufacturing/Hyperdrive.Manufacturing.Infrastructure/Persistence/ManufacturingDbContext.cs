using Hyperdrive.Manufacturing.Application.Abstractions;
using Hyperdrive.Manufacturing.Domain.Planning;
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

    public DbSet<EngineeringMaster> EngineeringMasters => Set<EngineeringMaster>();
    public DbSet<StepAttachment> StepAttachments => Set<StepAttachment>();
    public DbSet<OperationAttachment> OperationAttachments => Set<OperationAttachment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ManufacturingDbContext).Assembly);
    }
}
