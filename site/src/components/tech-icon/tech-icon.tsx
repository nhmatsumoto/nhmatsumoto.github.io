import { component$ } from "@builder.io/qwik";

interface TechIconProps {
  markup: string;
  class?: string;
}

/**
 * Renders a full-color brand/technology logo from raw inner-SVG markup (see
 * lib/tech-icons.ts). Unlike <Icon>, this does not force fill="none" +
 * stroke="currentColor" — these marks carry their own brand fill color and
 * are filled shapes, not Lucide-style outline strokes.
 */
export const TechIcon = component$<TechIconProps>(({ markup, class: className }) => {
  return (
    <svg
      class={`tech-icon ${className ?? ""}`}
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 128 128"
      aria-hidden="true"
      dangerouslySetInnerHTML={markup}
    />
  );
});
