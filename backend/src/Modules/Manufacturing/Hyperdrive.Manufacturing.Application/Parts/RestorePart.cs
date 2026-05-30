using Hyperdrive.Manufacturing.Application.Abstractions;
using Hyperdrive.Manufacturing.Domain.Parts;
using Hyperdrive.SharedKernel.Results;

namespace Hyperdrive.Manufacturing.Application.Parts;

public sealed record RestorePartCommand(Guid Id);

public sealed class RestorePartHandler(IPartRepository repository, IUnitOfWork uow)
{
    public async Task<Result> HandleAsync(RestorePartCommand cmd, CancellationToken ct)
    {
        var part = await repository.GetAsync(new PartId(cmd.Id), ct);
        if (part is null)
            return DomainError.NotFound("part.not_found", $"Part {cmd.Id} not found.");

        var result = part.Restore();
        if (result.IsFailure) return result;

        await uow.SaveChangesAsync(ct);
        return Result.Success();
    }
}
