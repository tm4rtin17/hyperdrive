using Hyperdrive.Manufacturing.Application.Abstractions;
using Hyperdrive.Manufacturing.Domain.Planning;
using Hyperdrive.SharedKernel.Results;
using Hyperdrive.SharedKernel.Time;

namespace Hyperdrive.Manufacturing.Application.Planning;

public sealed record AddStepCommand(Guid MasterId, Guid OperationId, string Title);
public sealed record UpdateStepCommand(Guid MasterId, Guid OperationId, Guid StepId, int Order, string Title, string Body, WorkRole? PrimaryBuyoffRole, WorkRole? SecondaryBuyoffRole);
public sealed record RemoveStepCommand(Guid MasterId, Guid OperationId, Guid StepId);

public sealed record UploadStepAttachmentCommand(
    Guid MasterId, Guid OperationId, Guid StepId,
    string FileName, string ContentType, byte[] Data);

public sealed record DeleteStepAttachmentCommand(Guid AttachmentId);

// ── Step CRUD ──────────────────────────────────────────────────────────────────

public sealed class AddStepHandler(IEngineeringMasterRepository repository, IUnitOfWork uow)
{
    public async Task<Result<StepDto>> HandleAsync(AddStepCommand cmd, CancellationToken ct)
    {
        var master = await repository.GetAsync(new EngineeringMasterId(cmd.MasterId), ct);
        if (master is null)
            return DomainError.NotFound("master.not_found", $"Engineering master {cmd.MasterId} not found.");

        var result = master.AddStep(new OperationId(cmd.OperationId), cmd.Title);
        if (result.IsFailure) return result.Error;

        await uow.SaveChangesAsync(ct);

        var step = result.Value!;
        return new StepDto(step.Id.Value, step.Order, step.Title, step.Body, step.PrimaryBuyoffRole?.ToString(), step.SecondaryBuyoffRole?.ToString(), []);
    }
}

public sealed class UpdateStepHandler(IEngineeringMasterRepository repository, IUnitOfWork uow)
{
    public async Task<Result> HandleAsync(UpdateStepCommand cmd, CancellationToken ct)
    {
        var master = await repository.GetAsync(new EngineeringMasterId(cmd.MasterId), ct);
        if (master is null)
            return DomainError.NotFound("master.not_found", $"Engineering master {cmd.MasterId} not found.");

        var result = master.UpdateStep(
            new OperationId(cmd.OperationId), new StepId(cmd.StepId), cmd.Order, cmd.Title, cmd.Body, cmd.PrimaryBuyoffRole, cmd.SecondaryBuyoffRole);
        if (result.IsFailure) return result;

        await uow.SaveChangesAsync(ct);
        return Result.Success();
    }
}

public sealed class RemoveStepHandler(IEngineeringMasterRepository repository, IUnitOfWork uow)
{
    public async Task<Result> HandleAsync(RemoveStepCommand cmd, CancellationToken ct)
    {
        var master = await repository.GetAsync(new EngineeringMasterId(cmd.MasterId), ct);
        if (master is null)
            return DomainError.NotFound("master.not_found", $"Engineering master {cmd.MasterId} not found.");

        var result = master.RemoveStep(new OperationId(cmd.OperationId), new StepId(cmd.StepId));
        if (result.IsFailure) return result;

        await uow.SaveChangesAsync(ct);
        return Result.Success();
    }
}

// ── Attachment CRUD ────────────────────────────────────────────────────────────

public sealed class UploadStepAttachmentHandler(
    IEngineeringMasterRepository masterRepository,
    IStepAttachmentRepository attachmentRepository,
    IUnitOfWork uow,
    IClock clock)
{
    private const long MaxFileSizeBytes = 25 * 1024 * 1024; // 25 MB

    public async Task<Result<StepAttachmentDto>> HandleAsync(UploadStepAttachmentCommand cmd, CancellationToken ct)
    {
        if (cmd.Data.Length > MaxFileSizeBytes)
            return DomainError.Validation("attachment.too_large", "File exceeds the 25 MB limit.");

        // Verify the step exists within this master.
        var master = await masterRepository.GetAsync(new EngineeringMasterId(cmd.MasterId), ct);
        if (master is null)
            return DomainError.NotFound("master.not_found", $"Engineering master {cmd.MasterId} not found.");

        var stepExists = master.Operations
            .Any(o => o.Id.Value == cmd.OperationId && o.Steps.Any(s => s.Id.Value == cmd.StepId));
        if (!stepExists)
            return DomainError.NotFound("step.not_found", $"Step {cmd.StepId} not found in this master.");

        var attachment = new StepAttachment(cmd.StepId, cmd.FileName, cmd.ContentType, cmd.Data, clock.UtcNow);
        await attachmentRepository.AddAsync(attachment, ct);
        await uow.SaveChangesAsync(ct);

        return new StepAttachmentDto(
            attachment.Id.Value, attachment.FileName, attachment.ContentType,
            attachment.FileSize, attachment.UploadedAt);
    }
}

public sealed class DeleteStepAttachmentHandler(
    IStepAttachmentRepository attachmentRepository, IUnitOfWork uow)
{
    public async Task<Result> HandleAsync(DeleteStepAttachmentCommand cmd, CancellationToken ct)
    {
        var attachment = await attachmentRepository.GetAsync(new StepAttachmentId(cmd.AttachmentId), ct);
        if (attachment is null)
            return DomainError.NotFound("attachment.not_found", $"Attachment {cmd.AttachmentId} not found.");

        await attachmentRepository.DeleteAsync(new StepAttachmentId(cmd.AttachmentId), ct);
        await uow.SaveChangesAsync(ct);
        return Result.Success();
    }
}
