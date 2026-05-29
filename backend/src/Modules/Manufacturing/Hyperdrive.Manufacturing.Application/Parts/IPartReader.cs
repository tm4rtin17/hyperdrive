namespace Hyperdrive.Manufacturing.Application.Parts;

/// <summary>
/// Read-side abstraction. Lives separately from IPartRepository so queries
/// can bypass the aggregate and project directly to DTOs when needed.
/// </summary>
public interface IPartReader
{
    Task<IReadOnlyList<PartSummaryDto>> ListAsync(string? search, int limit, CancellationToken ct);
    Task<PartDto?> GetAsync(Guid id, CancellationToken ct);
}
