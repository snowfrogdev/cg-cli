export interface CGConfig {
  cookie?: string;
  userId?: number;
  puzzleName?: string;
  codePath?: string;
  sourcePath?: string;
  programmingLanguageId?: string;
  /**
   * The agent id for the first agent.
   * A value of -1 means the code supplied with the request.
   * A value of -2 meand the boss for the league.
   */
  agent1?: number;
   /**
   * The agent id for the second agent.
   * A value of -1 means the code supplied with the request.
   * A value of -2 meand the boss for the league.
   */
  agent2?: number;
  outputDir?: string;
}
