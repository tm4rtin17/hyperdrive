using Hyperdrive.Manufacturing.Application.Abstractions;
using Hyperdrive.Manufacturing.Domain.Planning;
using Hyperdrive.SharedKernel.Results;

namespace Hyperdrive.Manufacturing.Application.Planning;

public sealed record OperationLinkInput(Guid PredecessorId, Guid SuccessorId);

public sealed record UpdateSequenceCommand(Guid MasterId, IReadOnlyList<OperationLinkInput> Links);

public sealed class UpdateSequenceHandler(IEngineeringMasterRepository repository, IUnitOfWork uow)
{
    public async Task<Result> HandleAsync(UpdateSequenceCommand cmd, CancellationToken ct)
    {
        var master = await repository.GetAsync(new EngineeringMasterId(cmd.MasterId), ct);
        if (master is null)
            return DomainError.NotFound("master.not_found", $"Engineering master {cmd.MasterId} not found.");

        var result = master.SetSequence(
            cmd.Links.Select(l => (l.PredecessorId, l.SuccessorId)));
        if (result.IsFailure) return result;

        await uow.SaveChangesAsync(ct);
        return Result.Success();
    }
}
