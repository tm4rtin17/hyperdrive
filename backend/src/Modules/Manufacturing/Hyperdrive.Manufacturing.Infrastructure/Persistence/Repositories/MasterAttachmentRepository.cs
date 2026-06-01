using Hyperdrive.Manufacturing.Domain.Planning;
using Microsoft.EntityFrameworkCore;

namespace Hyperdrive.Manufacturing.Infrastructure.Persistence.Repositories;

internal sealed class MasterAttachmentRepository(ManufacturingDbContext db) : IMasterAttachmentRepository
{
    public async Task AddAsync(MasterAttachment attachment, CancellationToken ct) =>
        await db.MasterAttachments.AddAsync(attachment, ct);

    public Task<MasterAttachment?> GetAsync(MasterAttachmentId id, CancellationToken ct) =>
        db.MasterAttachments.FirstOrDefaultAsync(a => a.Id == id, ct);

    public async Task DeleteAsync(MasterAttachmentId id, CancellationToken ct)
    {
        var attachment = await db.MasterAttachments.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (attachment is not null)
            db.MasterAttachments.Remove(attachment);
    }
}
