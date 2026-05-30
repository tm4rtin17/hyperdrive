using Hyperdrive.Manufacturing.Domain.Parts;

namespace Hyperdrive.Manufacturing.Application.Parts;

public static class PartMapper
{
    public static PartDto ToDto(this Part part) => new(
        part.Id.Value,
        part.PartNumber.Value,
        part.Name,
        part.Revision.Value,
        part.Lifecycle.ToString(),
        part.CreatedAt,
        part.PartType.ToString(),
        part.UnitOfMeasure.ToString(),
        part.Sourcing.ToString(),
        part.Material,
        part.MassGrams,
        part.Traceability.Type.ToString(),
        part.Traceability.Assignment?.ToString(),
        part.Traceability.SerialFormat);

    public static PartSummaryDto ToSummary(this Part part) => new(
        part.Id.Value,
        part.PartNumber.Value,
        part.Name,
        part.Revision.Value,
        part.Lifecycle.ToString(),
        part.CreatedAt,
        part.PartType.ToString(),
        part.Traceability.Type.ToString());
}
