namespace Hyperdrive.Manufacturing.Domain.Planning;

public interface IMasterAttachmentRepository
{
    Task AddAsync(MasterAttachment attachment, CancellationToken ct);
    Task<MasterAttachment?> GetAsync(MasterAttachmentId id, CancellationToken ct);
    Task DeleteAsync(MasterAttachmentId id, CancellationToken ct);
}
