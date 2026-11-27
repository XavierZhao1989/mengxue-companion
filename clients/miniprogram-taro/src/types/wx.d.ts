declare const wx:
  | {
      cloud?: {
        init(options: { env: string; traceUser?: boolean }): void;
        callContainer(options: {
          config: { env: string };
          path: string;
          header?: Record<string, string>;
          method?: string;
          data?: unknown;
        }): Promise<{ statusCode: number; data: unknown }>;
      };
    }
  | undefined;
