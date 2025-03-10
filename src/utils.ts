import { normalizeString } from "./utils/string-utils";
import { LookupData, RegionData } from "./types";
import FileCacheManager from "./utils/file-cache-manager";

const cacheMananger = new FileCacheManager();

const readDataFromFile = async (fileName: string, directory: string = "src/data"): Promise<RegionData | LookupData | null> => {
	try {
		const data = await cacheMananger.getFileContents<RegionData | LookupData>(directory, fileName);

		return data;
	} catch (err) {
		console.error(`Error reading file ${fileName} in ${directory}:`, err);
		return null;
	}
};

export const getCountry = async (country: string, type: "lookup" | "postal-codes" = "postal-codes"): Promise<RegionData | LookupData | null> => {
	const fileName = `${normalizeString(country)}-${type === "postal-codes" ? "postal-codes" : "lookup"}.json`;

	return await readDataFromFile(fileName);
};

const findRegion = (regionName: string, regionObj: RegionData): RegionData | string[] | null => {
	for (const [key, value] of Object.entries(regionObj)) {
		if (normalizeString(key) === normalizeString(regionName)) return value;
		if (typeof value === "object" && !Array.isArray(value)) {
			const found = findRegion(regionName, value);
			if (found) return found;
		}
	}

	return null;
};

export const getRegionByCountry = async (regionName: string, countryName: string): Promise<RegionData | string[] | null> => {
	const country = (await getCountry(countryName, "postal-codes")) as RegionData;

	if (regionName === countryName) return country;

	return country ? findRegion(regionName, country) : null;
};

export const getRegionsByPostalCode = async (postalCode: string, countryName: string): Promise<string[] | null> => {
	const country = (await getCountry(countryName, "lookup")) as LookupData;
	if (!country) return null;

	const regionId = country.postalCodeMap[postalCode];
	return regionId ? country.regions[regionId] : null;
};

export const getSubregionsOfRegion = async (regionName: string, countryName: string): Promise<string[] | null> => {
	const region = await getRegionByCountry(regionName, countryName);

	return region && typeof region === "object" ? Object.keys(region) : null;
};

export const getPostalCodesByRegion = async (regionName: string, countryName: string): Promise<string[] | null> => {
	const region = (await getRegionByCountry(regionName, countryName)) as RegionData;
	if (!region) return null;

	const collectCodes = (obj: any): string[] => {
		if (Array.isArray(obj)) return obj;
		return Object.values(obj).flatMap(collectCodes);
	};

	return collectCodes(region);
};

export const validatePostalCode = async (postalCode: string, countryName: string): Promise<boolean> => {
	const country = (await getCountry(countryName, "lookup")) as LookupData;
	return !!country?.postalCodeMap?.hasOwnProperty(postalCode);
};

const traverse = (regionName: string, obj: RegionData, currentPath: string[]): string[] | null => {
	for (const [key, value] of Object.entries(obj)) {
		const newPath = [...currentPath, key];
		if (normalizeString(key) === normalizeString(regionName)) {
			return newPath;
		}
		if (typeof value === "object" && !Array.isArray(value)) {
			const foundPath = traverse(regionName, value, newPath);
			if (foundPath) {
				return foundPath;
			}
		}
	}
	return null;
};

export const getRegionHierarchy = async (regionName: string, countryName: string): Promise<string[] | null> => {
	const country = (await getCountry(countryName, "postal-codes")) as RegionData;
	return country ? traverse(regionName, country, []) : null;
};

const collectRegionNames = (substring: string, obj: any): string[] => {
	const matches = Object.entries(obj).flatMap(([key, value]) => {
		const match = normalizeString(key).includes(normalizeString(substring)) ? [key] : [];
		const nestedMatches = typeof value === "object" && value !== null ? collectRegionNames(substring, value) : [];
		return [...match, ...nestedMatches];
	});

	return Array.from(new Set(matches));
};

export const searchRegions = async (substring: string, countryName: string): Promise<string[] | null> => {
	const country = (await getCountry(countryName, "postal-codes")) as RegionData | null;
	if (!country) return null;

	const matches: string[] = collectRegionNames(substring, country);

	return matches.length > 0 ? matches : null;
};

export const getAllPostalCodes = async (countryName: string): Promise<string[] | null> => {
	const country = (await getCountry(countryName, "lookup")) as LookupData;
	return country ? Object.keys(country.postalCodeMap) : null;
};
