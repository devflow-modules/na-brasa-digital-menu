type AdminPageHeaderProps = {
  title: string;
  description?: string;
  testId?: string;
};

export function AdminPageHeader({
  title,
  description,
  testId = "admin-page-header",
}: AdminPageHeaderProps) {
  return (
    <div data-testid={testId}>
      <h1 className="text-2xl font-semibold text-orange-50 sm:text-3xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-2 text-sm text-stone-400">{description}</p>
      ) : null}
    </div>
  );
}
