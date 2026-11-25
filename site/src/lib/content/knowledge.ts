import {
  ICON_BOT,
  ICON_CODE_2,
  ICON_DATABASE,
  ICON_LANGUAGES,
  ICON_LAYERS,
  ICON_NETWORK,
  ICON_SHIELD_CHECK,
  ICON_SQUARE_TERMINAL,
} from "../icons";

export const KNOWLEDGE_DOMAINS = [
  {
    slug: "dotnet",
    route: "/dotnet/",
    titleKey: "domain.dotnet.title",
    descriptionKey: "domain.dotnet.description",
    icon: ICON_CODE_2,
  },
  {
    slug: "algorithms",
    route: "/algorithms/",
    titleKey: "domain.algorithms.title",
    descriptionKey: "domain.algorithms.description",
    icon: ICON_SQUARE_TERMINAL,
  },
  {
    slug: "architecture",
    route: "/architecture/",
    titleKey: "domain.architecture.title",
    descriptionKey: "domain.architecture.description",
    icon: ICON_LAYERS,
  },
  {
    slug: "data",
    route: "/data/",
    titleKey: "domain.data.title",
    descriptionKey: "domain.data.description",
    icon: ICON_DATABASE,
  },
  {
    slug: "infrastructure",
    route: "/infrastructure/",
    titleKey: "domain.infrastructure.title",
    descriptionKey: "domain.infrastructure.description",
    icon: ICON_NETWORK,
  },
  {
    slug: "stacks",
    route: "/stacks/",
    titleKey: "domain.stacks.title",
    descriptionKey: "domain.stacks.description",
    icon: ICON_LANGUAGES,
  },
  {
    slug: "ai",
    route: "/ia/",
    titleKey: "domain.ai.title",
    descriptionKey: "domain.ai.description",
    icon: ICON_BOT,
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

export const HOME_KNOWLEDGE_DOMAINS = KNOWLEDGE_DOMAINS;

export function topicSlug(topic: string): string {
  return topic
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const KNOWLEDGE_HUBS = {
  dotnet: {
    groups: [
      { titleKey: "hub.dotnet.runtime", topics: [".NET", "C#"] },
      { titleKey: "hub.dotnet.libraries", topics: ["Dapper", "FluentValidation"] },
    ],
  },
  algorithms: {
    groups: [
      {
        titleKey: "hub.algorithms.list",
        ordered: true,
        topics: [
          "Arrays",
          "Strings",
          "Hash maps",
          "Two pointers",
          "Sliding window",
          "Stacks",
          "Queues",
          "Binary search",
          "Linked lists",
          "Recursion",
          "Binary trees",
          "Heaps",
          "Priority queues",
          "Sorting algorithms",
          "BFS",
          "DFS",
          "Backtracking",
          "DP",
          "Greedy algorithm",
          "Union-find",
          "Tries",
          "Topological sort",
          "Dijkstra's",
        ],
      },
    ],
  },
  architecture: {
    groups: [
      { titleKey: "hub.architecture.design", topics: ["DDD", "Microserviços"] },
      { titleKey: "hub.architecture.integration", topics: ["RabbitMQ", "Ocelot Gateway"] },
      { titleKey: "hub.architecture.jobs", topics: ["Hangfire"] },
    ],
  },
  data: {
    groups: [
      { titleKey: "hub.data.relational", topics: ["SQL", "SQL Server", "MySQL", "MariaDB"] },
      { titleKey: "hub.data.document", topics: ["MongoDB", "Dapper"] },
    ],
  },
  infrastructure: {
    groups: [
      { titleKey: "hub.infrastructure.containers", topics: ["Docker", "Podman"] },
    ],
    related: [{ href: "/security/", titleKey: "hub.security_link" }],
  },
  stacks: {
    groups: [
      { titleKey: "hub.stacks.web", topics: ["React", "JavaScript", "TypeScript", "CSS", "HTML"] },
      { titleKey: "hub.stacks.languages", topics: ["Python", "Java"] },
    ],
  },
  ai: {
    groups: [
      { titleKey: "hub.ai.evaluation", topics: ["AI Evaluation"] },
    ],
  },
  security: {
    groups: [
      { titleKey: "hub.security.application", topics: ["Segurança de aplicações", "Identidade e acesso"] },
      { titleKey: "hub.security.platform", topics: ["Containers", "Sistemas distribuídos"] },
    ],
    related: [{ href: "/infrastructure/", titleKey: "hub.infrastructure_link" }],
  },
} as const satisfies Record<KnowledgeDomain, {
  groups: readonly { titleKey: string; topics: readonly string[]; ordered?: boolean }[];
  related?: readonly { href: string; titleKey: string }[];
}>;

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
