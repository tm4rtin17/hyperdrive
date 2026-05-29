using Hyperdrive.Manufacturing.Domain.Parts;
using Microsoft.EntityFrameworkCore;

namespace Hyperdrive.Manufacturing.Infrastructure.Persistence.Repositories;

internal sealed class PartRepository(ManufacturingDbContext db) : IPartRepository
{
    public Task<Part?> GetAsync(PartId id, CancellationToken ct) =>
        db.Parts.FirstOrDefaultAsync(p => p.Id == id, ct);

    public Task<Part?> FindByNumberAsync(PartNumber number, CancellationToken ct) =>
        db.Parts.FirstOrDefaultAsync(p => p.PartNumber == number, ct);

    public Task<bool> ExistsAsync(PartNumber number, CancellationToken ct) =>
        db.Parts.AnyAsync(p => p.PartNumber == number, ct);

    public async Task AddAsync(Part part, CancellationToken ct) =>
        await db.Parts.AddAsync(part, ct);
}
