export type LaunchStatus = "draft" | "published" | "paused";

export type LaunchProject = {
  id: number;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  audience: string;
  status: LaunchStatus;
  createdAt: string;
  updatedAt: string;
};

export type LaunchSignup = {
  id: number;
  projectId: number;
  email: string;
  source: string;
  createdAt: string;
};

export type LaunchFeedback = {
  id: number;
  projectId: number;
  title: string;
  body: string;
  votes: number;
  createdAt: string;
  updatedAt: string;
};

export type LaunchKitState = {
  projects: LaunchProject[];
  signups: LaunchSignup[];
  feedback: LaunchFeedback[];
};

export type ProjectAnalytics = {
  signupCount: number;
  feedbackCount: number;
  conversionSignals: number;
  topFeedback: LaunchFeedback[];
  recentSignups: LaunchSignup[];
};

export const STORAGE_KEY = "launchkit-minimal:v1";

const demoTimestamp = new Date(0).toISOString();

export function normalizeSlug(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  return slug || "launch";
}

export function validateEmail(value: string): boolean {
  const email = value.trim();
  return email.length <= 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function normalizeStatus(value: string): LaunchStatus {
  return value === "published" || value === "paused" || value === "draft" ? value : "draft";
}

export function seedLaunchKit(): LaunchKitState {
  return {
    projects: [
      {
        id: 1,
        slug: "demo",
        name: "LaunchKit Demo",
        tagline: "Validate the next product before you build the whole thing.",
        description:
          "A quiet validation page for collecting early interest and learning which feature people actually want first.",
        audience: "Solo builders testing a focused product wedge.",
        status: "published",
        createdAt: demoTimestamp,
        updatedAt: demoTimestamp,
      },
    ],
    signups: [],
    feedback: [
      {
        id: 1,
        projectId: 1,
        title: "Let me vote on the first feature before launch",
        body: "The page should make it easy to say what would make this useful.",
        votes: 7,
        createdAt: demoTimestamp,
        updatedAt: demoTimestamp,
      },
      {
        id: 2,
        projectId: 1,
        title: "Send a short launch email when it is ready",
        body: "A single announcement is enough for the first version.",
        votes: 4,
        createdAt: demoTimestamp,
        updatedAt: demoTimestamp,
      },
    ],
  };
}

export function loadLaunchKit(storage: Storage | undefined = browserStorage()): LaunchKitState {
  if (!storage) return seedLaunchKit();

  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return seedLaunchKit();

  try {
    const parsed = JSON.parse(raw) as LaunchKitState;
    if (!Array.isArray(parsed.projects)) return seedLaunchKit();
    if (!Array.isArray(parsed.signups)) return seedLaunchKit();
    if (!Array.isArray(parsed.feedback)) return seedLaunchKit();
    return parsed;
  } catch {
    return seedLaunchKit();
  }
}

export function saveLaunchKit(
  state: LaunchKitState,
  storage: Storage | undefined = browserStorage(),
): void {
  storage?.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function createProject(
  state: LaunchKitState,
  input: {
    name: string;
    slug?: string;
    tagline: string;
    description: string;
    audience?: string;
    status?: string;
  },
): LaunchProject {
  const name = input.name.trim();
  const tagline = input.tagline.trim();
  const description = input.description.trim();

  assertProjectCopy(name, tagline, description);

  const createdAt = nowIso();
  const project: LaunchProject = {
    id: nextId(state.projects),
    slug: uniqueSlug(state, normalizeSlug(input.slug || name)),
    name,
    tagline,
    description,
    audience: input.audience?.trim() || "",
    status: normalizeStatus(input.status || "draft"),
    createdAt,
    updatedAt: createdAt,
  };

  state.projects.unshift(project);
  return project;
}

export function updateProject(state: LaunchKitState, input: LaunchProject): LaunchProject {
  const name = input.name.trim();
  const tagline = input.tagline.trim();
  const description = input.description.trim();

  assertProjectCopy(name, tagline, description);

  const index = state.projects.findIndex((project) => project.id === input.id);
  if (index === -1) throw new Error("Project not found.");

  const nextProject: LaunchProject = {
    ...input,
    slug: uniqueSlug(state, normalizeSlug(input.slug), input.id),
    name,
    tagline,
    description,
    audience: input.audience.trim(),
    status: normalizeStatus(input.status),
    updatedAt: nowIso(),
  };

  state.projects[index] = nextProject;
  return nextProject;
}

export function addSignup(
  state: LaunchKitState,
  input: { projectId: number; email: string; source?: string },
): LaunchSignup {
  const email = input.email.trim().toLowerCase();
  if (!validateEmail(email)) throw new Error("Enter a valid email address.");
  assertProjectExists(state, input.projectId);

  const existing = state.signups.find(
    (signup) => signup.projectId === input.projectId && signup.email === email,
  );
  if (existing) return existing;

  const signup: LaunchSignup = {
    id: nextId(state.signups),
    projectId: input.projectId,
    email,
    source: input.source?.trim() || "",
    createdAt: nowIso(),
  };

  state.signups.unshift(signup);
  return signup;
}

export function addFeedback(
  state: LaunchKitState,
  input: { projectId: number; title: string; body?: string },
): LaunchFeedback {
  assertProjectExists(state, input.projectId);

  const title = input.title.trim();
  const body = input.body?.trim() || "";
  if (title.length < 3) throw new Error("Feedback must be at least 3 characters.");
  if (title.length > 140) throw new Error("Feedback title is too long.");
  if (body.length > 1000) throw new Error("Feedback details are too long.");

  const createdAt = nowIso();
  const feedback: LaunchFeedback = {
    id: nextId(state.feedback),
    projectId: input.projectId,
    title,
    body,
    votes: 1,
    createdAt,
    updatedAt: createdAt,
  };

  state.feedback.unshift(feedback);
  return feedback;
}

export function upvoteFeedback(state: LaunchKitState, feedbackId: number): LaunchFeedback {
  const feedback = state.feedback.find((item) => item.id === feedbackId);
  if (!feedback) throw new Error("Feedback not found.");

  feedback.votes += 1;
  feedback.updatedAt = nowIso();
  return feedback;
}

export function deleteFeedback(state: LaunchKitState, feedbackId: number): void {
  state.feedback = state.feedback.filter((item) => item.id !== feedbackId);
}

export function getProjectAnalytics(state: LaunchKitState, projectId: number): ProjectAnalytics {
  const projectSignups = state.signups
    .filter((signup) => signup.projectId === projectId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const projectFeedback = state.feedback
    .filter((item) => item.projectId === projectId)
    .sort((a, b) => b.votes - a.votes || b.createdAt.localeCompare(a.createdAt));

  return {
    signupCount: projectSignups.length,
    feedbackCount: projectFeedback.length,
    conversionSignals: projectSignups.length + projectFeedback.length,
    topFeedback: projectFeedback,
    recentSignups: projectSignups,
  };
}

export function getProjectBySlug(state: LaunchKitState, slug: string): LaunchProject | undefined {
  return state.projects.find((project) => project.slug === normalizeSlug(slug));
}

function assertProjectCopy(name: string, tagline: string, description: string): void {
  if (name.length < 2) throw new Error("Name must be at least 2 characters.");
  if (tagline.length < 8) throw new Error("Tagline must be at least 8 characters.");
  if (description.length < 20) throw new Error("Description must be at least 20 characters.");
}

function assertProjectExists(state: LaunchKitState, projectId: number): void {
  if (!state.projects.some((project) => project.id === projectId)) {
    throw new Error("Project not found.");
  }
}

function uniqueSlug(state: LaunchKitState, slug: string, currentProjectId?: number): string {
  let candidate = slug;
  let suffix = 2;
  while (
    state.projects.some((project) => project.slug === candidate && project.id !== currentProjectId)
  ) {
    candidate = `${slug}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function nextId(items: Array<{ id: number }>): number {
  return items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

function nowIso(): string {
  return new Date().toISOString();
}

function browserStorage(): Storage | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}
