import {
  ICON_BOT,
  ICON_LAYERS,
  ICON_NETWORK,
  ICON_SHIELD_CHECK,
} from "../icons";

export const KNOWLEDGE_DOMAINS = [
  {
    slug: "architecture",
    route: "/architecture/",
    titleKey: "domain.architecture.title",
    descriptionKey: "domain.architecture.description",
    icon: ICON_LAYERS,
  },
  {
    slug: "ai",
    route: "/ia/",
    titleKey: "domain.ai.title",
    descriptionKey: "domain.ai.description",
    icon: ICON_BOT,
  },
  {
    slug: "infrastructure",
    route: "/infrastructure/",
    titleKey: "domain.infrastructure.title",
    descriptionKey: "domain.infrastructure.description",
    icon: ICON_NETWORK,
  },
  {
    slug: "security",
    route: "/security/",
    titleKey: "domain.security.title",
    descriptionKey: "domain.security.description",
    icon: ICON_SHIELD_CHECK,
  },
] as const;

export type KnowledgeDomain = (typeof KNOWLEDGE_DOMAINS)[number]["slug"];

export const POST_KINDS = ["article", "decision", "experiment", "runbook"] as const;
export type PostKind = (typeof POST_KINDS)[number];

export const PROJECT_STATUSES = ["discovery", "development", "operating", "archived"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export const DOCUMENT_KINDS = ["adr", "runbook", "reference"] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];
export type ContentVisibility = "draft" | "published";

export const REQUIRED_ARTICLE_SECTIONS = [
  "Contexto e problema",
  "Objetivo e restrições",
  "Arquitetura e decisões",
  "Implementação e evidências",
  "Operação e riscos",
  "Resultado e próximos passos",
] as const;

export const ARTICLE_STAGES = [
  {
    number: "01",
    titleKey: "structure.context.title",
    descriptionKey: "structure.context.description",
    methodTitleKey: "method.context.title",
    methodDescriptionKey: "method.context.copy",
  },
  {
    number: "02",
    titleKey: "structure.design.title",
    descriptionKey: "structure.design.description",
    methodTitleKey: "method.design.title",
    methodDescriptionKey: "method.design.copy",
  },
  {
    number: "03",
    titleKey: "structure.delivery.title",
    descriptionKey: "structure.delivery.description",
    methodTitleKey: "method.delivery.title",
    methodDescriptionKey: "method.delivery.copy",
  },
] as const;

export function isKnowledgeDomain(value: unknown): value is KnowledgeDomain {
  return KNOWLEDGE_DOMAINS.some((domain) => domain.slug === value);
}

export function isPostKind(value: unknown): value is PostKind {
  return POST_KINDS.some((kind) => kind === value);
}

export function isProjectStatus(value: unknown): value is ProjectStatus {
  return PROJECT_STATUSES.some((status) => status === value);
}

export function isDocumentKind(value: unknown): value is DocumentKind {
  return DOCUMENT_KINDS.some((kind) => kind === value);
}

export function isContentVisibility(value: unknown): value is ContentVisibility {
  return value === "draft" || value === "published";
}
