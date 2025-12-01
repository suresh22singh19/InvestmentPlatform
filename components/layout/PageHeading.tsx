"use client";

type PageHeadingProps = {
  title: string;
  className?: string;
};

const baseClasses = "text-[32px] font-semibold leading-tight text-[#262D3B]";

export function PageHeading({ title, className }: PageHeadingProps) {
  return <h1 className={className ? `${baseClasses} ${className}` : baseClasses}>{title}</h1>;
}

