namespace Hyperdrive.Manufacturing.Domain.Planning;

public readonly record struct OperationAttachmentId(Guid Value)
{
    public static OperationAttachmentId New() => new(Guid.NewGuid());
    public override string ToString() => Value.ToString();
}
