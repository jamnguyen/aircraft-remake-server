export const getSlugFromUsername = (username) => {
  return (username || '').toLowerCase().replace(' ', '_');
};
