namespace Hyperdrive.Manufacturing.Application.Parts;

public sealed record PartDto(
    Guid Id,
    string PartNumber,
    string Name,
    string Revision,
    string Lifecycle,
    DateTimeOffset CreatedAt,
    IReadOnlyDictionary<string, string> Attributes);

public sealed record PartSummaryDto(
    Guid Id,
    string PartNumber,
    string Name,
    string Revision,
    string Lifecycle,
    DateTimeOffset CreatedAt);
