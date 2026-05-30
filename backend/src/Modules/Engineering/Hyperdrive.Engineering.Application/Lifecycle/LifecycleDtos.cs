namespace Hyperdrive.Engineering.Application.Lifecycle;

public sealed record PartRevisionDto(
    Guid Id,
    string Rev,
    string Lifecycle,
    int Ordinal,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ReleasedAt,
    int LineCount);

public sealed record BomLineDto(
    Guid Id,
    Guid ChildPartId,
    string ChildPartNumber,
    string ChildName,
    string ChildPartType,
    decimal Quantity,
    int? FindNumber,
    string? ReferenceDesignator);
