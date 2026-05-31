using Hyperdrive.Manufacturing.Domain.Planning;
using Microsoft.EntityFrameworkCore;

namespace Hyperdrive.Manufacturing.Infrastructure.Persistence.Repositories;

internal sealed class EngineeringMasterRepository(ManufacturingDbContext db) : IEngineeringMasterRepository
{
    public Task<EngineeringMaster?> GetAsync(EngineeringMasterId id, CancellationToken ct) =>
        db.EngineeringMasters
            .Include(m => m.Operations).ThenInclude(o => o.Steps)
            .FirstOrDefaultAsync(m => m.Id == id, ct);

    public async Task AddAsync(EngineeringMaster master, CancellationToken ct) =>
        await db.EngineeringMasters.AddAsync(master, ct);
}
