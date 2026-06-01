namespace Hyperdrive.Manufacturing.Application.Planning;

public sealed record EngineeringMasterDto(
    Guid Id,
    string PartNumber,
    string Revision,
    Guid? PartId,
    string? PartName,
    string Status,
    DateTimeOffset CreatedAt,
    string Description,
    string Changelog,
    IReadOnlyList<string> Approvers,
    IReadOnlyList<MasterAttachmentDto> Attachments,
    IReadOnlyList<OperationDto> Operations,
    IReadOnlyList<OperationLinkDto> Dependencies);

public sealed record MasterAttachmentDto(
    Guid Id,
    string FileName,
    string ContentType,
    long FileSize,
    DateTimeOffset UploadedAt);

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

public sealed record OperationAttachmentDto(
    Guid Id,
    string FileName,
    string ContentType,
    long FileSize,
    DateTimeOffset UploadedAt);

public sealed record OperationDto(
    Guid Id,
    int Sequence,
    string Name,
    string Instructions,
    string? PrimaryBuyoffRole,
    IReadOnlyList<OperationAttachmentDto> Attachments,
    IReadOnlyList<StepDto> Steps);

public sealed record StepDto(
    Guid Id,
    int Order,
    string Title,
    string Body,
    string? PrimaryBuyoffRole,
    IReadOnlyList<StepAttachmentDto> Attachments);

/// <summary>A selectable work role with its display label.</summary>
public sealed record WorkRoleDto(string Value, string Label);

public sealed record StepAttachmentDto(
    Guid Id,
    string FileName,
    string ContentType,
    long FileSize,
    DateTimeOffset UploadedAt);
