namespace Hyperdrive.Manufacturing.Application.Parts;

public sealed record PartDto(
    Guid Id,
    string PartNumber,
    string Name,
    string Revision,
    string Lifecycle,
    DateTimeOffset CreatedAt,
    string PartType,
    string UnitOfMeasure,
    string Sourcing,
    string? Material,
    decimal? MassGrams,
    string TraceabilityType,
    string? SerialAssignment,
    string? SerialFormat);

public sealed record PartSummaryDto(
    Guid Id,
    string PartNumber,
    string Name,
    string Revision,
    string Lifecycle,
    DateTimeOffset CreatedAt,
    string PartType,
    string TraceabilityType);
