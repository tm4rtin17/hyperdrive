using Hyperdrive.Manufacturing.Application.Abstractions;
using Hyperdrive.Manufacturing.Domain.Parts;
using Hyperdrive.SharedKernel.Results;

namespace Hyperdrive.Manufacturing.Application.Parts;

/// <summary>
/// Soft-delete: marks the part Obsolete rather than removing it, preserving
/// history and traceability while hiding it from the default catalog.
/// </summary>
public sealed record DeletePartCommand(Guid Id);

public sealed class DeletePartHandler(IPartRepository repository, IUnitOfWork uow)
{
    public async Task<Result> HandleAsync(DeletePartCommand cmd, CancellationToken ct)
    {
        var part = await repository.GetAsync(new PartId(cmd.Id), ct);
        if (part is null)
            return DomainError.NotFound("part.not_found", $"Part {cmd.Id} not found.");

        var result = part.MarkObsolete();
        if (result.IsFailure) return result;

        await uow.SaveChangesAsync(ct);
        return Result.Success();
    }
}
