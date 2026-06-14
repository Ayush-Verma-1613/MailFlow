interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

/**
 * Page title row: large Instrument Serif h1 (32px, optional italic clay
 * emphasis via the `.display` class) + muted sub + right-aligned actions slot.
 * Pass `<em>…</em>` inside `title` is not supported (string); for clay accents
 * use the page's own h1 with the `display` class.
 */
export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-1.5">
        <h1 className="display font-serif text-[32px] leading-[1.1] tracking-[-0.02em]">
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground max-w-[56ch] text-[13.5px]">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
