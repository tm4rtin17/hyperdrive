namespace Hyperdrive.Engineering.Domain.Parts;

/// <summary>
/// Master classification of a part. Drives downstream behavior such as make/buy,
/// BOM rules, and costing.
/// </summary>
public enum PartType
{
    RawMaterial = 0,
    Component = 1,
    Assembly = 2,
    FinishedGood = 3,
    Consumable = 4,
    Tooling = 5,
}
