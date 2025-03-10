export type Region = {
	path: string;
	name: string;
	prettyName: string;
};

export type ProcessingQueueItem = {
	region: Region;
	regionObj: RegionData;
};

export type LookupData = {
	postalCodeMap: {
		[postalCode: string]: string;
	};
	regions: {
		[code: string]: string[];
	};
};

export type PostalCodeData = {
	rawData: RegionData;
	postalCodeLookup: LookupData;
};

export type RegionData = {
	[key: string]: RegionData | string[];
};

export type FileCacheEntry<T> = {
	mtime: Date;
	data: T;
	size: number;
};

export type PostalCodeUtilsConfig = {
	directory?: string;
	defaultCountry?: string;
};
