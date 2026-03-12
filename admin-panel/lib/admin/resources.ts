export type AdminResourceMode = "read" | "crud" | "update";

export type AdminResourceKey =
  | "users"
  | "images"
  | "humor-flavors"
  | "humor-flavor-steps"
  | "humor-mix"
  | "terms"
  | "captions"
  | "caption-requests"
  | "caption-examples"
  | "llm-models"
  | "llm-providers"
  | "llm-prompt-chains"
  | "llm-responses"
  | "allowed-signup-domains"
  | "whitelisted-email-addresses";

export type AdminResourceConfig = {
  key: AdminResourceKey;
  title: string;
  description: string;
  mode: AdminResourceMode;
  tableCandidates: string[];
  listColumnCandidates: string[];
  editableColumnCandidates: string[];
  orderColumnCandidates: string[];
  requiredColumns?: string[];
};

const COMMON_ORDER_COLUMNS = ["created_at", "createdAt", "inserted_at", "updated_at", "id"];

export const ADMIN_RESOURCE_CONFIGS: Record<AdminResourceKey, AdminResourceConfig> = {
  users: {
    key: "users",
    title: "Users",
    description: "Read-only user/profile records.",
    mode: "read",
    tableCandidates: ["profiles", "users"],
    listColumnCandidates: ["id", "email", "username", "full_name", "name", "is_superadmin", "created_at", "updated_at"],
    editableColumnCandidates: [],
    orderColumnCandidates: ["created_datetime_utc", "modified_datetime_utc", ...COMMON_ORDER_COLUMNS],
  },
  images: {
    key: "images",
    title: "Images",
    description: "Create, read, update, and delete image records.",
    mode: "crud",
    tableCandidates: ["images"],
    listColumnCandidates: ["id", "url", "image_url", "path", "src", "title", "alt", "created_at", "updated_at"],
    editableColumnCandidates: ["url", "image_url", "path", "src", "title", "alt"],
    orderColumnCandidates: ["created_datetime_utc", "modified_datetime_utc", ...COMMON_ORDER_COLUMNS],
  },
  "humor-flavors": {
    key: "humor-flavors",
    title: "Humor Flavors",
    description: "Read-only humor flavor records.",
    mode: "read",
    tableCandidates: ["humor_flavors", "humor_flavor", "humorFlavors"],
    listColumnCandidates: ["id", "name", "slug", "description", "active", "created_at", "updated_at"],
    editableColumnCandidates: [],
    orderColumnCandidates: COMMON_ORDER_COLUMNS,
  },
  "humor-flavor-steps": {
    key: "humor-flavor-steps",
    title: "Humor Flavor Steps",
    description: "Read-only humor flavor step records.",
    mode: "read",
    tableCandidates: ["humor_flavor_steps", "humorFlavorSteps"],
    listColumnCandidates: ["id", "humor_flavor_id", "step_order", "name", "instruction", "created_at", "updated_at"],
    editableColumnCandidates: [],
    orderColumnCandidates: COMMON_ORDER_COLUMNS,
  },
  "humor-mix": {
    key: "humor-mix",
    title: "Humor Mix",
    description: "Read and update humor mix configuration.",
    mode: "update",
    tableCandidates: ["humor_flavor_mix"],
    listColumnCandidates: ["id", "created_datetime_utc", "humor_flavor_id", "caption_count"],
    editableColumnCandidates: ["humor_flavor_id", "caption_count"],
    orderColumnCandidates: ["created_datetime_utc", ...COMMON_ORDER_COLUMNS],
  },
  terms: {
    key: "terms",
    title: "Terms",
    description: "Manage domain terms (CRUD).",
    mode: "crud",
    tableCandidates: ["terms"],
    listColumnCandidates: ["id", "term", "definition", "example", "priority", "term_type_id", "modified_datetime_utc", "created_datetime_utc"],
    editableColumnCandidates: ["term", "definition", "example", "priority", "term_type_id"],
    orderColumnCandidates: ["created_datetime_utc", "modified_datetime_utc", "priority", ...COMMON_ORDER_COLUMNS],
    requiredColumns: ["term", "definition", "example"],
  },
  captions: {
    key: "captions",
    title: "Captions",
    description: "Read-only captions.",
    mode: "read",
    tableCandidates: ["captions"],
    listColumnCandidates: ["id", "text", "caption", "content", "body", "image_id", "user_id", "created_at"],
    editableColumnCandidates: [],
    orderColumnCandidates: COMMON_ORDER_COLUMNS,
  },
  "caption-requests": {
    key: "caption-requests",
    title: "Caption Requests",
    description: "Read-only caption generation requests.",
    mode: "read",
    tableCandidates: ["caption_requests", "captionRequests"],
    listColumnCandidates: ["id", "image_id", "user_id", "status", "prompt", "created_at", "updated_at"],
    editableColumnCandidates: [],
    orderColumnCandidates: COMMON_ORDER_COLUMNS,
  },
  "caption-examples": {
    key: "caption-examples",
    title: "Caption Examples",
    description: "Manage caption examples (CRUD).",
    mode: "crud",
    tableCandidates: ["caption_examples", "captionExamples"],
    listColumnCandidates: [
      "id",
      "caption",
      "image_description",
      "explanation",
      "priority",
      "image_id",
      "created_datetime_utc",
      "modified_datetime_utc",
    ],
    editableColumnCandidates: ["caption", "image_description", "explanation", "priority", "image_id"],
    orderColumnCandidates: ["created_datetime_utc", "modified_datetime_utc", ...COMMON_ORDER_COLUMNS],
    requiredColumns: ["caption", "image_description", "explanation"],
  },
  "llm-models": {
    key: "llm-models",
    title: "LLM Models",
    description: "Manage LLM model definitions (CRUD).",
    mode: "crud",
    tableCandidates: ["llm_models", "llmModels"],
    listColumnCandidates: [
      "id",
      "created_datetime_utc",
      "name",
      "llm_provider_id",
      "provider_model_id",
      "is_temperature_supported",
    ],
    editableColumnCandidates: ["name", "llm_provider_id", "provider_model_id", "is_temperature_supported"],
    orderColumnCandidates: ["created_datetime_utc", ...COMMON_ORDER_COLUMNS],
    requiredColumns: ["name", "llm_provider_id", "provider_model_id"],
  },
  "llm-providers": {
    key: "llm-providers",
    title: "LLM Providers",
    description: "Manage LLM providers (CRUD).",
    mode: "crud",
    tableCandidates: ["llm_providers", "llmProviders"],
    listColumnCandidates: ["id", "created_datetime_utc", "name"],
    editableColumnCandidates: ["name"],
    orderColumnCandidates: ["created_datetime_utc", ...COMMON_ORDER_COLUMNS],
    requiredColumns: ["name"],
  },
  "llm-prompt-chains": {
    key: "llm-prompt-chains",
    title: "LLM Prompt Chains",
    description: "Read-only prompt chain records.",
    mode: "read",
    tableCandidates: ["llm_prompt_chains", "llmPromptChains"],
    listColumnCandidates: ["id", "created_datetime_utc", "caption_request_id"],
    editableColumnCandidates: [],
    orderColumnCandidates: ["created_datetime_utc", ...COMMON_ORDER_COLUMNS],
  },
  "llm-responses": {
    key: "llm-responses",
    title: "LLM Responses",
    description: "Read-only LLM responses.",
    mode: "read",
    tableCandidates: ["llm_model_responses"],
    listColumnCandidates: ["id", "created_datetime_utc", "llm_model_response", "processing_time_seconds", "llm_model_id"],
    editableColumnCandidates: [],
    orderColumnCandidates: ["created_datetime_utc", ...COMMON_ORDER_COLUMNS],
  },
  "allowed-signup-domains": {
    key: "allowed-signup-domains",
    title: "Allowed Signup Domains",
    description: "Manage allowed email signup domains (CRUD).",
    mode: "crud",
    tableCandidates: ["allowed_signup_domains"],
    listColumnCandidates: ["id", "created_datetime_utc", "apex_domain"],
    editableColumnCandidates: ["apex_domain"],
    orderColumnCandidates: ["created_datetime_utc", ...COMMON_ORDER_COLUMNS],
  },
  "whitelisted-email-addresses": {
    key: "whitelisted-email-addresses",
    title: "Whitelisted Email Addresses",
    description: "Manage whitelisted email addresses (CRUD).",
    mode: "crud",
    tableCandidates: ["whitelist_email_addresses"],
    listColumnCandidates: ["id", "created_datetime_utc", "modified_datetime_utc", "email_address"],
    editableColumnCandidates: ["email_address"],
    orderColumnCandidates: ["created_datetime_utc", "modified_datetime_utc", ...COMMON_ORDER_COLUMNS],
  },
};

export const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/images", label: "Images" },
  { href: "/admin/humor-flavors", label: "Humor Flavors" },
  { href: "/admin/humor-flavor-steps", label: "Humor Flavor Steps" },
  { href: "/admin/humor-mix", label: "Humor Mix" },
  { href: "/admin/terms", label: "Terms" },
  { href: "/admin/captions", label: "Captions" },
  { href: "/admin/caption-requests", label: "Caption Requests" },
  { href: "/admin/caption-examples", label: "Caption Examples" },
  { href: "/admin/llm-models", label: "LLM Models" },
  { href: "/admin/llm-providers", label: "LLM Providers" },
  { href: "/admin/llm-prompt-chains", label: "LLM Prompt Chains" },
  { href: "/admin/llm-responses", label: "LLM Responses" },
  { href: "/admin/allowed-signup-domains", label: "Allowed Signup Domains" },
  { href: "/admin/whitelisted-email-addresses", label: "Whitelisted Emails" },
];
