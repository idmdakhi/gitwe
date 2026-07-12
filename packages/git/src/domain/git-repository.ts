export interface GitRepository {
  readonly root: string;

  client(): GitClient;
}
