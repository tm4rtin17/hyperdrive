using Hyperdrive.Manufacturing.Application.Abstractions;
using Hyperdrive.Manufacturing.Domain.Parts;
using Hyperdrive.SharedKernel.Results;

namespace Hyperdrive.Manufacturing.Application.Parts;

public sealed record UpdatePartCommand(
    Guid Id,
    string PartType,
    string UnitOfMeasure,
    string Sourcing,
    string? Material,
    decimal? MassGrams,
    string TraceabilityType,
    string? SerialAssignment,
    string? SerialFormat);

public sealed class UpdatePartHandler(IPartRepository repository, IUnitOfWork uow)
{
    public async Task<Result<PartDto>> HandleAsync(UpdatePartCommand cmd, CancellationToken ct)
    {
        var part = await repository.GetAsync(new PartId(cmd.Id), ct);
        if (part is null)
            return DomainError.NotFound("part.not_found", $"Part {cmd.Id} not found.");

        if (!Enum.TryParse<PartType>(cmd.PartType, ignoreCase: true, out var partType))
            return DomainError.Validation("part.type.invalid", $"Unknown part type '{cmd.PartType}'.");
        if (!Enum.TryParse<UnitOfMeasure>(cmd.UnitOfMeasure, ignoreCase: true, out var uom))
            return DomainError.Validation("part.uom.invalid", $"Unknown unit of measure '{cmd.UnitOfMeasure}'.");
        if (!Enum.TryParse<SourcingType>(cmd.Sourcing, ignoreCase: true, out var sourcing))
            return DomainError.Validation("part.sourcing.invalid", $"Unknown sourcing type '{cmd.Sourcing}'.");
        if (!Enum.TryParse<TraceabilityType>(cmd.TraceabilityType, ignoreCase: true, out var traceType))
            return DomainError.Validation("part.traceability.invalid", $"Unknown traceability type '{cmd.TraceabilityType}'.");

        SerialAssignment? assignment = null;
        if (!string.IsNullOrWhiteSpace(cmd.SerialAssignment))
        {
            if (!Enum.TryParse<SerialAssignment>(cmd.SerialAssignment, ignoreCase: true, out var parsed))
                return DomainError.Validation("part.serial_assignment.invalid", $"Unknown serial assignment '{cmd.SerialAssignment}'.");
            assignment = parsed;
        }

        var traceabilityResult = Traceability.Create(traceType, assignment, cmd.SerialFormat);
        if (traceabilityResult.IsFailure) return traceabilityResult.Error;

        var updated = part.UpdateDetails(
            partType, uom, sourcing, traceabilityResult.Value!, cmd.Material, cmd.MassGrams);
        if (updated.IsFailure) return updated.Error;

        await uow.SaveChangesAsync(ct);
        return part.ToDto();
    }
}
