using Hyperdrive.SharedKernel.Domain;

namespace Hyperdrive.Manufacturing.Domain.Planning;

/// <summary>
/// A file attached to an operation — typically a drawing, work instruction, or reference image.
/// Binary data is stored as bytea in Postgres and is only fetched on explicit download.
/// </summary>
public sealed class OperationAttachment : Entity<OperationAttachmentId>
{
    public Guid OperationId { get; private set; }
    public string FileName { get; private set; } = default!;
    public string ContentType { get; private set; } = default!;
    public long FileSize { get; private set; }
    public DateTimeOffset UploadedAt { get; private set; }
    public byte[] Data { get; private set; } = default!;

    // EF
    private OperationAttachment() { }

    public OperationAttachment(Guid operationId, string fileName, string contentType, byte[] data, DateTimeOffset uploadedAt)
        : base(OperationAttachmentId.New())
    {
        OperationId = operationId;
        FileName = fileName.Trim();
        ContentType = contentType.Trim();
        FileSize = data.Length;
        Data = data;
        UploadedAt = uploadedAt;
    }
}
