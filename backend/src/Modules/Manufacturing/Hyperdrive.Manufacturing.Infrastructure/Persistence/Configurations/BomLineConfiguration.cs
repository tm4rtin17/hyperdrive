using Hyperdrive.Manufacturing.Domain.Parts;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hyperdrive.Manufacturing.Infrastructure.Persistence.Configurations;

internal sealed class BomLineConfiguration : IEntityTypeConfiguration<BomLine>
{
    public void Configure(EntityTypeBuilder<BomLine> builder)
    {
        builder.ToTable("bom_lines");

        builder.HasKey(l => l.Id);
        builder.Property(l => l.Id)
            .HasConversion(id => id.Value, value => new BomLineId(value))
            .HasColumnName("id");

        builder.Property(l => l.ChildPartId)
            .HasConversion(id => id.Value, value => new PartId(value))
            .HasColumnName("child_part_id")
            .IsRequired();

        builder.HasIndex(l => l.ChildPartId);

        builder.Property(l => l.Quantity).HasColumnName("quantity").HasColumnType("numeric").IsRequired();
        builder.Property(l => l.FindNumber).HasColumnName("find_number");
        builder.Property(l => l.ReferenceDesignator).HasColumnName("reference_designator").HasMaxLength(64);
    }
}
