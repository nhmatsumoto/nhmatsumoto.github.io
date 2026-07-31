import { component$ } from "@builder.io/qwik";

interface IconProps {
  paths: string;
  class?: string;
}

/**
 * Renders a lucide-style icon from raw inner-SVG markup (copied verbatim from
 * the legacy static site) so visual parity doesn't depend on adding an icon
 * library dependency.
 */
export const Icon = component$<IconProps>(({ paths, class: className }) => {
  return (
    <svg
      class={`lucide site-icon ${className ?? ""}`}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={paths}
    />
  );
});
