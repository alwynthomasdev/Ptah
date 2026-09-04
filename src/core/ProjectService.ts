import type { NewProjectInput, Project } from '@models/Project';
import { createProject, DEFAULT_PROJECT_KEY } from '@models/Project';
import type { ProjectRepository } from '@storage/ProjectRepository';

/** Project lifecycle. Deleting a project is permanent and takes its tickets with it. */
export class ProjectService {
  constructor(private readonly projects: ProjectRepository) {}

  list(): Promise<Project[]> {
    return this.projects.list();
  }

  get(key: string): Promise<Project> {
    return this.projects.get(key);
  }

  async create(input: NewProjectInput): Promise<Project> {
    return this.projects.create(createProject(input));
  }

  async rename(key: string, name: string): Promise<Project> {
    const project = await this.projects.get(key);
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Project name must not be empty.');
    project.name = trimmed;
    await this.projects.write(project);
    return project;
  }

  /**
   * Permanently delete the project and every ticket in it. There is no recycle
   * bin for this — the spec calls for a hard delete.
   */
  async delete(key: string): Promise<void> {
    if (!(await this.projects.exists(key))) {
      throw new Error(`Project "${key}" not found.`);
    }
    await this.projects.delete(key);
  }

  async ensureDefaultProject(): Promise<void> {
    if (await this.projects.exists(DEFAULT_PROJECT_KEY)) return;
    await this.projects.create(createProject({ key: DEFAULT_PROJECT_KEY, name: 'To Do' }));
  }
}
