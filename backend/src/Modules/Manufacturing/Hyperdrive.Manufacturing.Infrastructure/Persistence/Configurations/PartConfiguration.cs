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

        builder.Property(p => p.Revision)
            .HasConversion(r => r.Value, v => Revision.Create(v).Value!)
            .HasColumnName("revision")
            .HasMaxLength(2)
            .IsRequired();

        builder.Property(p => p.Lifecycle)
            .HasConversion<string>()
            .HasColumnName("lifecycle")
            .HasMaxLength(32)
            .IsRequired();

        builder.Property(p => p.CreatedAt).HasColumnName("created_at").IsRequired();

        builder.OwnsMany(p => p.Attributes, a =>
        {
            a.ToTable("part_attributes");
            a.WithOwner().HasForeignKey("part_id");
            a.Property<long>("Id").ValueGeneratedOnAdd();
            a.HasKey("Id");
            a.Property(x => x.Key).HasColumnName("key").HasMaxLength(64).IsRequired();
            a.Property(x => x.Value).HasColumnName("value").HasMaxLength(1024).IsRequired();
            a.HasIndex("part_id", nameof(PartAttribute.Key)).IsUnique();
        });

        builder.Ignore(p => p.DomainEvents);
    }
}
