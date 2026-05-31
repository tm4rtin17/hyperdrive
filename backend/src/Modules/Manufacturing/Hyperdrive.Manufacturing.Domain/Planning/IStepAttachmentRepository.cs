namespace Hyperdrive.Manufacturing.Domain.Planning;

public interface IStepAttachmentRepository
{
    Task AddAsync(StepAttachment attachment, CancellationToken ct);
    Task<StepAttachment?> GetAsync(StepAttachmentId id, CancellationToken ct);
    Task DeleteAsync(StepAttachmentId id, CancellationToken ct);
}
