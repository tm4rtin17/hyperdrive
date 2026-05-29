namespace Hyperdrive.Manufacturing.Domain.Parts;

public readonly record struct PartId(Guid Value)
{
    public static PartId New() => new(Guid.NewGuid());
    public override string ToString() => Value.ToString();
}
