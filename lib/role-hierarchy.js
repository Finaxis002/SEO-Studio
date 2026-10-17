export const ROLE_HIERARCHY = {
  "Super Admin": 100,
  Admin: 80,
  "SEO Manager": 50,
  Editor: 30,
  "SEO Executive": 30,
  "Content Writer": 30,
  Viewer: 10,
};

export function getRoleWeight(role) {
  if (!role) return 0;
  if (typeof role === "string") return ROLE_HIERARCHY[role] || 0;
  if (role.isCustom) return 0;
  return ROLE_HIERARCHY[role.name] || 0;
}
