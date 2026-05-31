using Hyperdrive.Manufacturing.Application.Abstractions;
using Hyperdrive.Manufacturing.Domain.Planning;
using Hyperdrive.SharedKernel.Results;
using Hyperdrive.SharedKernel.Time;

namespace Hyperdrive.Manufacturing.Application.Planning;

public sealed record CreateEngineeringMasterCommand(string PartNumber, Guid? PartId, string? PartName);

public sealed class CreateEngineeringMasterHandler(
    IEngineeringMasterRepository repository,
    IUnitOfWork uow,
    IClock clock)
{
    public async Task<Result<EngineeringMasterDto>> HandleAsync(CreateEngineeringMasterCommand cmd, CancellationToken ct)
    {
        var result = EngineeringMaster.Create(cmd.PartNumber, cmd.PartId, cmd.PartName, clock.UtcNow);
        if (result.IsFailure) return result.Error;

        var master = result.Value!;
        await repository.AddAsync(master, ct);
        await uow.SaveChangesAsync(ct);

        return master.ToDto();
    }
}
