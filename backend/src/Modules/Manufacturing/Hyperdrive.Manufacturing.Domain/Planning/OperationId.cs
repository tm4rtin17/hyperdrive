namespace Hyperdrive.Manufacturing.Domain.Planning;

public readonly record struct OperationId(Guid Value)
{
    public static OperationId New() => new(Guid.NewGuid());
    public override string ToString() => Value.ToString();
}
