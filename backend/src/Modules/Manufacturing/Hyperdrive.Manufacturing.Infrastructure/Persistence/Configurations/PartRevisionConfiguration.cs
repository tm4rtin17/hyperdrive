using Hyperdrive.Manufacturing.Domain.Parts;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hyperdrive.Manufacturing.Infrastructure.Persistence.Configurations;

internal sealed class PartRevisionConfiguration : IEntityTypeConfiguration<PartRevision>
{
    public void Configure(EntityTypeBuilder<PartRevision> builder)
    {
        builder.ToTable("part_revisions");

        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id)
            .HasConversion(id => id.Value, value => new PartRevisionId(value))
            .HasColumnName("id");

        builder.Property(r => r.Rev)
            .HasConversion(rev => rev.Value, v => Revision.Create(v).Value!)
            .HasColumnName("rev")
            .HasMaxLength(2)
            .IsRequired();

        builder.Property(r => r.Lifecycle)
            .HasConversion<string>()
            .HasColumnName("lifecycle")
            .HasMaxLength(16)
            .IsRequired();

        builder.Property(r => r.Ordinal).HasColumnName("ordinal").IsRequired();
        builder.Property(r => r.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(r => r.ReleasedAt).HasColumnName("released_at");

        builder.HasIndex("part_id", nameof(PartRevision.Ordinal)).IsUnique();

        builder.HasMany(r => r.Lines)
            .WithOne()
            .HasForeignKey("part_revision_id")
            .OnDelete(DeleteBehavior.Cascade);
        builder.Navigation(r => r.Lines)
            .HasField("_lines")
            .UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}
