using Hyperdrive.Manufacturing.Application.Abstractions;
using Hyperdrive.Manufacturing.Domain.Planning;
using Hyperdrive.SharedKernel.Results;

namespace Hyperdrive.Manufacturing.Application.Planning;

public sealed record UpdateMasterHeaderCommand(
    Guid MasterId,
    string PartNumber,
    string Revision,
    string Description,
    string Changelog,
    IReadOnlyList<string> Approvers);

public sealed class UpdateMasterHeaderHandler(IEngineeringMasterRepository repository, IUnitOfWork uow)
{
    public async Task<Result> HandleAsync(UpdateMasterHeaderCommand cmd, CancellationToken ct)
    {
        var master = await repository.GetAsync(new EngineeringMasterId(cmd.MasterId), ct);
        if (master is null)
            return DomainError.NotFound("master.not_found", $"Engineering master {cmd.MasterId} not found.");

        var result = master.UpdateHeader(cmd.PartNumber, cmd.Revision, cmd.Description, cmd.Changelog, cmd.Approvers ?? []);
        if (result.IsFailure) return result;

        await uow.SaveChangesAsync(ct);
        return Result.Success();
    }
}
