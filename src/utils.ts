import { normalizeString } from "./utils/string-utils";
import { LookupData, PostalCodeUtilsConfig, RegionData } from "./types";
import FileCacheManager from "./utils/file-cache-manager";

class PostalCodeUtils {
	private readonly config: {
		directory: string;
		defaultCountry: string;
	};
	private readonly cacheManager: FileCacheManager;

	constructor(config: PostalCodeUtilsConfig = {}) {
		if (!config.defaultCountry) {
			throw new Error("A default country is required.");
		}

		this.config = {
			directory: config.directory || "src/data",
			defaultCountry: config.defaultCountry,
		};
		this.cacheManager = new FileCacheManager();
	}

	private async readDataFromFile(fileName: string): Promise<RegionData | LookupData | null> {
		try {
			const data = await this.cacheManager.getFileContents<RegionData | LookupData>(this.config.directory, fileName);
			return data;
		} catch (err) {
			console.error(`Error reading file ${fileName} in ${this.config.directory}:`, err);
			return null;
		}
	}

	public async getCountry(countryName?: string, type: "lookup" | "postal-codes" = "postal-codes"): Promise<RegionData | LookupData | null> {
		const targetCountry = countryName ?? this.config.defaultCountry;

		const fileName = `${normalizeString(targetCountry)}-${type === "postal-codes" ? "postal-codes" : "lookup"}.json`;
		return this.readDataFromFile(fileName);
	}

	private findRegion(regionName: string, regionObj: RegionData): RegionData | string[] | null {
		for (const [key, value] of Object.entries(regionObj)) {
			if (normalizeString(key) === normalizeString(regionName)) return value;
			if (typeof value === "object" && !Array.isArray(value)) {
				const found = this.findRegion(regionName, value);
				if (found) return found;
			}
		}
		return null;
	}

	public async getRegionByCountry(regionName: string, countryName?: string): Promise<RegionData | string[] | null> {
		const targetCountry = countryName ?? this.config.defaultCountry;

		const country = (await this.getCountry(targetCountry, "postal-codes")) as RegionData;
		if (regionName === targetCountry) return country;
		return country ? this.findRegion(regionName, country) : null;
	}

	public async getRegionsByPostalCode(postalCode: string, countryName?: string): Promise<string[] | null> {
		const targetCountry = countryName ?? this.config.defaultCountry;

		const country = (await this.getCountry(targetCountry, "lookup")) as LookupData;
		if (!country) return null;

		const regionId = country.postalCodeMap[postalCode];
		return regionId ? country.regions[regionId] : null;
	}

	public async getSubregionsOfRegion(regionName: string, countryName?: string): Promise<string[] | null> {
		const region = await this.getRegionByCountry(regionName, countryName);
		return region && typeof region === "object" ? Object.keys(region) : null;
	}

	public async getPostalCodesByRegion(regionName: string, countryName?: string): Promise<string[] | null> {
		const region = (await this.getRegionByCountry(regionName, countryName)) as RegionData;
		if (!region) return null;

		const collectCodes = (obj: any): string[] => {
			if (Array.isArray(obj)) return obj;
			return Object.values(obj).flatMap(collectCodes);
		};

		return collectCodes(region);
	}

	public async validatePostalCode(postalCode: string, countryName?: string): Promise<boolean> {
		const targetCountry = countryName ?? this.config.defaultCountry;

		const country = (await this.getCountry(targetCountry, "lookup")) as LookupData;
		return !!country?.postalCodeMap?.hasOwnProperty(postalCode);
	}

	private traverse(regionName: string, obj: RegionData, currentPath: string[]): string[] | null {
		for (const [key, value] of Object.entries(obj)) {
			const newPath = [...currentPath, key];
			if (normalizeString(key) === normalizeString(regionName)) {
				return newPath;
			}
			if (typeof value === "object" && !Array.isArray(value)) {
				const foundPath = this.traverse(regionName, value, newPath);
				if (foundPath) return foundPath;
			}
		}
		return null;
	}

	public async getRegionHierarchy(regionName: string, countryName?: string): Promise<string[] | null> {
		const targetCountry = countryName ?? this.config.defaultCountry;

		const country = (await this.getCountry(targetCountry, "postal-codes")) as RegionData;
		return country ? this.traverse(regionName, country, []) : null;
	}

	private collectRegionNames(substring: string, obj: any): string[] {
		const matches = Object.entries(obj).flatMap(([key, value]) => {
			const match = normalizeString(key).includes(normalizeString(substring)) ? [key] : [];
			const nestedMatches = typeof value === "object" && value !== null ? this.collectRegionNames(substring, value) : [];
			return [...match, ...nestedMatches];
		});

		return Array.from(new Set(matches));
	}

	public async searchRegions(substring: string, countryName?: string): Promise<string[] | null> {
		const targetCountry = countryName ?? this.config.defaultCountry;

		const country = (await this.getCountry(targetCountry, "postal-codes")) as RegionData | null;
		if (!country) return null;

		const matches: string[] = this.collectRegionNames(substring, country);
		return matches.length > 0 ? matches : null;
	}

	public async getAllPostalCodes(countryName?: string): Promise<string[] | null> {
		const targetCountry = countryName ?? this.config.defaultCountry;

		const country = (await this.getCountry(targetCountry, "lookup")) as LookupData;
		return country ? Object.keys(country.postalCodeMap) : null;
	}
}

export default PostalCodeUtils;
