using Hyperdrive.Engineering.Application.Abstractions;
using Hyperdrive.Engineering.Domain.Parts;
using Hyperdrive.SharedKernel.Results;

namespace Hyperdrive.Engineering.Application.Parts;

/// <summary>
/// Soft-delete: archives the part rather than removing it, preserving history and
/// traceability while hiding it from the default catalog.
/// </summary>
public sealed record DeletePartCommand(Guid Id);

public sealed class DeletePartHandler(IPartRepository repository, IUnitOfWork uow)
{
    public async Task<Result> HandleAsync(DeletePartCommand cmd, CancellationToken ct)
    {
        var part = await repository.GetAsync(new PartId(cmd.Id), ct);
        if (part is null)
            return DomainError.NotFound("part.not_found", $"Part {cmd.Id} not found.");

        var result = part.Archive();
        if (result.IsFailure) return result;

        await uow.SaveChangesAsync(ct);
        return Result.Success();
    }
}
