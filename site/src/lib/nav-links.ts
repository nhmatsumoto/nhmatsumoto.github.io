import {
  ICON_BOT,
  ICON_FOLDER_KANBAN,
  ICON_LAYERS,
  ICON_NEWSPAPER,
  ICON_NETWORK,
  ICON_SHIELD_CHECK,
} from "./icons";

export interface NavLinkDef {
  href: string;
  i18nKey: string;
  icon: string;
}

export const NAV_LINKS: NavLinkDef[] = [
  { href: "/architecture/", i18nKey: "nav.architecture", icon: ICON_LAYERS },
  { href: "/ia/", i18nKey: "nav.ai", icon: ICON_BOT },
  { href: "/infrastructure/", i18nKey: "nav.infrastructure", icon: ICON_NETWORK },
  { href: "/security/", i18nKey: "nav.security", icon: ICON_SHIELD_CHECK },
  { href: "/projects/", i18nKey: "nav.projects", icon: ICON_FOLDER_KANBAN },
  { href: "/posts/", i18nKey: "nav.posts", icon: ICON_NEWSPAPER },
];
