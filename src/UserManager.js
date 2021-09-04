export default class UserManager {
  limit = 2;
  db;

  constructor() {
    this.db = {};
  }

  hasId(id) {
    return !!this.db[id];
  }

  hasSlug(slug) {
    return Object.values(this.db).some(item => item.slug === slug);
  }

  isExceeded() {
    return Object.keys(this.db).length >= this.limit;
  }

  add(id, payload) {
    this.db[id] = payload;
  }

  update(id, payload) {
    this.db[id] = { ...this.db[id], ...payload };
  }

  delete(id) {
    delete this.db[id];
  }

  getUser(id) {
    return this.db[id];
  }

  getArray() {
    return Array.from(Object.values(this.db));
  }
}