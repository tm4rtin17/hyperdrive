using Hyperdrive.Manufacturing.Domain.Planning;
using Microsoft.EntityFrameworkCore;

namespace Hyperdrive.Manufacturing.Infrastructure.Persistence.Repositories;

internal sealed class StepAttachmentRepository(ManufacturingDbContext db) : IStepAttachmentRepository
{
    public async Task AddAsync(StepAttachment attachment, CancellationToken ct) =>
        await db.StepAttachments.AddAsync(attachment, ct);

    public Task<StepAttachment?> GetAsync(StepAttachmentId id, CancellationToken ct) =>
        db.StepAttachments.FirstOrDefaultAsync(a => a.Id == id, ct);

    public async Task DeleteAsync(StepAttachmentId id, CancellationToken ct)
    {
        var attachment = await db.StepAttachments.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (attachment is not null)
            db.StepAttachments.Remove(attachment);
    }
}
