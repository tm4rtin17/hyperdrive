using Hyperdrive.SharedKernel.Domain;

namespace Hyperdrive.Manufacturing.Domain.Planning;

/// <summary>
/// A file attached to an operation step — most commonly a photo or drawing.
/// Binary data is stored as bytea in Postgres and is only fetched on explicit download;
/// normal queries return metadata only.
/// </summary>
public sealed class StepAttachment : Entity<StepAttachmentId>
{
    public Guid StepId { get; private set; }
    public string FileName { get; private set; } = default!;
    public string ContentType { get; private set; } = default!;
    public long FileSize { get; private set; }
    public DateTimeOffset UploadedAt { get; private set; }
    public byte[] Data { get; private set; } = default!;

    // EF
    private StepAttachment() { }

    public StepAttachment(Guid stepId, string fileName, string contentType, byte[] data, DateTimeOffset uploadedAt)
        : base(StepAttachmentId.New())
    {
        StepId = stepId;
        FileName = fileName.Trim();
        ContentType = contentType.Trim();
        FileSize = data.Length;
        Data = data;
        UploadedAt = uploadedAt;
    }
}
