using Hyperdrive.Engineering.Domain.Parts;
using Microsoft.EntityFrameworkCore;

namespace Hyperdrive.Engineering.Infrastructure.Persistence.Repositories;

internal sealed class PartRepository(EngineeringDbContext db) : IPartRepository
{
    public Task<Part?> GetAsync(PartId id, CancellationToken ct) =>
        db.Parts
            .Include(p => p.Revisions).ThenInclude(r => r.Lines)
            .FirstOrDefaultAsync(p => p.Id == id, ct);

    public Task<Part?> FindByNumberAsync(PartNumber number, CancellationToken ct) =>
        db.Parts
            .Include(p => p.Revisions).ThenInclude(r => r.Lines)
            .FirstOrDefaultAsync(p => p.PartNumber == number, ct);

    public Task<bool> ExistsAsync(PartNumber number, CancellationToken ct) =>
        db.Parts.AnyAsync(p => p.PartNumber == number, ct);

    public async Task AddAsync(Part part, CancellationToken ct) =>
        await db.Parts.AddAsync(part, ct);
}
