using Hyperdrive.Manufacturing.Application.Abstractions;
using Hyperdrive.Manufacturing.Domain.Planning;
using Hyperdrive.SharedKernel.Results;
using Hyperdrive.SharedKernel.Time;

namespace Hyperdrive.Manufacturing.Application.Planning;

public sealed record UploadOperationAttachmentCommand(
    Guid MasterId, Guid OperationId,
    string FileName, string ContentType, byte[] Data);

public sealed record DeleteOperationAttachmentCommand(Guid AttachmentId);

public sealed class UploadOperationAttachmentHandler(
    IEngineeringMasterRepository masterRepository,
    IOperationAttachmentRepository attachmentRepository,
    IUnitOfWork uow,
    IClock clock)
{
    private const long MaxFileSizeBytes = 25 * 1024 * 1024; // 25 MB

    public async Task<Result<OperationAttachmentDto>> HandleAsync(UploadOperationAttachmentCommand cmd, CancellationToken ct)
    {
        if (cmd.Data.Length > MaxFileSizeBytes)
            return DomainError.Validation("attachment.too_large", "File exceeds the 25 MB limit.");

        var master = await masterRepository.GetAsync(new EngineeringMasterId(cmd.MasterId), ct);
        if (master is null)
            return DomainError.NotFound("master.not_found", $"Engineering master {cmd.MasterId} not found.");

        var opExists = master.Operations.Any(o => o.Id.Value == cmd.OperationId);
        if (!opExists)
            return DomainError.NotFound("operation.not_found", $"Operation {cmd.OperationId} not found in this master.");

        var attachment = new OperationAttachment(cmd.OperationId, cmd.FileName, cmd.ContentType, cmd.Data, clock.UtcNow);
        await attachmentRepository.AddAsync(attachment, ct);
        await uow.SaveChangesAsync(ct);

        return new OperationAttachmentDto(
            attachment.Id.Value, attachment.FileName, attachment.ContentType,
            attachment.FileSize, attachment.UploadedAt);
    }
}

public sealed class DeleteOperationAttachmentHandler(
    IOperationAttachmentRepository attachmentRepository, IUnitOfWork uow)
{
    public async Task<Result> HandleAsync(DeleteOperationAttachmentCommand cmd, CancellationToken ct)
    {
        var attachment = await attachmentRepository.GetAsync(new OperationAttachmentId(cmd.AttachmentId), ct);
        if (attachment is null)
            return DomainError.NotFound("attachment.not_found", $"Attachment {cmd.AttachmentId} not found.");

        await attachmentRepository.DeleteAsync(new OperationAttachmentId(cmd.AttachmentId), ct);
        await uow.SaveChangesAsync(ct);
        return Result.Success();
    }
}
