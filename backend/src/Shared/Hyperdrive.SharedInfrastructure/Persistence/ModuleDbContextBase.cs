using Hyperdrive.SharedInfrastructure.Events;
using Hyperdrive.SharedKernel.Domain;
using Microsoft.EntityFrameworkCore;

namespace Hyperdrive.SharedInfrastructure.Persistence;

/// <summary>
/// Base DbContext for modules. Owns its Postgres schema and dispatches
/// aggregate domain events on SaveChanges.
/// </summary>
public abstract class ModuleDbContextBase(
    DbContextOptions options,
    IDomainEventDispatcher dispatcher) : DbContext(options)
{
    protected abstract string Schema { get; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema(Schema);
        base.OnModelCreating(modelBuilder);
    }

    public override async Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        var aggregates = ChangeTracker
            .Entries<IHasDomainEvents>()
            .Select(e => e.Entity)
            .Where(a => a.DomainEvents.Count > 0)
            .ToArray();

        var events = aggregates.SelectMany(a => a.DomainEvents).ToArray();
        foreach (var a in aggregates) a.ClearDomainEvents();

        var written = await base.SaveChangesAsync(ct).ConfigureAwait(false);

        if (events.Length > 0)
            await dispatcher.DispatchAsync(events, ct).ConfigureAwait(false);

        return written;
    }
}
