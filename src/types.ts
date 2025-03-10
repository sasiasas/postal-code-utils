export type Region = {
	path: string;
	name: string;
	prettyName: string;
};

export type ProcessingQueueItem = {
	region: Region;
	regionObj: RegionData;
};

export interface LookupData {
	postalCodeMap: {
		[postalCode: string]: string;
	};
	regions: {
		[code: string]: string[];
	};
}

export interface PostalCodeData {
	rawData: RegionData;
	postalCodeLookup: LookupData;
}

export interface RegionData {
	[key: string]: RegionData | string[];
}

export interface FileCacheEntry<T> {
	mtime: Date;
	data: T;
	size: number;
}
