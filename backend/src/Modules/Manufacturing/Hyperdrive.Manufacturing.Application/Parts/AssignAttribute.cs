using Hyperdrive.Manufacturing.Application.Abstractions;
using Hyperdrive.Manufacturing.Domain.Parts;
using Hyperdrive.SharedKernel.Results;

namespace Hyperdrive.Manufacturing.Application.Parts;

public sealed record AssignAttributeCommand(Guid PartId, string Key, string Value);

public sealed class AssignAttributeHandler(IPartRepository repository, IUnitOfWork uow)
{
    public async Task<Result> HandleAsync(AssignAttributeCommand cmd, CancellationToken ct)
    {
        var part = await repository.GetAsync(new PartId(cmd.PartId), ct);
        if (part is null)
            return DomainError.NotFound("part.not_found", $"Part {cmd.PartId} not found.");

        var assigned = part.AssignAttribute(cmd.Key, cmd.Value);
        if (assigned.IsFailure) return assigned;

        await uow.SaveChangesAsync(ct);
        return Result.Success();
    }
}
