using Hyperdrive.Engineering.Application.Abstractions;
using Hyperdrive.Engineering.Domain.Parts;
using Hyperdrive.SharedKernel.Results;

namespace Hyperdrive.Engineering.Application.Lifecycle;

public sealed record AddBomLineCommand(
    Guid PartId, Guid RevisionId, string ChildPartNumber, decimal Quantity, int? FindNumber, string? ReferenceDesignator);

public sealed record UpdateBomLineCommand(
    Guid PartId, Guid RevisionId, Guid LineId, decimal Quantity, int? FindNumber, string? ReferenceDesignator);

public sealed record RemoveBomLineCommand(Guid PartId, Guid RevisionId, Guid LineId);

public sealed class AddBomLineHandler(IPartRepository repository, IUnitOfWork uow)
{
    public async Task<Result> HandleAsync(AddBomLineCommand cmd, CancellationToken ct)
    {
        var part = await repository.GetAsync(new PartId(cmd.PartId), ct);
        if (part is null)
            return DomainError.NotFound("part.not_found", $"Part {cmd.PartId} not found.");

        var numberResult = PartNumber.Create(cmd.ChildPartNumber);
        if (numberResult.IsFailure) return numberResult.Error;

        var child = await repository.FindByNumberAsync(numberResult.Value!, ct);
        if (child is null)
            return DomainError.Validation("bom.child.not_found", $"Child part {numberResult.Value} does not exist.");
        if (child.IsArchived)
            return DomainError.Validation("bom.child.archived", $"Child part {child.PartNumber} is archived.");

        var result = part.AddBomLine(
            new PartRevisionId(cmd.RevisionId), child.Id, cmd.Quantity, cmd.FindNumber, cmd.ReferenceDesignator);
        if (result.IsFailure) return result;

        await uow.SaveChangesAsync(ct);
        return Result.Success();
    }
}

public sealed class UpdateBomLineHandler(IPartRepository repository, IUnitOfWork uow)
{
    public async Task<Result> HandleAsync(UpdateBomLineCommand cmd, CancellationToken ct)
    {
        var part = await repository.GetAsync(new PartId(cmd.PartId), ct);
        if (part is null)
            return DomainError.NotFound("part.not_found", $"Part {cmd.PartId} not found.");

        var result = part.UpdateBomLine(
            new PartRevisionId(cmd.RevisionId), new BomLineId(cmd.LineId), cmd.Quantity, cmd.FindNumber, cmd.ReferenceDesignator);
        if (result.IsFailure) return result;

        await uow.SaveChangesAsync(ct);
        return Result.Success();
    }
}

public sealed class RemoveBomLineHandler(IPartRepository repository, IUnitOfWork uow)
{
    public async Task<Result> HandleAsync(RemoveBomLineCommand cmd, CancellationToken ct)
    {
        var part = await repository.GetAsync(new PartId(cmd.PartId), ct);
        if (part is null)
            return DomainError.NotFound("part.not_found", $"Part {cmd.PartId} not found.");

        var result = part.RemoveBomLine(new PartRevisionId(cmd.RevisionId), new BomLineId(cmd.LineId));
        if (result.IsFailure) return result;

        await uow.SaveChangesAsync(ct);
        return Result.Success();
    }
}
