namespace Hyperdrive.Manufacturing.Application.Planning;

public sealed record EngineeringMasterDto(
    Guid Id,
    string PartNumber,
    Guid? PartId,
    string? PartName,
    string Status,
    DateTimeOffset CreatedAt,
    IReadOnlyList<OperationDto> Operations,
    IReadOnlyList<OperationLinkDto> Dependencies);

public sealed record OperationLinkDto(
    Guid PredecessorId,
    Guid SuccessorId);

public sealed record EngineeringMasterSummaryDto(
    Guid Id,
    string PartNumber,
    string? PartName,
    string Status,
    DateTimeOffset CreatedAt,
    int OperationCount);

public sealed record OperationDto(
    Guid Id,
    int Sequence,
    string Name,
    IReadOnlyList<StepDto> Steps);

public sealed record StepDto(
    Guid Id,
    int Order,
    string Title,
    string Body,
    IReadOnlyList<StepAttachmentDto> Attachments);

public sealed record StepAttachmentDto(
    Guid Id,
    string FileName,
    string ContentType,
    long FileSize,
    DateTimeOffset UploadedAt);
