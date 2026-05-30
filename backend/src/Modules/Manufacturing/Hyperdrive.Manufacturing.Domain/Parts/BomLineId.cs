namespace Hyperdrive.Manufacturing.Domain.Parts;

public readonly record struct BomLineId(Guid Value)
{
    public static BomLineId New() => new(Guid.NewGuid());
    public override string ToString() => Value.ToString();
}
