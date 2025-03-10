import fs from "fs/promises";
import path from "path";
import { readFileSync } from "fs";
import { FileCacheEntry } from "../types";

class FileCacheManager {
	private cache = new Map<string, FileCacheEntry<any>>();
	private MAX_CACHE_SIZE = 1024 * 1024 * 100; // 100MB
	private currentCacheSize = 0;

	async getFileContents<T>(directory: string, fileName: string): Promise<T> {
		const filePath = path.join(directory, fileName);
		const normalizedPath = path.normalize(filePath);

		try {
			const stats = await fs.stat(normalizedPath);
			const cachedEntry = this.cache.get(normalizedPath);

			if (cachedEntry && stats.mtime <= cachedEntry.mtime) {
				return cachedEntry.data;
			}

			const data = JSON.parse(readFileSync(filePath, "utf8"));
			const newEntry: FileCacheEntry<T> = {
				mtime: stats.mtime,
				data,
				size: Buffer.byteLength(JSON.stringify(data)),
			};

			this.updateCacheSize(normalizedPath, newEntry);

			return data;
		} catch (error) {
			console.error(`Error accessing file: ${normalizedPath}`, error);
			throw error;
		}
	}

	private updateCacheSize(filePath: string, entry: FileCacheEntry<any>) {
		const existingEntry = this.cache.get(filePath);

		if (existingEntry) {
			this.currentCacheSize -= existingEntry.size;
		}

		this.currentCacheSize += entry.size;
		this.cache.set(filePath, entry);

		while (this.currentCacheSize > this.MAX_CACHE_SIZE) {
			const oldestKey = this.cache.keys().next().value!;
			const oldestEntry = this.cache.get(oldestKey);

			if (oldestEntry) {
				this.currentCacheSize -= oldestEntry.size;
				this.cache.delete(oldestKey);
			}
		}
	}

	invalidateEntry(filePath: string) {
		const normalizedPath = path.normalize(filePath);
		this.cache.delete(normalizedPath);
	}

	clearCache() {
		this.cache.clear();
		this.currentCacheSize = 0;
	}
}

export default FileCacheManager;
