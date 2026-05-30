using Hyperdrive.Manufacturing.Application.Abstractions;
using Hyperdrive.Manufacturing.Domain.Parts;
using Hyperdrive.SharedKernel.Results;
using Hyperdrive.SharedKernel.Time;

namespace Hyperdrive.Manufacturing.Application.Lifecycle;

public sealed record ReleaseRevisionCommand(Guid PartId, Guid RevisionId);
public sealed record ObsoleteRevisionCommand(Guid PartId, Guid RevisionId);
public sealed record RestoreRevisionCommand(Guid PartId, Guid RevisionId);
public sealed record CreateNextRevisionCommand(Guid PartId);

public sealed class ReleaseRevisionHandler(IPartRepository repository, IUnitOfWork uow, IClock clock)
{
    public async Task<Result> HandleAsync(ReleaseRevisionCommand cmd, CancellationToken ct)
    {
        var part = await repository.GetAsync(new PartId(cmd.PartId), ct);
        if (part is null)
            return DomainError.NotFound("part.not_found", $"Part {cmd.PartId} not found.");

        var result = part.ReleaseRevision(new PartRevisionId(cmd.RevisionId), clock.UtcNow);
        if (result.IsFailure) return result;

        await uow.SaveChangesAsync(ct);
        return Result.Success();
    }
}

public sealed class ObsoleteRevisionHandler(IPartRepository repository, IUnitOfWork uow)
{
    public async Task<Result> HandleAsync(ObsoleteRevisionCommand cmd, CancellationToken ct)
    {
        var part = await repository.GetAsync(new PartId(cmd.PartId), ct);
        if (part is null)
            return DomainError.NotFound("part.not_found", $"Part {cmd.PartId} not found.");

        var result = part.ObsoleteRevision(new PartRevisionId(cmd.RevisionId));
        if (result.IsFailure) return result;

        await uow.SaveChangesAsync(ct);
        return Result.Success();
    }
}

public sealed class RestoreRevisionHandler(IPartRepository repository, IUnitOfWork uow)
{
    public async Task<Result> HandleAsync(RestoreRevisionCommand cmd, CancellationToken ct)
    {
        var part = await repository.GetAsync(new PartId(cmd.PartId), ct);
        if (part is null)
            return DomainError.NotFound("part.not_found", $"Part {cmd.PartId} not found.");

        var result = part.RestoreRevision(new PartRevisionId(cmd.RevisionId));
        if (result.IsFailure) return result;

        await uow.SaveChangesAsync(ct);
        return Result.Success();
    }
}

public sealed class CreateNextRevisionHandler(IPartRepository repository, IUnitOfWork uow, IClock clock)
{
    public async Task<Result<PartRevisionDto>> HandleAsync(CreateNextRevisionCommand cmd, CancellationToken ct)
    {
        var part = await repository.GetAsync(new PartId(cmd.PartId), ct);
        if (part is null)
            return DomainError.NotFound("part.not_found", $"Part {cmd.PartId} not found.");

        var result = part.CreateNextRevision(clock.UtcNow);
        if (result.IsFailure) return result.Error;

        await uow.SaveChangesAsync(ct);

        var rev = result.Value!;
        return new PartRevisionDto(
            rev.Id.Value, rev.Rev.Value, rev.Lifecycle.ToString(), rev.Ordinal,
            rev.CreatedAt, rev.ReleasedAt, rev.Lines.Count);
    }
}
