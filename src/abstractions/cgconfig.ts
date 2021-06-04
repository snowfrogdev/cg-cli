export interface CGConfig {
  cookie?: string;
  userId?: number;
  puzzleName?: string;
  codePath?: string;
  sourcePath?: string;
  excludeDirs?: string[];
  programmingLanguageId?: string;
  /**
   * The agent id for the first agent.
   * A value of -1 means the code supplied with the request.
   * A value of -2 meand the boss for the league.
   */
  agent1?: number;
   /**
   * An array of agent ids to play agent1 against.
   * A value of -1 means the code supplied with the request.
   * A value of -2 meand the boss for the league.
   */
  agent2?: number[];
  outputDir?: string;
}
