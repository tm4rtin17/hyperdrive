using Hyperdrive.SharedKernel.Domain;

namespace Hyperdrive.Manufacturing.Domain.Planning;

/// <summary>
/// A file attached to the engineering master header — typically a product drawing, spec sheet,
/// or reference document. Binary data is stored as bytea in Postgres and is only fetched on explicit download.
/// </summary>
public sealed class MasterAttachment : Entity<MasterAttachmentId>
{
    public Guid MasterId { get; private set; }
    public string FileName { get; private set; } = default!;
    public string ContentType { get; private set; } = default!;
    public long FileSize { get; private set; }
    public DateTimeOffset UploadedAt { get; private set; }
    public byte[] Data { get; private set; } = default!;

    // EF
    private MasterAttachment() { }

    public MasterAttachment(Guid masterId, string fileName, string contentType, byte[] data, DateTimeOffset uploadedAt)
        : base(MasterAttachmentId.New())
    {
        MasterId = masterId;
        FileName = fileName.Trim();
        ContentType = contentType.Trim();
        FileSize = data.Length;
        Data = data;
        UploadedAt = uploadedAt;
    }
}
