using Hyperdrive.Manufacturing.Application.Parts;
using Microsoft.EntityFrameworkCore;

namespace Hyperdrive.Manufacturing.Infrastructure.Persistence.Repositories;

internal sealed class PartReader(ManufacturingDbContext db) : IPartReader
{
    public async Task<IReadOnlyList<PartSummaryDto>> ListAsync(string? search, int limit, CancellationToken ct)
    {
        var query = db.Parts.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToUpperInvariant();
            query = query.Where(p =>
                EF.Functions.ILike(p.PartNumber.Value, $"%{s}%") ||
                EF.Functions.ILike(p.Name, $"%{s}%"));
        }

        return await query
            .OrderByDescending(p => p.CreatedAt)
            .Take(Math.Clamp(limit, 1, 200))
            .Select(p => new PartSummaryDto(
                p.Id.Value,
                p.PartNumber.Value,
                p.Name,
                p.Revision.Value,
                p.Lifecycle.ToString(),
                p.CreatedAt))
            .ToListAsync(ct);
    }

    public async Task<PartDto?> GetAsync(Guid id, CancellationToken ct)
    {
        var part = await db.Parts.AsNoTracking().FirstOrDefaultAsync(p => p.Id == new Hyperdrive.Manufacturing.Domain.Parts.PartId(id), ct);
        if (part is null) return null;

        return new PartDto(
            part.Id.Value,
            part.PartNumber.Value,
            part.Name,
            part.Revision.Value,
            part.Lifecycle.ToString(),
            part.CreatedAt,
            part.Attributes.ToDictionary(a => a.Key, a => a.Value));
    }
}
