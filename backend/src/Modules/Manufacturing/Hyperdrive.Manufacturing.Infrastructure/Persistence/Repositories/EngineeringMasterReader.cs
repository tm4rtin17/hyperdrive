using Hyperdrive.Manufacturing.Application.Planning;
using Hyperdrive.Manufacturing.Domain.Planning;
using Microsoft.EntityFrameworkCore;

namespace Hyperdrive.Manufacturing.Infrastructure.Persistence.Repositories;

internal sealed class EngineeringMasterReader(ManufacturingDbContext db) : IEngineeringMasterReader
{
    public async Task<IReadOnlyList<EngineeringMasterSummaryDto>> ListAsync(string? search, int limit, CancellationToken ct)
    {
        var query = db.EngineeringMasters.AsNoTracking().Include(m => m.Operations).AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            query = query.Where(m =>
                EF.Functions.ILike(m.PartNumber, $"%{s}%") ||
                (m.PartName != null && EF.Functions.ILike(m.PartName, $"%{s}%")));
        }

        var masters = await query
            .OrderByDescending(m => m.CreatedAt)
            .Take(Math.Clamp(limit, 1, 200))
            .ToListAsync(ct);

        return masters.Select(m => new EngineeringMasterSummaryDto(
            m.Id.Value, m.PartNumber, m.PartName, m.Status.ToString(), m.CreatedAt, m.Operations.Count)).ToList();
    }

    public async Task<EngineeringMasterDto?> GetAsync(Guid id, CancellationToken ct)
    {
        var master = await db.EngineeringMasters.AsNoTracking()
            .Include(m => m.Operations).ThenInclude(o => o.Steps)
            .FirstOrDefaultAsync(m => m.Id == new EngineeringMasterId(id), ct);

        if (master is null) return null;

        var opIds = master.Operations.Select(o => o.Id.Value).ToHashSet();
        var stepIds = master.Operations.SelectMany(o => o.Steps).Select(s => s.Id.Value).ToHashSet();

        // Load attachment metadata only — binary Data column is excluded via projection.
        var rawStepAttachments = stepIds.Count == 0 ? [] :
            await db.StepAttachments.AsNoTracking()
                .Where(a => stepIds.Contains(a.StepId))
                .Select(a => new { a.Id, a.StepId, a.FileName, a.ContentType, a.FileSize, a.UploadedAt })
                .ToListAsync(ct);

        var rawOpAttachments = opIds.Count == 0 ? [] :
            await db.OperationAttachments.AsNoTracking()
                .Where(a => opIds.Contains(a.OperationId))
                .Select(a => new { a.Id, a.OperationId, a.FileName, a.ContentType, a.FileSize, a.UploadedAt })
                .ToListAsync(ct);

        var stepAttachmentsByStep = rawStepAttachments.ToLookup(
            a => a.StepId,
            a => new StepAttachmentDto(a.Id.Value, a.FileName, a.ContentType, a.FileSize, a.UploadedAt));

        var opAttachmentsByOp = rawOpAttachments.ToLookup(
            a => a.OperationId,
            a => new OperationAttachmentDto(a.Id.Value, a.FileName, a.ContentType, a.FileSize, a.UploadedAt));

        return master.ToDto(stepAttachmentsByStep, opAttachmentsByOp);
    }
}
