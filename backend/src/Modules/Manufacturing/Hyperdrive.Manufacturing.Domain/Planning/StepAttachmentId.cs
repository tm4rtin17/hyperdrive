namespace Hyperdrive.Manufacturing.Domain.Planning;

public readonly record struct StepAttachmentId(Guid Value)
{
    public static StepAttachmentId New() => new(Guid.NewGuid());
    public override string ToString() => Value.ToString();
}
