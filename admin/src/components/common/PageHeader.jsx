import { cn } from '../../utils/cn';

/**
 * Page title block.
 * <PageHeader title="Users" description="..." actions={<Button/>} meta={<InfoBadge>Label</InfoBadge>} />
 * `accent` renders part of the title in the serif gold style: title="Platform" accent="Overview".
 */
export default function PageHeader({ title, accent, description, actions, meta, className }) {
  return (
    <header className={cn('mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-[26px] font-semibold leading-tight sm:text-[30px]">
            {title}{accent && <> <span className="serif-accent text-[1.08em]">{accent}</span></>}
          </h1>
          {meta}
        </div>
        {description && <p className="mt-1.5 max-w-2xl text-[14px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
