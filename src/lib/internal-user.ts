export const INTERNAL_USER_ID_PARAM = 'uid';

interface ResolveInternalUserIdOptions {
  authenticatedUserId?: string | null;
  localTestUserId?: string;
  search?: string;
}

interface ResolveInternalUserIdResult {
  effectiveUserId?: string;
  impersonatedUserId?: string;
}

export const getInternalUserIdFromSearch = (search?: string): string | undefined => {
  if (!search) {
    return undefined;
  }

  const params = new URLSearchParams(search);
  const value = params.get(INTERNAL_USER_ID_PARAM)?.trim();

  return value ? value : undefined;
};

export const resolveInternalUserId = ({
  authenticatedUserId,
  localTestUserId,
  search,
}: ResolveInternalUserIdOptions): ResolveInternalUserIdResult => {
  const urlUserId = getInternalUserIdFromSearch(search);
  const impersonatedUserId = urlUserId;
  const effectiveUserId = impersonatedUserId ?? localTestUserId ?? authenticatedUserId ?? undefined;

  return {
    effectiveUserId,
    impersonatedUserId,
  };
};
