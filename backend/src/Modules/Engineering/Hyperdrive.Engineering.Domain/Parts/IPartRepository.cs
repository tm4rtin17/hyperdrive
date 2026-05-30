namespace Hyperdrive.Engineering.Domain.Parts;

public interface IPartRepository
{
    Task<Part?> GetAsync(PartId id, CancellationToken ct);
    Task<Part?> FindByNumberAsync(PartNumber number, CancellationToken ct);
    Task<bool> ExistsAsync(PartNumber number, CancellationToken ct);
    Task AddAsync(Part part, CancellationToken ct);
}
