import Status from "./constants/statuses.js";
import { getSlugFromUsername } from "./utils.js";

export default class UserManager {
  limit = 10;
  db;

  constructor() {
    this.db = {};
  }

  hasId(id) {
    return !!this.db[id];
  }

  hasUsername(username) {
    const slug = getSlugFromUsername(username);
    return Object.values(this.db).some(item => item.slug === slug);
  }

  isExceeded() {
    return Object.keys(this.db).length >= this.limit;
  }

  add(id, payload) {
    return this.db[id] = {
      status: Status.PENDING,
      opponentId: null,
      ...payload,
      ...(
        payload.username
        ? { slug: getSlugFromUsername(payload.username) }
        : {}
      )
    };
  }

  update(id, payload) {
    return this.db[id] = {
      ...this.db[id],
      ...payload,
      ...(
        payload.username
        ? { slug: getSlugFromUsername(payload.username) }
        : {}
      )
    };
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