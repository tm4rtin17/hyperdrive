using Hyperdrive.Engineering.Application.Lifecycle;
using Hyperdrive.Engineering.Domain.Parts;
using Microsoft.EntityFrameworkCore;

namespace Hyperdrive.Engineering.Infrastructure.Persistence.Repositories;

internal sealed class LifecycleReader(EngineeringDbContext db) : ILifecycleReader
{
    public async Task<IReadOnlyList<PartRevisionDto>> ListRevisionsAsync(Guid partId, CancellationToken ct)
    {
        var pid = new PartId(partId);
        var revisions = await db.Set<PartRevision>().AsNoTracking()
            .Where(r => EF.Property<PartId>(r, "part_id") == pid)
            .Include(r => r.Lines)
            .OrderBy(r => r.Ordinal)
            .ToListAsync(ct);

        return revisions.Select(r => new PartRevisionDto(
            r.Id.Value,
            r.Rev.Value,
            r.Lifecycle.ToString(),
            r.Ordinal,
            r.CreatedAt,
            r.ReleasedAt,
            r.Lines.Count)).ToList();
    }

    public async Task<IReadOnlyList<BomLineDto>> GetBomAsync(Guid revisionId, CancellationToken ct)
    {
        var revId = new PartRevisionId(revisionId);
        var rows = await (
            from l in db.Set<BomLine>().AsNoTracking()
            where EF.Property<PartRevisionId>(l, "part_revision_id") == revId
            join p in db.Parts.AsNoTracking() on l.ChildPartId equals p.Id
            orderby l.FindNumber
            select new { Line = l, Child = p }).ToListAsync(ct);

        return rows.Select(x => new BomLineDto(
            x.Line.Id.Value,
            x.Line.ChildPartId.Value,
            x.Child.PartNumber.Value,
            x.Child.Name,
            x.Child.PartType.ToString(),
            x.Line.Quantity,
            x.Line.FindNumber,
            x.Line.ReferenceDesignator)).ToList();
    }
}
