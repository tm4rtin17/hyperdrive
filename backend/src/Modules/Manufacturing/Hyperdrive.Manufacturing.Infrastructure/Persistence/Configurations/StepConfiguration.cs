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
        builder.Property(s => s.Text).HasColumnName("text").IsRequired();
    }
}
