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

export interface CreateUserDto {
  email: string;
  name?: string;
  role: UserRole;
  password?: string;
}

export interface UpdateUserDto {
  email?: string;
  name?: string;
  role?: UserRole;
  active?: boolean;
  password?: string;
  passwordConfirm?: string;
}

export type UserRoleFilter = 'all' | 'admin' | 'partner';
export type UserStatusFilter = 'all' | 'active' | 'inactive';

