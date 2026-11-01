import React from 'react';
import { usePermission } from '../rbac';

/**
 * Only renders children if the current user has the given feature permission.
 * Otherwise renders `fallback` or nothing.
 */
export default function PermissionGate({ user, feature, fallback = null, children }) {
  const { can } = usePermission(user);
  if (!can(feature)) return fallback;
  return children;
}
