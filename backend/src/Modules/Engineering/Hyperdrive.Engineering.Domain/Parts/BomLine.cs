using Hyperdrive.SharedKernel.Domain;

namespace Hyperdrive.Engineering.Domain.Parts;

/// <summary>
/// One line of a bill of materials: a child part consumed by the owning revision,
/// with quantity and optional find-number / reference-designator. References the
/// child part by id only (no cross-aggregate object reference).
/// </summary>
public sealed class BomLine : Entity<BomLineId>
{
    public PartId ChildPartId { get; private set; }
    public decimal Quantity { get; private set; }
    public int? FindNumber { get; private set; }
    public string? ReferenceDesignator { get; private set; }

    // EF
    private BomLine() { }

    internal BomLine(PartId childPartId, decimal quantity, int? findNumber, string? referenceDesignator)
        : base(BomLineId.New())
    {
        ChildPartId = childPartId;
        Quantity = quantity;
        FindNumber = findNumber;
        ReferenceDesignator = Clean(referenceDesignator);
    }

    internal void Update(decimal quantity, int? findNumber, string? referenceDesignator)
    {
        Quantity = quantity;
        FindNumber = findNumber;
        ReferenceDesignator = Clean(referenceDesignator);
    }

    private static string? Clean(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();
}
