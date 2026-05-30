using Hyperdrive.SharedKernel.Domain;
using Hyperdrive.SharedKernel.Results;

namespace Hyperdrive.Engineering.Domain.Parts;

/// <summary>
/// A single revision of a part: its rev letter, independent lifecycle, and a BOM
/// snapshot (the child lines effective for this revision). Released and Obsolete
/// revisions are frozen — their BOM cannot be edited.
/// </summary>
public sealed class PartRevision : Entity<PartRevisionId>
{
    private readonly List<BomLine> _lines = new();

    public Revision Rev { get; private set; } = default!;
    public RevisionLifecycle Lifecycle { get; private set; }
    public int Ordinal { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset? ReleasedAt { get; private set; }

    public IReadOnlyCollection<BomLine> Lines => _lines;

    // EF
    private PartRevision() { }

    internal PartRevision(Revision rev, int ordinal, DateTimeOffset createdAt)
        : base(PartRevisionId.New())
    {
        Rev = rev;
        Ordinal = ordinal;
        Lifecycle = RevisionLifecycle.InWork;
        CreatedAt = createdAt;
    }

    internal Result Release(DateTimeOffset now)
    {
        if (Lifecycle == RevisionLifecycle.Released) return Result.Success();
        if (Lifecycle == RevisionLifecycle.Obsolete)
            return DomainError.Conflict("revision.release.obsolete", "Cannot release an obsolete revision.");
        Lifecycle = RevisionLifecycle.Released;
        ReleasedAt = now;
        return Result.Success();
    }

    internal Result Obsolete()
    {
        Lifecycle = RevisionLifecycle.Obsolete;
        return Result.Success();
    }

    /// <summary>Restore an obsolete revision back to InWork so it can be edited and re-released.</summary>
    internal Result RestoreToInWork()
    {
        if (Lifecycle == RevisionLifecycle.InWork) return Result.Success();
        if (Lifecycle == RevisionLifecycle.Released)
            return DomainError.Conflict("revision.restore.released", "Revision is already Released — obsolete it first if you want to restore to In Work.");
        Lifecycle = RevisionLifecycle.InWork;
        return Result.Success();
    }

    internal Result AddLine(PartId childPartId, decimal quantity, int? findNumber, string? referenceDesignator)
    {
        var frozen = EnsureEditable();
        if (frozen.IsFailure) return frozen;
        if (quantity <= 0)
            return DomainError.Validation("bom.quantity.invalid", "Quantity must be greater than zero.");

        _lines.Add(new BomLine(childPartId, quantity, findNumber, referenceDesignator));
        return Result.Success();
    }

    internal Result UpdateLine(BomLineId lineId, decimal quantity, int? findNumber, string? referenceDesignator)
    {
        var frozen = EnsureEditable();
        if (frozen.IsFailure) return frozen;
        if (quantity <= 0)
            return DomainError.Validation("bom.quantity.invalid", "Quantity must be greater than zero.");

        var line = _lines.FirstOrDefault(l => l.Id == lineId);
        if (line is null)
            return DomainError.NotFound("bom.line.not_found", $"BOM line {lineId} not found.");

        line.Update(quantity, findNumber, referenceDesignator);
        return Result.Success();
    }

    internal Result RemoveLine(BomLineId lineId)
    {
        var frozen = EnsureEditable();
        if (frozen.IsFailure) return frozen;

        var removed = _lines.RemoveAll(l => l.Id == lineId);
        return removed == 0
            ? DomainError.NotFound("bom.line.not_found", $"BOM line {lineId} not found.")
            : Result.Success();
    }

    /// <summary>Copies the BOM lines from another revision as the starting snapshot.</summary>
    internal void CopyLinesFrom(PartRevision source)
    {
        foreach (var l in source._lines)
            _lines.Add(new BomLine(l.ChildPartId, l.Quantity, l.FindNumber, l.ReferenceDesignator));
    }

    private Result EnsureEditable() =>
        Lifecycle == RevisionLifecycle.InWork
            ? Result.Success()
            : DomainError.Conflict("revision.frozen", $"Revision {Rev} is {Lifecycle} and cannot be edited.");
}
