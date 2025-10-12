import { cn } from "../../lib/utils";

export const NoteSkeleton = () => (
  <div className="animate-pulse space-y-2 p-2">
    <div className="h-4 bg-muted rounded w-3/4"></div>
    <div className="h-3 bg-muted rounded w-1/2"></div>
  </div>
);

export const NoteListSkeleton = () => (
  <div className="space-y-1">
    <NoteSkeleton />
    <NoteSkeleton />
    <NoteSkeleton />
    <NoteSkeleton />
    <NoteSkeleton />
  </div>
);

export const Skeleton = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
};
