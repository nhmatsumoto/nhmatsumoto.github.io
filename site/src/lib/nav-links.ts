import {
  ICON_BOT,
  ICON_CODE_2,
  ICON_DATABASE,
  ICON_LAYERS,
  ICON_LANGUAGES,
  ICON_NETWORK,
  ICON_SQUARE_TERMINAL,
} from "./icons";

export interface NavLinkDef {
  href: string;
  i18nKey: string;
  icon: string;
  activePaths?: string[];
}

export const NAV_GROUPS: { label: string; links: NavLinkDef[] }[] = [
  {
    label: "nav.group_development",
    links: [
      { href: "/dotnet/", i18nKey: "nav.dotnet", icon: ICON_CODE_2 },
      { href: "/algorithms/", i18nKey: "nav.algorithms", icon: ICON_SQUARE_TERMINAL },
      { href: "/stacks/", i18nKey: "nav.stacks", icon: ICON_LANGUAGES },
    ],
  },
  {
    label: "nav.group_systems",
    links: [
      { href: "/architecture/", i18nKey: "nav.architecture", icon: ICON_LAYERS },
      { href: "/infrastructure/", i18nKey: "nav.infrastructure_security", icon: ICON_NETWORK, activePaths: ["/security/"] },
    ],
  },
  {
    label: "nav.group_data_ai",
    links: [
      { href: "/data/", i18nKey: "nav.data", icon: ICON_DATABASE },
      { href: "/ia/", i18nKey: "nav.ai", icon: ICON_BOT },
    ],
  },
];
