using Hyperdrive.Engineering.Application.Parts;
using Hyperdrive.Engineering.Domain.Parts;
using Microsoft.EntityFrameworkCore;

namespace Hyperdrive.Engineering.Infrastructure.Persistence.Repositories;

internal sealed class PartReader(EngineeringDbContext db) : IPartReader
{
    public async Task<IReadOnlyList<PartSummaryDto>> ListAsync(string? search, int limit, bool includeArchived, CancellationToken ct)
    {
        var query = db.Parts.AsNoTracking().Include(p => p.Revisions).AsQueryable();

        if (!includeArchived)
            query = query.Where(p => !p.IsArchived);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToUpperInvariant();
            query = query.Where(p =>
                EF.Functions.ILike(p.PartNumber.Value, $"%{s}%") ||
                EF.Functions.ILike(p.Name, $"%{s}%"));
        }

        var parts = await query
            .OrderByDescending(p => p.CreatedAt)
            .Take(Math.Clamp(limit, 1, 200))
            .ToListAsync(ct);

        return parts.Select(p => p.ToSummary()).ToList();
    }

    public async Task<PartDto?> GetAsync(Guid id, CancellationToken ct)
    {
        var part = await db.Parts.AsNoTracking().Include(p => p.Revisions)
            .FirstOrDefaultAsync(p => p.Id == new PartId(id), ct);
        return part?.ToDto();
    }

    public async Task<PartDto?> GetByNumberAsync(string partNumber, CancellationToken ct)
    {
        var numberResult = PartNumber.Create(partNumber);
        if (numberResult.IsFailure) return null;
        var number = numberResult.Value!;

        var part = await db.Parts.AsNoTracking().Include(p => p.Revisions)
            .FirstOrDefaultAsync(p => p.PartNumber == number, ct);
        return part?.ToDto();
    }
}
