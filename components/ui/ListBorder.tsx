import { type ComponentPropsWithoutRef, type ElementType, type ReactNode } from "react";

type ListBorderProps<T extends ElementType> = {
  as?: T;
  className?: string;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

const baseClasses =
  "w-full overflow-hidden rounded-[20px] border border-[#E3EEE1]";

export const ListBorder = <T extends ElementType = "div">({
  as,
  className,
  children,
  ...rest
}: ListBorderProps<T>) => {
  const Component = (as ?? "div") as ElementType;
  const mergedClassName = [baseClasses, className].filter(Boolean).join(" ");

  return (
    <Component className={mergedClassName} {...rest}>
      {children}
    </Component>
  );
};

