import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import config from '../config/index.js';


export default class JsonStore {
  constructor(collectionName) {
    this.filePath = path.join(config.paths.data, `${collectionName}.json`);
    this.records = null;
    this.loading = null;
    this.writeQueue = Promise.resolve();
  }

  async load() {
    if (this.records) return this.records;

    this.loading ??= readFile(this.filePath, 'utf8')
      .then((raw) => JSON.parse(raw))
      .catch((error) => {
        if (error.code === 'ENOENT') return [];
        throw error;
      });

    this.records = await this.loading;
    return this.records;
  }

  persist() {
    const snapshot = JSON.stringify(this.records, null, 2);
    const tempPath = `${this.filePath}.tmp`;

    this.writeQueue = this.writeQueue.then(async () => {
      await mkdir(path.dirname(this.filePath), { recursive: true });
      await writeFile(tempPath, snapshot, 'utf8');
      await rename(tempPath, this.filePath);
    });

    return this.writeQueue;
  }

  async find(predicate = () => true) {
    const records = await this.load();
    return structuredClone(records.filter(predicate));
  }

  async findOne(predicate) {
    const records = await this.load();
    const record = records.find(predicate);
    return record ? structuredClone(record) : null;
  }

  async findById(id) {
    return this.findOne((record) => record.id === id);
  }

  async count(predicate = () => true) {
    const records = await this.load();
    return records.filter(predicate).length;
  }

  async insert(data) {
    const [record] = await this.insertMany([data]);
    return record;
  }

  async insertMany(items) {
    const records = await this.load();
    const now = new Date().toISOString();

    const created = items.map((data) => ({
      id: randomUUID(),
      ...data,
      createdAt: now,
      updatedAt: now,
    }));

    records.push(...created);
    await this.persist();
    return structuredClone(created);
  }

  async updateById(id, changes) {
    const records = await this.load();
    const record = records.find((item) => item.id === id);
    if (!record) return null;

    Object.assign(record, changes, { updatedAt: new Date().toISOString() });
    await this.persist();
    return structuredClone(record);
  }

  async deleteById(id) {
    const records = await this.load();
    const index = records.findIndex((record) => record.id === id);
    if (index === -1) return false;

    records.splice(index, 1);
    await this.persist();
    return true;
  }

  async deleteMany(predicate) {
    const records = await this.load();
    const remaining = records.filter((record) => !predicate(record));
    const deletedCount = records.length - remaining.length;

    if (deletedCount > 0) {
      this.records = remaining;
      await this.persist();
    }
    return deletedCount;
  }

  async clear() {
    this.records = [];
    await this.persist();
  }
}
