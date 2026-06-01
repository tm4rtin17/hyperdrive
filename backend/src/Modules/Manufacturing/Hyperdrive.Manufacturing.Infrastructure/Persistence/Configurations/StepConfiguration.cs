using Hyperdrive.Manufacturing.Domain.Planning;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hyperdrive.Manufacturing.Infrastructure.Persistence.Configurations;

internal sealed class StepConfiguration : IEntityTypeConfiguration<OperationStep>
{
    public void Configure(EntityTypeBuilder<OperationStep> builder)
    {
        builder.ToTable("steps");

        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id)
            .HasConversion(id => id.Value, value => new StepId(value))
            .HasColumnName("id");

        // "order" is a reserved word in SQL — use an explicit column name.
        builder.Property(s => s.Order).HasColumnName("step_order").IsRequired();
        builder.Property(s => s.Title).HasColumnName("title").HasMaxLength(200).IsRequired();
        builder.Property(s => s.Body).HasColumnName("body").IsRequired();
        builder.Property(s => s.PrimaryBuyoffRole).HasColumnName("primary_buyoff_role");
        builder.Property(s => s.SecondaryBuyoffRole).HasColumnName("secondary_buyoff_role");
    }
}
