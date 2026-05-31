namespace Hyperdrive.Manufacturing.Domain.Planning;

public readonly record struct StepId(Guid Value)
{
    public static StepId New() => new(Guid.NewGuid());
    public override string ToString() => Value.ToString();
}
