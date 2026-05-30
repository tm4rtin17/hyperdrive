using Hyperdrive.Manufacturing.Domain.Parts.Events;
using Hyperdrive.SharedKernel.Domain;
using Hyperdrive.SharedKernel.Results;

namespace Hyperdrive.Manufacturing.Domain.Parts;

public sealed class Part : AggregateRoot<PartId>
{
    public PartNumber PartNumber { get; private set; } = default!;
    public string Name { get; private set; } = default!;
    public Revision Revision { get; private set; } = default!;
    public PartLifecycle Lifecycle { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    // Part-master attributes (hardcoded, strongly typed).
    public PartType PartType { get; private set; }
    public UnitOfMeasure UnitOfMeasure { get; private set; }
    public SourcingType Sourcing { get; private set; }
    public Traceability Traceability { get; private set; } = Traceability.None();
    public string? Material { get; private set; }
    public decimal? MassGrams { get; private set; }

    // EF
    private Part() { }

    private Part(PartId id, PartNumber number, string name, Revision revision, DateTimeOffset createdAt)
        : base(id)
    {
        PartNumber = number;
        Name = name;
        Revision = revision;
        Lifecycle = PartLifecycle.InDevelopment;
        CreatedAt = createdAt;

        // Sensible defaults so creation is just Part Number + Name.
        PartType = PartType.Component;
        UnitOfMeasure = UnitOfMeasure.Each;
        Sourcing = SourcingType.Make;
        Traceability = Traceability.None();
    }

    public static Result<Part> Create(PartNumber number, string name, DateTimeOffset now)
    {
        if (string.IsNullOrWhiteSpace(name))
            return DomainError.Validation("part.name.empty", "Part name is required.");
        if (name.Length > 200)
            return DomainError.Validation("part.name.too_long", "Part name must be ≤ 200 chars.");

        var part = new Part(PartId.New(), number, name.Trim(), Revision.Initial, now);
        part.Raise(new PartCreatedEvent(part.Id, number.Value, part.Revision.Value));
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

    public Result Release()
    {
        if (Lifecycle == PartLifecycle.Released) return Result.Success();
        if (Lifecycle == PartLifecycle.Obsolete)
            return DomainError.Conflict("part.release.obsolete", "Cannot release an obsolete part.");
        Lifecycle = PartLifecycle.Released;
        return Result.Success();
    }

    /// <summary>
    /// Soft-delete: transitions the part to the Obsolete lifecycle so it is hidden
    /// from the default catalog while remaining recoverable and preserving history.
    /// Idempotent.
    /// </summary>
    public Result MarkObsolete()
    {
        Lifecycle = PartLifecycle.Obsolete;
        return Result.Success();
    }
}
