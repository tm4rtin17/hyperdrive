using Hyperdrive.Manufacturing.Application.Abstractions;
using Hyperdrive.Manufacturing.Domain.Planning;
using Hyperdrive.SharedKernel.Results;
using Hyperdrive.SharedKernel.Time;

namespace Hyperdrive.Manufacturing.Application.Planning;

public sealed record UploadMasterAttachmentCommand(
    Guid MasterId, string FileName, string ContentType, byte[] Data);

public sealed record DeleteMasterAttachmentCommand(Guid AttachmentId);

public sealed class UploadMasterAttachmentHandler(
    IEngineeringMasterRepository masterRepository,
    IMasterAttachmentRepository attachmentRepository,
    IUnitOfWork uow,
    IClock clock)
{
    private const long MaxFileSizeBytes = 25 * 1024 * 1024; // 25 MB

    public async Task<Result<MasterAttachmentDto>> HandleAsync(UploadMasterAttachmentCommand cmd, CancellationToken ct)
    {
        if (cmd.Data.Length > MaxFileSizeBytes)
            return DomainError.Validation("attachment.too_large", "File exceeds the 25 MB limit.");

        var master = await masterRepository.GetAsync(new EngineeringMasterId(cmd.MasterId), ct);
        if (master is null)
            return DomainError.NotFound("master.not_found", $"Engineering master {cmd.MasterId} not found.");

        var attachment = new MasterAttachment(cmd.MasterId, cmd.FileName, cmd.ContentType, cmd.Data, clock.UtcNow);
        await attachmentRepository.AddAsync(attachment, ct);
        await uow.SaveChangesAsync(ct);

        return new MasterAttachmentDto(
            attachment.Id.Value, attachment.FileName, attachment.ContentType,
            attachment.FileSize, attachment.UploadedAt);
    }
}

public sealed class DeleteMasterAttachmentHandler(
    IMasterAttachmentRepository attachmentRepository, IUnitOfWork uow)
{
    public async Task<Result> HandleAsync(DeleteMasterAttachmentCommand cmd, CancellationToken ct)
    {
        var attachment = await attachmentRepository.GetAsync(new MasterAttachmentId(cmd.AttachmentId), ct);
        if (attachment is null)
            return DomainError.NotFound("attachment.not_found", $"Attachment {cmd.AttachmentId} not found.");

        await attachmentRepository.DeleteAsync(new MasterAttachmentId(cmd.AttachmentId), ct);
        await uow.SaveChangesAsync(ct);
        return Result.Success();
    }
}
