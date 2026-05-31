using Hyperdrive.Manufacturing.Application.Planning;
using Hyperdrive.Manufacturing.Domain.Planning;
using Microsoft.EntityFrameworkCore;

namespace Hyperdrive.Manufacturing.Infrastructure.Persistence.Repositories;

internal sealed class EngineeringMasterReader(ManufacturingDbContext db) : IEngineeringMasterReader
{
    public async Task<IReadOnlyList<EngineeringMasterSummaryDto>> ListAsync(string? search, int limit, CancellationToken ct)
    {
        var query = db.EngineeringMasters.AsNoTracking().Include(m => m.Operations).AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            query = query.Where(m =>
                EF.Functions.ILike(m.PartNumber, $"%{s}%") ||
                (m.PartName != null && EF.Functions.ILike(m.PartName, $"%{s}%")));
        }

        var masters = await query
            .OrderByDescending(m => m.CreatedAt)
            .Take(Math.Clamp(limit, 1, 200))
            .ToListAsync(ct);

        return masters.Select(m => new EngineeringMasterSummaryDto(
            m.Id.Value, m.PartNumber, m.PartName, m.Status.ToString(), m.CreatedAt, m.Operations.Count)).ToList();
    }

    public async Task<EngineeringMasterDto?> GetAsync(Guid id, CancellationToken ct)
    {
        var master = await db.EngineeringMasters.AsNoTracking()
            .Include(m => m.Operations).ThenInclude(o => o.Steps)
            .FirstOrDefaultAsync(m => m.Id == new EngineeringMasterId(id), ct);

        return master?.ToDto();
    }
}
