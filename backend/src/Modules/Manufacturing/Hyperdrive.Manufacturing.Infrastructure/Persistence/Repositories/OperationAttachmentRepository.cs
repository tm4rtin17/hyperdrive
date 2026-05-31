using Hyperdrive.Manufacturing.Domain.Planning;
using Microsoft.EntityFrameworkCore;

namespace Hyperdrive.Manufacturing.Infrastructure.Persistence.Repositories;

internal sealed class OperationAttachmentRepository(ManufacturingDbContext db) : IOperationAttachmentRepository
{
    public async Task AddAsync(OperationAttachment attachment, CancellationToken ct) =>
        await db.OperationAttachments.AddAsync(attachment, ct);

    public Task<OperationAttachment?> GetAsync(OperationAttachmentId id, CancellationToken ct) =>
        db.OperationAttachments.FirstOrDefaultAsync(a => a.Id == id, ct);

    public async Task DeleteAsync(OperationAttachmentId id, CancellationToken ct)
    {
        var attachment = await db.OperationAttachments.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (attachment is not null)
            db.OperationAttachments.Remove(attachment);
    }
}
