export const INTERNAL_USER_ID_PARAM = 'uid';
export const INTERNAL_USER_EMAIL_PARAM = 'email';

interface ResolveInternalUserIdOptions {
  authenticatedUserId?: string | null;
  localTestUserId?: string;
  search?: string;
}

interface ResolveInternalUserIdResult {
  effectiveUserId?: string;
  impersonatedUserId?: string;
}

const isEmail = (value: string): boolean => /\S+@\S+\.\S+/.test(value);

export const getInternalUserIdFromSearch = (search?: string): string | undefined => {
  if (!search) {
    return undefined;
  }

  const params = new URLSearchParams(search);
  const value = params.get(INTERNAL_USER_ID_PARAM)?.trim();

  return value ? value : undefined;
};

export const getInternalUserEmailFromSearch = (search?: string): string | undefined => {
  if (!search) {
    return undefined;
  }

  const params = new URLSearchParams(search);
  const explicitEmail = params.get(INTERNAL_USER_EMAIL_PARAM)?.trim();

  if (explicitEmail) {
    return explicitEmail;
  }

  const uid = params.get(INTERNAL_USER_ID_PARAM)?.trim();

  if (uid && isEmail(uid)) {
    return uid;
  }

  return undefined;
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
