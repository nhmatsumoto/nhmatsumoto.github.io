import {
  ICON_BOT,
  ICON_FILE_TEXT,
  ICON_FOLDER_KANBAN,
  ICON_LAYERS,
  ICON_NEWSPAPER,
  ICON_USER_ROUND,
} from "./icons";

export interface NavLinkDef {
  href: string;
  i18nKey: string;
  icon: string;
}

export const NAV_LINKS: NavLinkDef[] = [
  { href: "/about/", i18nKey: "nav.about", icon: ICON_USER_ROUND },
  { href: "/posts/", i18nKey: "nav.posts", icon: ICON_NEWSPAPER },
  { href: "/fundamentos/", i18nKey: "nav.fundamentals", icon: ICON_LAYERS },
  { href: "/ia/", i18nKey: "nav.ai", icon: ICON_BOT },
  { href: "/projects/", i18nKey: "nav.projects", icon: ICON_FOLDER_KANBAN },
  { href: "/documents/", i18nKey: "nav.documents", icon: ICON_FILE_TEXT },
];
