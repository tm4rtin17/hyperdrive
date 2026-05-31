using Hyperdrive.Manufacturing.Domain.Planning;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hyperdrive.Manufacturing.Infrastructure.Persistence.Configurations;

internal sealed class StepAttachmentConfiguration : IEntityTypeConfiguration<StepAttachment>
{
    public void Configure(EntityTypeBuilder<StepAttachment> builder)
    {
        builder.ToTable("step_attachments");

        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id)
            .HasConversion(id => id.Value, value => new StepAttachmentId(value))
            .HasColumnName("id");

        builder.Property(a => a.StepId).HasColumnName("step_id").IsRequired();
        builder.HasIndex(a => a.StepId);

        builder.Property(a => a.FileName).HasColumnName("file_name").HasMaxLength(256).IsRequired();
        builder.Property(a => a.ContentType).HasColumnName("content_type").HasMaxLength(128).IsRequired();
        builder.Property(a => a.FileSize).HasColumnName("file_size").IsRequired();
        builder.Property(a => a.UploadedAt).HasColumnName("uploaded_at").IsRequired();

        // Binary data — only fetched on explicit download, never in normal queries.
        builder.Property(a => a.Data).HasColumnName("data").IsRequired();
    }
}
