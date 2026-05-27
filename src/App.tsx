import {
  ArrowUp,
  BarChart3,
  Check,
  ExternalLink,
  Eye,
  Inbox,
  LayoutDashboard,
  Plus,
  RefreshCcw,
  Save,
  Trash2,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  addFeedback,
  addSignup,
  createProject,
  deleteFeedback,
  getProjectAnalytics,
  getProjectBySlug,
  loadLaunchKit,
  normalizeSlug,
  saveLaunchKit,
  seedLaunchKit,
  updateProject,
  upvoteFeedback,
  type LaunchKitState,
  type LaunchProject,
  type LaunchStatus,
} from "./lib/launchkit";

type Notice = { kind: "success" | "error"; text: string } | null;

const emptyProject = {
  name: "",
  slug: "",
  tagline: "",
  description: "",
  audience: "",
  status: "draft" as LaunchStatus,
};

export default function App() {
  const [state, setState] = useState<LaunchKitState>(() => loadLaunchKit());
  const [path, setPath] = useState(() => window.location.pathname);

  function commit(next: LaunchKitState) {
    setState(next);
    saveLaunchKit(next);
  }

  function navigate(nextPath: string) {
    window.history.pushState(null, "", nextPath);
    setPath(nextPath);
  }

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const publicMatch = path.match(/^\/launch\/([^/]+)$/);
  if (publicMatch) {
    return (
      <PublicLaunchPage
        slug={publicMatch[1]}
        state={state}
        commit={commit}
        navigate={navigate}
      />
    );
  }

  return <AdminPage state={state} commit={commit} navigate={navigate} />;
}

function AdminPage({
  state,
  commit,
  navigate,
}: {
  state: LaunchKitState;
  commit: (state: LaunchKitState) => void;
  navigate: (path: string) => void;
}) {
  const [selectedId, setSelectedId] = useState(state.projects[0]?.id ?? 1);
  const selected = state.projects.find((project) => project.id === selectedId) ?? state.projects[0];
  const [createForm, setCreateForm] = useState(emptyProject);
  const [editForm, setEditForm] = useState(projectToForm(selected));
  const [notice, setNotice] = useState<Notice>(null);

  const analytics = selected ? getProjectAnalytics(state, selected.id) : null;

  function selectProject(project: LaunchProject) {
    setSelectedId(project.id);
    setEditForm(projectToForm(project));
    setNotice(null);
  }

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    try {
      const next = cloneState(state);
      const project = createProject(next, createForm);
      commit(next);
      setSelectedId(project.id);
      setEditForm(projectToForm(project));
      setCreateForm(emptyProject);
      setNotice({ kind: "success", text: "Project created." });
    } catch (error) {
      setNotice({ kind: "error", text: messageFrom(error, "Could not create project.") });
    }
  }

  function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;

    try {
      const next = cloneState(state);
      const updated = updateProject(next, {
        ...selected,
        ...editForm,
        slug: normalizeSlug(editForm.slug || editForm.name),
      });
      commit(next);
      setEditForm(projectToForm(updated));
      setNotice({ kind: "success", text: "Project saved." });
    } catch (error) {
      setNotice({ kind: "error", text: messageFrom(error, "Could not save project.") });
    }
  }

  function handleDeleteFeedback(feedbackId: number) {
    const next = cloneState(state);
    deleteFeedback(next, feedbackId);
    commit(next);
    setNotice({ kind: "success", text: "Feedback deleted." });
  }

  function resetDemo() {
    const next = seedLaunchKit();
    commit(next);
    setSelectedId(next.projects[0].id);
    setEditForm(projectToForm(next.projects[0]));
    setNotice({ kind: "success", text: "Demo data restored." });
  }

  return (
    <main className="shell">
      <header className="topbar">
        <button className="brand" onClick={() => navigate("/")}>
          <LayoutDashboard size={18} />
          LaunchKit Minimal
        </button>
        <div className="topbar-actions">
          <button className="icon-button" onClick={resetDemo} title="Reset demo data">
            <RefreshCcw size={17} />
          </button>
          {selected ? (
            <button className="secondary-button" onClick={() => navigate(`/launch/${selected.slug}`)}>
              <Eye size={16} />
              View page
            </button>
          ) : null}
        </div>
      </header>

      <section className="workspace">
        <aside className="sidebar">
          <form className="panel" onSubmit={handleCreate}>
            <div className="panel-title">
              <Plus size={16} />
              New project
            </div>
            <Field
              label="Name"
              value={createForm.name}
              onChange={(name) => setCreateForm({ ...createForm, name })}
            />
            <Field
              label="Slug"
              value={createForm.slug}
              onChange={(slug) => setCreateForm({ ...createForm, slug })}
            />
            <Field
              label="Tagline"
              value={createForm.tagline}
              onChange={(tagline) => setCreateForm({ ...createForm, tagline })}
            />
            <TextArea
              label="Description"
              value={createForm.description}
              onChange={(description) => setCreateForm({ ...createForm, description })}
              rows={4}
            />
            <button className="primary-button" type="submit">
              <Plus size={16} />
              Create
            </button>
          </form>

          <div className="project-list">
            {state.projects.map((project) => {
              const itemAnalytics = getProjectAnalytics(state, project.id);
              return (
                <button
                  key={project.id}
                  className={project.id === selected?.id ? "project-item active" : "project-item"}
                  onClick={() => selectProject(project)}
                >
                  <span>
                    <strong>{project.name}</strong>
                    <small>
                      {itemAnalytics.signupCount} signups · {itemAnalytics.feedbackCount} feedback
                    </small>
                  </span>
                  <em>{project.status}</em>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="main-panel">
          {selected && analytics ? (
            <>
              <div className="section-header">
                <div>
                  <p className="eyebrow">Launch workspace</p>
                  <h1>{selected.name}</h1>
                </div>
                <button className="secondary-button" onClick={() => navigate(`/launch/${selected.slug}`)}>
                  <ExternalLink size={16} />
                  Open public page
                </button>
              </div>

              {notice ? <NoticeBanner notice={notice} /> : null}

              <div className="metrics-grid">
                <Metric icon={<Inbox size={18} />} label="Waitlist" value={analytics.signupCount} />
                <Metric
                  icon={<BarChart3 size={18} />}
                  label="Feedback"
                  value={analytics.feedbackCount}
                />
                <Metric
                  icon={<Check size={18} />}
                  label="Signals"
                  value={analytics.conversionSignals}
                />
              </div>

              <div className="editor-grid">
                <form className="editor" onSubmit={handleSave}>
                  <div className="split-fields">
                    <Field
                      label="Name"
                      value={editForm.name}
                      onChange={(name) => setEditForm({ ...editForm, name })}
                    />
                    <Field
                      label="Slug"
                      value={editForm.slug}
                      onChange={(slug) => setEditForm({ ...editForm, slug })}
                    />
                  </div>
                  <Field
                    label="Tagline"
                    value={editForm.tagline}
                    onChange={(tagline) => setEditForm({ ...editForm, tagline })}
                  />
                  <TextArea
                    label="Description"
                    value={editForm.description}
                    onChange={(description) => setEditForm({ ...editForm, description })}
                    rows={6}
                  />
                  <div className="split-fields compact">
                    <Field
                      label="Audience"
                      value={editForm.audience}
                      onChange={(audience) => setEditForm({ ...editForm, audience })}
                    />
                    <label className="field">
                      <span>Status</span>
                      <select
                        value={editForm.status}
                        onChange={(event) =>
                          setEditForm({ ...editForm, status: event.target.value as LaunchStatus })
                        }
                      >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="paused">Paused</option>
                      </select>
                    </label>
                  </div>
                  <button className="primary-button fit" type="submit">
                    <Save size={16} />
                    Save project
                  </button>
                </form>

                <div className="insights">
                  <Panel title="Recent signups">
                    {analytics.recentSignups.length ? (
                      analytics.recentSignups.slice(0, 8).map((signup) => (
                        <div className="list-row" key={signup.id}>
                          <span>{signup.email}</span>
                          <small>{signup.source || "page"}</small>
                        </div>
                      ))
                    ) : (
                      <EmptyState text="No signups yet." />
                    )}
                  </Panel>

                  <Panel title="Top feedback">
                    {analytics.topFeedback.length ? (
                      analytics.topFeedback.slice(0, 8).map((item) => (
                        <div className="feedback-row" key={item.id}>
                          <div>
                            <strong>{item.title}</strong>
                            {item.body ? <p>{item.body}</p> : null}
                          </div>
                          <div className="row-actions">
                            <span>{item.votes}</span>
                            <button
                              className="icon-button small"
                              onClick={() => handleDeleteFeedback(item.id)}
                              title="Delete feedback"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyState text="No feedback yet." />
                    )}
                  </Panel>
                </div>
              </div>
            </>
          ) : (
            <EmptyState text="Create a project to start collecting launch signals." />
          )}
        </section>
      </section>
    </main>
  );
}

function PublicLaunchPage({
  slug,
  state,
  commit,
  navigate,
}: {
  slug: string;
  state: LaunchKitState;
  commit: (state: LaunchKitState) => void;
  navigate: (path: string) => void;
}) {
  const project = getProjectBySlug(state, slug);
  const [email, setEmail] = useState("");
  const [feedbackTitle, setFeedbackTitle] = useState("");
  const [feedbackBody, setFeedbackBody] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const analytics = useMemo(
    () => (project ? getProjectAnalytics(state, project.id) : null),
    [project, state],
  );

  if (!project || project.status !== "published") {
    return (
      <main className="public-shell center">
        <div className="not-found">
          <p className="eyebrow">Launch page</p>
          <h1>Page not found</h1>
          <p>This project is missing, paused, or still in draft mode.</p>
          <button className="secondary-button" onClick={() => navigate("/")}>
            Back to admin
          </button>
        </div>
      </main>
    );
  }

  function handleSignup(event: FormEvent) {
    event.preventDefault();
    if (!project) return;
    try {
      const next = cloneState(state);
      addSignup(next, { projectId: project.id, email, source: "launch-page" });
      commit(next);
      setEmail("");
      setNotice({ kind: "success", text: "You're on the waitlist." });
    } catch (error) {
      setNotice({ kind: "error", text: messageFrom(error, "Could not join waitlist.") });
    }
  }

  function handleFeedback(event: FormEvent) {
    event.preventDefault();
    if (!project) return;
    try {
      const next = cloneState(state);
      addFeedback(next, { projectId: project.id, title: feedbackTitle, body: feedbackBody });
      commit(next);
      setFeedbackTitle("");
      setFeedbackBody("");
      setNotice({ kind: "success", text: "Feedback saved." });
    } catch (error) {
      setNotice({ kind: "error", text: messageFrom(error, "Could not save feedback.") });
    }
  }

  function handleVote(feedbackId: number) {
    const next = cloneState(state);
    upvoteFeedback(next, feedbackId);
    commit(next);
  }

  return (
    <main className="public-shell">
      <header className="public-nav">
        <button className="brand" onClick={() => navigate("/")}>
          LaunchKit Minimal
        </button>
        <button className="secondary-button" onClick={() => navigate("/")}>
          Admin
        </button>
      </header>

      <section className="public-hero">
        <p className="eyebrow">{project.audience || "Early access"}</p>
        <h1>{project.name}</h1>
        <p className="tagline">{project.tagline}</p>
        <p className="description">{project.description}</p>

        <form className="waitlist-form" onSubmit={handleSignup}>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="founder@example.com"
          />
          <button className="primary-button" type="submit">
            Join waitlist
          </button>
        </form>
        {notice ? <NoticeBanner notice={notice} /> : null}
      </section>

      <section className="public-grid">
        <div className="signal-band">
          <Metric icon={<Inbox size={18} />} label="Waitlist" value={analytics?.signupCount ?? 0} />
          <Metric
            icon={<BarChart3 size={18} />}
            label="Feedback"
            value={analytics?.feedbackCount ?? 0}
          />
        </div>

        <form className="feedback-form" onSubmit={handleFeedback}>
          <h2>Feedback board</h2>
          <Field label="Feature or pain point" value={feedbackTitle} onChange={setFeedbackTitle} />
          <TextArea label="Details" value={feedbackBody} onChange={setFeedbackBody} rows={4} />
          <button className="primary-button fit" type="submit">
            Send feedback
          </button>
        </form>

        <div className="public-feedback-list">
          {analytics?.topFeedback.length ? (
            analytics.topFeedback.map((item) => (
              <article className="public-feedback" key={item.id}>
                <button className="vote-button" onClick={() => handleVote(item.id)}>
                  <ArrowUp size={16} />
                  {item.votes}
                </button>
                <div>
                  <h3>{item.title}</h3>
                  {item.body ? <p>{item.body}</p> : null}
                </div>
              </article>
            ))
          ) : (
            <EmptyState text="No feedback yet. Be first." />
          )}
        </div>
      </section>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="metric">
      <div className="metric-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel">
      <div className="panel-title">{title}</div>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function NoticeBanner({ notice }: { notice: Exclude<Notice, null> }) {
  return <div className={`notice ${notice.kind}`}>{notice.text}</div>;
}

function EmptyState({ text }: { text: string }) {
  return <p className="empty">{text}</p>;
}

function cloneState(state: LaunchKitState): LaunchKitState {
  return {
    projects: state.projects.map((project) => ({ ...project })),
    signups: state.signups.map((signup) => ({ ...signup })),
    feedback: state.feedback.map((item) => ({ ...item })),
  };
}

function projectToForm(project?: LaunchProject) {
  if (!project) return emptyProject;
  return {
    name: project.name,
    slug: project.slug,
    tagline: project.tagline,
    description: project.description,
    audience: project.audience,
    status: project.status,
  };
}

function messageFrom(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
