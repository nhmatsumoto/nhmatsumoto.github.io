import {
  ICON_BOT,
  ICON_CODE_2,
  ICON_DATABASE,
  ICON_LAYERS,
  ICON_LANGUAGES,
  ICON_NETWORK,
} from "./icons";

export interface NavLinkDef {
  href: string;
  i18nKey: string;
  icon: string;
  activePaths?: string[];
}

export const NAV_LINKS: NavLinkDef[] = [
  { href: "/dotnet/", i18nKey: "nav.dotnet", icon: ICON_CODE_2 },
  { href: "/architecture/", i18nKey: "nav.architecture", icon: ICON_LAYERS },
  { href: "/data/", i18nKey: "nav.data", icon: ICON_DATABASE },
  {
    href: "/infrastructure/",
    i18nKey: "nav.infrastructure_security",
    icon: ICON_NETWORK,
    activePaths: ["/security/"],
  },
  { href: "/stacks/", i18nKey: "nav.stacks", icon: ICON_LANGUAGES },
  { href: "/ia/", i18nKey: "nav.ai", icon: ICON_BOT },
];
