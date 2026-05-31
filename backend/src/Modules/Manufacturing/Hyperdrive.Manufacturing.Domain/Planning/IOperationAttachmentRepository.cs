namespace Hyperdrive.Manufacturing.Domain.Planning;

public interface IOperationAttachmentRepository
{
    Task AddAsync(OperationAttachment attachment, CancellationToken ct);
    Task<OperationAttachment?> GetAsync(OperationAttachmentId id, CancellationToken ct);
    Task DeleteAsync(OperationAttachmentId id, CancellationToken ct);
}
