namespace Hyperdrive.Manufacturing.Domain.Planning;

public interface IEngineeringMasterRepository
{
    Task<EngineeringMaster?> GetAsync(EngineeringMasterId id, CancellationToken ct);
    Task AddAsync(EngineeringMaster master, CancellationToken ct);
}
