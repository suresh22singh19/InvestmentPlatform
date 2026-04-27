"use client";

type PageHeadingProps = {
  title: string;
  className?: string;
};

const baseClasses = "text-[24px] md:text-[24px] lg:text-[32px]  font-semibold leading-tight text-[#262D3B]";

export function PageHeading({ title, className }: PageHeadingProps) {
  return <h1 className={className ? `${baseClasses} ${className}` : baseClasses}>{title}</h1>;
}

