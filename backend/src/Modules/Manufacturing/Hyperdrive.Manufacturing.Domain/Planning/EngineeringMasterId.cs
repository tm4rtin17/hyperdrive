namespace Hyperdrive.Manufacturing.Domain.Planning;

public readonly record struct EngineeringMasterId(Guid Value)
{
    public static EngineeringMasterId New() => new(Guid.NewGuid());
    public override string ToString() => Value.ToString();
}
