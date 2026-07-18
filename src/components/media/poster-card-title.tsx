import type { ElementType } from "react";

type PosterCardTitleProps = {
  as?: "h2" | "h3";
  favourite?: boolean;
  title: string;
};

export function PosterCardTitle({ as = "h2", favourite = false, title }: PosterCardTitleProps) {
  const Heading: ElementType = as;
  return (
    <Heading className="truncate font-semibold" title={title}>
      {title}{favourite ? <><span aria-hidden="true"> ★</span><span className="sr-only"> Favourite.</span></> : null}
    </Heading>
  );
}
