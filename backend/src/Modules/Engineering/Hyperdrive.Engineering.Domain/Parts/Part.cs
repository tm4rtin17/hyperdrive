using Hyperdrive.Engineering.Domain.Parts.Events;
using Hyperdrive.SharedKernel.Domain;
using Hyperdrive.SharedKernel.Results;

namespace Hyperdrive.Engineering.Domain.Parts;

public sealed class Part : AggregateRoot<PartId>
{
    private readonly List<PartRevision> _revisions = new();

    public PartNumber PartNumber { get; private set; } = default!;
    public string Name { get; private set; } = default!;
    public DateTimeOffset CreatedAt { get; private set; }

    /// <summary>Soft-delete flag: archived parts are hidden from the default catalog.</summary>
    public bool IsArchived { get; private set; }

    // Part-master attributes (hardcoded, strongly typed).
    public PartType PartType { get; private set; }
    public UnitOfMeasure UnitOfMeasure { get; private set; }
    public SourcingType Sourcing { get; private set; }
    public Traceability Traceability { get; private set; } = Traceability.None();
    public string? Material { get; private set; }
    public decimal? MassGrams { get; private set; }

    public IReadOnlyCollection<PartRevision> Revisions => _revisions;

    /// <summary>The working/latest revision (highest ordinal).</summary>
    public PartRevision CurrentRevision => _revisions.MaxBy(r => r.Ordinal)!;

    // EF
    private Part() { }

    private Part(PartId id, PartNumber number, string name, DateTimeOffset createdAt)
        : base(id)
    {
        PartNumber = number;
        Name = name;
        CreatedAt = createdAt;

        // Sensible defaults so creation is just Part Number + Name.
        PartType = PartType.Component;
        UnitOfMeasure = UnitOfMeasure.Each;
        Sourcing = SourcingType.Make;
        Traceability = Traceability.None();

        // Every part starts at the initial revision "-", In Work.
        _revisions.Add(new PartRevision(Revision.Initial, ordinal: 0, createdAt));
    }

    public static Result<Part> Create(PartNumber number, string name, DateTimeOffset now)
    {
        if (string.IsNullOrWhiteSpace(name))
            return DomainError.Validation("part.name.empty", "Part name is required.");
        if (name.Length > 200)
            return DomainError.Validation("part.name.too_long", "Part name must be ≤ 200 chars.");

        var part = new Part(PartId.New(), number, name.Trim(), now);
        part.Raise(new PartCreatedEvent(part.Id, number.Value, part.CurrentRevision.Rev.Value));
        return part;
    }

    /// <summary>Updates the editable part-master attributes.</summary>
    public Result UpdateDetails(
        PartType partType,
        UnitOfMeasure unitOfMeasure,
        SourcingType sourcing,
        Traceability traceability,
        string? material,
        decimal? massGrams)
    {
        if (massGrams is < 0)
            return DomainError.Validation("part.mass.negative", "Mass cannot be negative.");
        if (material is { Length: > 200 })
            return DomainError.Validation("part.material.too_long", "Material must be ≤ 200 chars.");

        PartType = partType;
        UnitOfMeasure = unitOfMeasure;
        Sourcing = sourcing;
        Traceability = traceability;
        Material = string.IsNullOrWhiteSpace(material) ? null : material.Trim();
        MassGrams = massGrams;
        return Result.Success();
    }

    /// <summary>Soft-delete: hide the part from the default catalog (recoverable). Idempotent.</summary>
    public Result Archive()
    {
        IsArchived = true;
        return Result.Success();
    }

    /// <summary>Restore a previously archived part back to the active catalog. Idempotent.</summary>
    public Result Restore()
    {
        IsArchived = false;
        return Result.Success();
    }

    // === Revision control ===

    public Result ReleaseRevision(PartRevisionId revisionId, DateTimeOffset now)
    {
        var rev = FindRevision(revisionId);
        return rev is null
            ? DomainError.NotFound("revision.not_found", $"Revision {revisionId} not found.")
            : rev.Release(now);
    }

    public Result ObsoleteRevision(PartRevisionId revisionId)
    {
        var rev = FindRevision(revisionId);
        return rev is null
            ? DomainError.NotFound("revision.not_found", $"Revision {revisionId} not found.")
            : rev.Obsolete();
    }

    public Result RestoreRevision(PartRevisionId revisionId)
    {
        var rev = FindRevision(revisionId);
        return rev is null
            ? DomainError.NotFound("revision.not_found", $"Revision {revisionId} not found.")
            : rev.RestoreToInWork();
    }

    /// <summary>
    /// Rolls a new revision from the current one (which must be Released), seeding its BOM
    /// from the prior revision. Returns the new revision.
    /// </summary>
    public Result<PartRevision> CreateNextRevision(DateTimeOffset now)
    {
        var current = CurrentRevision;
        if (current.Lifecycle != RevisionLifecycle.Released)
            return DomainError.Conflict(
                "revision.roll.not_released",
                $"Revision {current.Rev} must be Released before rolling a new revision.");

        var nextRev = current.Rev.Next();
        if (nextRev.IsFailure) return nextRev.Error;

        var revision = new PartRevision(nextRev.Value!, current.Ordinal + 1, now);
        revision.CopyLinesFrom(current);
        _revisions.Add(revision);
        return revision;
    }

    // === BOM editing (delegates to the target revision) ===

    public Result AddBomLine(
        PartRevisionId revisionId, PartId childPartId, decimal quantity, int? findNumber, string? referenceDesignator)
    {
        if (childPartId == Id)
            return DomainError.Validation("bom.self_reference", "A part cannot contain itself.");

        var rev = FindRevision(revisionId);
        return rev is null
            ? DomainError.NotFound("revision.not_found", $"Revision {revisionId} not found.")
            : rev.AddLine(childPartId, quantity, findNumber, referenceDesignator);
    }

    public Result UpdateBomLine(
        PartRevisionId revisionId, BomLineId lineId, decimal quantity, int? findNumber, string? referenceDesignator)
    {
        var rev = FindRevision(revisionId);
        return rev is null
            ? DomainError.NotFound("revision.not_found", $"Revision {revisionId} not found.")
            : rev.UpdateLine(lineId, quantity, findNumber, referenceDesignator);
    }

    public Result RemoveBomLine(PartRevisionId revisionId, BomLineId lineId)
    {
        var rev = FindRevision(revisionId);
        return rev is null
            ? DomainError.NotFound("revision.not_found", $"Revision {revisionId} not found.")
            : rev.RemoveLine(lineId);
    }

    private PartRevision? FindRevision(PartRevisionId id) => _revisions.FirstOrDefault(r => r.Id == id);
}
