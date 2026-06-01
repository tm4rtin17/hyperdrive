using Hyperdrive.Manufacturing.Domain.Planning;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hyperdrive.Manufacturing.Infrastructure.Persistence.Configurations;

internal sealed class EngineeringMasterConfiguration : IEntityTypeConfiguration<EngineeringMaster>
{
    public void Configure(EntityTypeBuilder<EngineeringMaster> builder)
    {
        builder.ToTable("engineering_masters");

        builder.HasKey(m => m.Id);
        builder.Property(m => m.Id)
            .HasConversion(id => id.Value, value => new EngineeringMasterId(value))
            .HasColumnName("id");

        builder.Property(m => m.PartNumber).HasColumnName("part_number").HasMaxLength(64).IsRequired();
        builder.Property(m => m.Revision).HasColumnName("revision").HasMaxLength(3).IsRequired().HasDefaultValue("A");
        builder.Property(m => m.PartId).HasColumnName("part_id");
        builder.Property(m => m.PartName).HasColumnName("part_name").HasMaxLength(200);

        builder.Property(m => m.Status)
            .HasConversion<string>()
            .HasColumnName("status")
            .HasMaxLength(16)
            .IsRequired();

        builder.Property(m => m.CreatedAt).HasColumnName("created_at").IsRequired();

        builder.Property(m => m.Description).HasColumnName("description").IsRequired().HasDefaultValue(string.Empty);
        builder.Property(m => m.Changelog).HasColumnName("changelog").IsRequired().HasDefaultValue(string.Empty);

        // Approver names persisted as a Postgres text[] array. Placeholder for a richer approval flow.
        builder.PrimitiveCollection(m => m.Approvers)
            .HasColumnName("approvers")
            .HasField("_approvers")
            .UsePropertyAccessMode(PropertyAccessMode.Field)
            .IsRequired();

        builder.HasIndex(m => m.PartNumber);

        builder.HasMany(m => m.Operations)
            .WithOne()
            .HasForeignKey("master_id")
            .OnDelete(DeleteBehavior.Cascade);
        builder.Navigation(m => m.Operations)
            .HasField("_operations")
            .UsePropertyAccessMode(PropertyAccessMode.Field);

        // Precedence graph: owned collection persisted to its own join table.
        builder.OwnsMany(m => m.Dependencies, links =>
        {
            links.ToTable("operation_dependencies");
            links.WithOwner().HasForeignKey("master_id");
            links.Property(l => l.PredecessorId).HasColumnName("predecessor_id");
            links.Property(l => l.SuccessorId).HasColumnName("successor_id");
            links.HasKey("master_id", "PredecessorId", "SuccessorId");
        });
        builder.Navigation(m => m.Dependencies)
            .HasField("_dependencies")
            .UsePropertyAccessMode(PropertyAccessMode.Field);

        builder.Ignore(m => m.DomainEvents);
    }
}
