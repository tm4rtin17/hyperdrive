namespace Hyperdrive.Manufacturing.Application.Planning;

public interface IEngineeringMasterReader
{
    Task<IReadOnlyList<EngineeringMasterSummaryDto>> ListAsync(string? search, int limit, CancellationToken ct);
    Task<EngineeringMasterDto?> GetAsync(Guid id, CancellationToken ct);
}
