using Hyperdrive.Manufacturing.Domain.Parts;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hyperdrive.Manufacturing.Infrastructure.Persistence.Configurations;

internal sealed class PartConfiguration : IEntityTypeConfiguration<Part>
{
    public void Configure(EntityTypeBuilder<Part> builder)
    {
        builder.ToTable("parts");

        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id)
            .HasConversion(id => id.Value, value => new PartId(value))
            .HasColumnName("id");

        builder.Property(p => p.PartNumber)
            .HasConversion(n => n.Value, v => PartNumber.Create(v).Value!)
            .HasColumnName("part_number")
            .HasMaxLength(32)
            .IsRequired();

        builder.HasIndex(p => p.PartNumber).IsUnique();

        builder.Property(p => p.Name).HasColumnName("name").HasMaxLength(200).IsRequired();

        builder.Property(p => p.CreatedAt).HasColumnName("created_at").IsRequired();

        builder.Property(p => p.IsArchived).HasColumnName("is_archived").IsRequired();

        // Part-master attributes (typed).
        builder.Property(p => p.PartType)
            .HasConversion<string>()
            .HasColumnName("part_type")
            .HasMaxLength(32)
            .IsRequired();

        builder.Property(p => p.UnitOfMeasure)
            .HasConversion<string>()
            .HasColumnName("unit_of_measure")
            .HasMaxLength(32)
            .IsRequired();

        builder.Property(p => p.Sourcing)
            .HasConversion<string>()
            .HasColumnName("sourcing")
            .HasMaxLength(16)
            .IsRequired();

        builder.Property(p => p.Material).HasColumnName("material").HasMaxLength(200);
        builder.Property(p => p.MassGrams).HasColumnName("mass_g").HasColumnType("numeric");

        builder.OwnsOne(p => p.Traceability, t =>
        {
            t.Property(x => x.Type)
                .HasConversion<string>()
                .HasColumnName("traceability_type")
                .HasMaxLength(16)
                .IsRequired();
            t.Property(x => x.Assignment)
                .HasConversion<string>()
                .HasColumnName("serial_assignment")
                .HasMaxLength(16);
            t.Property(x => x.SerialFormat).HasColumnName("serial_format").HasMaxLength(64);
        });
        builder.Navigation(p => p.Traceability).IsRequired();

        // Revisions are part of the Part aggregate (backing-field collection).
        builder.HasMany(p => p.Revisions)
            .WithOne()
            .HasForeignKey("part_id")
            .OnDelete(DeleteBehavior.Cascade);
        builder.Navigation(p => p.Revisions)
            .HasField("_revisions")
            .UsePropertyAccessMode(PropertyAccessMode.Field);

        builder.Ignore(p => p.DomainEvents);
        builder.Ignore(p => p.CurrentRevision);
    }
}
