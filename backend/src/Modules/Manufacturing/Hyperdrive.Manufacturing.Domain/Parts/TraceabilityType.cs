namespace Hyperdrive.Manufacturing.Domain.Parts;

/// <summary>
/// How units of a part are tracked through production and inventory.
/// </summary>
public enum TraceabilityType
{
    /// <summary>Quantity-only; individual units are not tracked (e.g. fasteners, bulk stock).</summary>
    None = 0,
    /// <summary>Tracked by batch/lot number.</summary>
    Lot = 1,
    /// <summary>Each unit carries a unique serial number.</summary>
    Serial = 2,
}
