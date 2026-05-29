type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export function PageHeader({ eyebrow, title, description, actions }: Props) {
  return (
    <div className="flex items-end justify-between gap-6 pb-6 mb-6 border-b hairline">
      <div>
        {eyebrow && (
          <div className="text-[10px] uppercase tracking-widest text-ink-400">{eyebrow}</div>
        )}
        <h1 className="mt-1 text-2xl font-semibold text-ink-100">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-300 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
