export interface FormState {
  ok?: boolean;
  message?: string;
  /** field name → error */
  errors?: Record<string, string>;
}

export const emptyState: FormState = {};
