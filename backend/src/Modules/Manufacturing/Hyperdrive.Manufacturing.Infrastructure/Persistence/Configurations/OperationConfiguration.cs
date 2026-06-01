using Hyperdrive.Manufacturing.Domain.Planning;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hyperdrive.Manufacturing.Infrastructure.Persistence.Configurations;

internal sealed class OperationConfiguration : IEntityTypeConfiguration<Operation>
{
    public void Configure(EntityTypeBuilder<Operation> builder)
    {
        builder.ToTable("operations");

        builder.HasKey(o => o.Id);
        builder.Property(o => o.Id)
            .HasConversion(id => id.Value, value => new OperationId(value))
            .HasColumnName("id");

        builder.Property(o => o.Sequence).HasColumnName("sequence").IsRequired();
        builder.Property(o => o.Name).HasColumnName("name").HasMaxLength(200).IsRequired();
        builder.Property(o => o.Instructions).HasColumnName("instructions").HasDefaultValue(string.Empty).IsRequired();
        builder.Property(o => o.PrimaryBuyoffRoles)
            .HasColumnName("primary_buyoff_roles")
            .HasColumnType("integer[]")
            .HasConversion(
                v => v.Select(r => (int)r).ToArray(),
                v => v.Select(r => (WorkRole)r).ToArray());
        builder.Property(o => o.SecondaryBuyoffRoles)
            .HasColumnName("secondary_buyoff_roles")
            .HasColumnType("integer[]")
            .HasConversion(
                v => v.Select(r => (int)r).ToArray(),
                v => v.Select(r => (WorkRole)r).ToArray());

        builder.HasIndex("master_id", nameof(Operation.Sequence));

        builder.HasMany(o => o.Steps)
            .WithOne()
            .HasForeignKey("operation_id")
            .OnDelete(DeleteBehavior.Cascade);
        builder.Navigation(o => o.Steps)
            .HasField("_steps")
            .UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}
