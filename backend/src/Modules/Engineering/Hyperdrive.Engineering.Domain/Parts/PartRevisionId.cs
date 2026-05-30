namespace Hyperdrive.Engineering.Domain.Parts;

public readonly record struct PartRevisionId(Guid Value)
{
    public static PartRevisionId New() => new(Guid.NewGuid());
    public override string ToString() => Value.ToString();
}
