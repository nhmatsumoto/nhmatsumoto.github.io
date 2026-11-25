import { NavCategories } from "./nav-categories";
import { $, component$, type Signal } from "@builder.io/qwik";

interface MobileDrawerProps {
  drawerOpen: Signal<boolean>;
}

export const MobileDrawer = component$<MobileDrawerProps>(({ drawerOpen }) => {
  const onClose = $(() => {
    drawerOpen.value = false;
  });

  return (
    <div class="nav-drawer" id="mobile-drawer" aria-hidden={!drawerOpen.value}>
      <div class="drawer-backdrop" onClick$={onClose}></div>
      <div class="drawer-content">
        <div class="drawer-links">
          <NavCategories onNavigate$={onClose} />
        </div>
      </div>
    </div>
  );
});
