import yaml from 'js-yaml';
import type { Project } from '@models/Project';
import { isValidProjectKey } from '@models/Project';
import type { FileStore } from './FileStore';

/** Reads and writes `project.yml` files and owns the per-project id counter. */
export class ProjectRepository {
  constructor(private readonly store: FileStore) {}

  async list(): Promise<Project[]> {
    const keys = await this.store.listDirs(this.store.projectsDir());
    const projects: Project[] = [];
    for (const key of keys) {
      const project = await this.tryRead(key);
      if (project) projects.push(project);
    }
    return projects.sort((a, b) => a.key.localeCompare(b.key));
  }

  async get(key: string): Promise<Project> {
    const project = await this.tryRead(key);
    if (!project) throw new Error(`Project "${key}" not found.`);
    return project;
  }

  async exists(key: string): Promise<boolean> {
    return this.store.exists(this.store.projectFile(key));
  }

  async create(project: Project): Promise<Project> {
    if (!isValidProjectKey(project.key)) {
      throw new Error(`Invalid project key "${project.key}".`);
    }
    if (await this.exists(project.key)) {
      throw new Error(`Project "${project.key}" already exists.`);
    }
    await this.store.ensureDir(this.store.ticketsDir(project.key));
    await this.write(project);
    return project;
  }

  async write(project: Project): Promise<void> {
    const text = yaml.dump(
      {
        key: project.key,
        name: project.name,
        counter: project.counter,
        created: project.created,
      },
      { lineWidth: -1, sortKeys: false },
    );
    await this.store.writeText(this.store.projectFile(project.key), text);
  }

  /** Reserve the next ticket number, persisting the bumped counter. */
  async bumpCounter(key: string): Promise<number> {
    const project = await this.get(key);
    project.counter += 1;
    await this.write(project);
    return project.counter;
  }

  /** Permanently remove the project folder and everything in it. */
  async delete(key: string): Promise<void> {
    await this.store.remove(this.store.projectDir(key));
  }

  private async tryRead(key: string): Promise<Project | null> {
    const file = this.store.projectFile(key);
    if (!(await this.store.exists(file))) return null;
    const parsed = yaml.load(await this.store.readText(file));
    if (!parsed || typeof parsed !== 'object') return null;
    const p = parsed as Record<string, unknown>;
    return {
      key: String(p.key ?? key),
      name: String(p.name ?? key),
      counter: Number(p.counter ?? 0),
      created: String(p.created ?? new Date(0).toISOString()),
    };
  }
}
