export type UserRole = 'admin' | 'partner';

export interface User {
  id: string;
  collectionId?: string;
  collectionName?: string;
  email: string;
  name?: string;
  avatar?: string;
  role: UserRole;
  active: boolean;
  created?: string;
  updated?: string;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
  isCancelled?: boolean;
}
