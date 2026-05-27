import { describe, expect, it } from "vitest";
import {
  addFeedback,
  addSignup,
  createProject,
  getProjectAnalytics,
  normalizeSlug,
  seedLaunchKit,
  updateProject,
  upvoteFeedback,
  validateEmail,
} from "./launchkit";

describe("launchkit data model", () => {
  it("normalizes slugs for public launch URLs", () => {
    expect(normalizeSlug("  AI Budget App!! ")).toBe("ai-budget-app");
    expect(normalizeSlug("")).toBe("launch");
    expect(normalizeSlug("one---two   three")).toBe("one-two-three");
  });

  it("validates practical waitlist emails", () => {
    expect(validateEmail("founder@example.com")).toBe(true);
    expect(validateEmail(" founder@example.com ")).toBe(true);
    expect(validateEmail("bad-email")).toBe(false);
    expect(validateEmail("a".repeat(250) + "@example.com")).toBe(false);
  });

  it("creates projects with editable launch copy", () => {
    const kit = seedLaunchKit();
    const project = createProject(kit, {
      name: "Tiny CRM",
      tagline: "Follow up with every warm lead.",
      description: "A simple validation page for a tiny CRM built for solo consultants.",
      audience: "Solo consultants",
      status: "published",
    });

    expect(project.slug).toBe("tiny-crm");
    expect(kit.projects).toHaveLength(2);

    const updated = updateProject(kit, {
      ...project,
      tagline: "Never forget the next follow-up.",
      status: "paused",
    });

    expect(updated.tagline).toBe("Never forget the next follow-up.");
    expect(updated.status).toBe("paused");
  });

  it("deduplicates waitlist signups per project and records source", () => {
    const kit = seedLaunchKit();
    const project = kit.projects[0];

    addSignup(kit, { projectId: project.id, email: "FOUNDER@example.com", source: "hero" });
    addSignup(kit, { projectId: project.id, email: " founder@example.com ", source: "footer" });

    expect(kit.signups).toHaveLength(1);
    expect(kit.signups[0]).toMatchObject({
      projectId: project.id,
      email: "founder@example.com",
      source: "hero",
    });
  });

  it("tracks feedback, votes, and analytics", () => {
    const kit = seedLaunchKit();
    const project = kit.projects[0];

    const feedback = addFeedback(kit, {
      projectId: project.id,
      title: "Add a changelog widget",
      body: "It would help early users see what changed.",
    });
    upvoteFeedback(kit, feedback.id);
    addSignup(kit, { projectId: project.id, email: "founder@example.com", source: "hero" });

    const analytics = getProjectAnalytics(kit, project.id);

    expect(analytics.signupCount).toBe(1);
    expect(analytics.feedbackCount).toBe(3);
    expect(analytics.topFeedback).toContainEqual(
      expect.objectContaining({
        title: "Add a changelog widget",
        votes: 2,
      }),
    );
    expect(analytics.topFeedback[0]).toMatchObject({
      title: "Let me vote on the first feature before launch",
      votes: 7,
    });
  });
});
