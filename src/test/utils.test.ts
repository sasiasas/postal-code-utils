import PostalCodeUtils from "..";
import FileCacheManager from "../utils/file-cache-manager";

jest.mock("../utils/file-cache-manager");

const mockGetFileContents = jest.fn();
(FileCacheManager as jest.Mock).mockImplementation(() => ({
	getFileContents: mockGetFileContents,
}));

describe("PostalCodeUtils", () => {
	const defaultConfig = { defaultCountry: "romania" };

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("constructor", () => {
		it("should throw an error if defaultCountry is not provided", () => {
			expect(() => new PostalCodeUtils()).toThrow("A default country is required.");
		});
	});

	describe("getCountry", () => {
		it("should retrieve country data with default parameters", async () => {
			const mockData = {
				regions: {
					cluj: {
						baciu: ["407055"],
					},
				},
			};
			mockGetFileContents.mockResolvedValue(mockData);
			const utils = new PostalCodeUtils(defaultConfig);
			const result = await utils.getCountry();
			expect(mockGetFileContents).toHaveBeenCalledWith("src/data", "romania-postal-codes.json");
			expect(result).toEqual(mockData);
		});

		it("should handle file read errors gracefully", async () => {
			mockGetFileContents.mockRejectedValue(new Error("Error reading file"));
			const utils = new PostalCodeUtils(defaultConfig);
			const result = await utils.getCountry("dummy");
			expect(result).toBeNull();
		});
	});

	describe("getRegionByCountry", () => {
		it("should find a region", async () => {
			const mockData = {
				alabama: {
					autauga: {
						autaugaville: ["36003"],
						billingsley: ["36006"],
						booth: ["36008"],
						jones: ["36749"],
						marbury: ["36051"],
						prattville: ["36066", "36067", "36068"],
					},
				},
			};
			mockGetFileContents.mockResolvedValue(mockData);
			const utils = new PostalCodeUtils(defaultConfig);
			const result = await utils.getRegionByCountry("autauga");
			expect(result).toEqual(mockData.alabama.autauga);
		});

		it("should return null for non-existent regions", async () => {
			const mockData = {
				alabama: {
					autauga: {
						autaugaville: ["36003"],
						billingsley: ["36006"],
						booth: ["36008"],
						jones: ["36749"],
						marbury: ["36051"],
						prattville: ["36066", "36067", "36068"],
					},
				},
			};
			mockGetFileContents.mockResolvedValue(mockData);
			const utils = new PostalCodeUtils(defaultConfig);
			const result = await utils.getRegionByCountry("Nevada");
			expect(result).toBeNull();
		});
	});

	describe("getRegionsByPostalCode", () => {
		it("should return regions for a valid postal code", async () => {
			const mockData = {
				postalCodeMap: { "90001": "los-angeles_1" },
				regions: { "los-angeles_1": ["California", "Los Angeles"] },
			};
			mockGetFileContents.mockResolvedValue(mockData);
			const utils = new PostalCodeUtils(defaultConfig);
			const result = await utils.getRegionsByPostalCode("90001");
			expect(result).toEqual(["California", "Los Angeles"]);
		});

		it("should return null for invalid postal codes", async () => {
			const mockData = {
				postalCodeMap: { "90001": "los-angeles_1" },
				regions: { "los-angeles_1": ["California", "Los Angeles"] },
			};
			mockGetFileContents.mockResolvedValue(mockData);
			const utils = new PostalCodeUtils(defaultConfig);
			const result = await utils.getRegionsByPostalCode("90000");
			expect(result).toBeNull();
		});
	});

	describe("getSubregionsOfRegion", () => {
		it("should return subregions for a parent region", async () => {
			const mockRegion = {
				agder: {
					amli: {
						amli: ["4864", "4865"],
						dolemo: ["4869"],
						nelaug: ["4863"],
						selasvatn: ["4868"],
					},
				},
			};
			const utils = new PostalCodeUtils({ defaultCountry: "norway" });
			jest.spyOn(utils, "getCountry").mockResolvedValue(mockRegion);
			const result = await utils.getSubregionsOfRegion("amli");
			expect(result).toEqual(["amli", "dolemo", "nelaug", "selasvatn"]);
		});
	});

	describe("getPostalCodesByRegion", () => {
		it("should collect all postal codes recursively", async () => {
			const mockRegion = {
				"Los Angeles": ["90001"],
				"San Francisco": { Downtown: ["94101"], Outer: ["94102"] },
			};
			const utils = new PostalCodeUtils(defaultConfig);
			jest.spyOn(utils, "getCountry").mockResolvedValue(mockRegion);
			const result = await utils.getPostalCodesByRegion("san-francisco");
			expect(result).toEqual(["94101", "94102"]);
		});
	});

	describe("validatePostalCode", () => {
		it("should return true for valid postal codes", async () => {
			const mockData = {
				postalCodeMap: {
					"10001": "new-york-city_1",
					"10002": "new-york-city_1",
					"10003": "new-york-city_1",
					"10004": "new-york-city_1",
					"10005": "new-york-city_1",
					"10006": "new-york-city_1",
					"10007": "new-york-city_1",
					"10008": "new-york-city_1",
					"10009": "new-york-city_1",
					"10010": "new-york-city_1",
				},
				regions: {
					"new-york-city_1": ["new-york", "new-york-city", "new-york-city"],
					appleton_2: ["new-york", "niagara", "appleton"],
					barker_1: ["new-york", "niagara", "barker"],
					burt_3: ["new-york", "niagara", "burt"],
					gasport_1: ["new-york", "niagara", "gasport"],
				},
			};
			mockGetFileContents.mockResolvedValue(mockData);
			const utils = new PostalCodeUtils(defaultConfig);
			const result = await utils.validatePostalCode("10005");
			expect(result).toBe(true);
		});

		it("should return false for invalid postal codes", async () => {
			mockGetFileContents.mockResolvedValue({
				postalCodeMap: {
					"10001": "new-york-city_1",
					"10002": "new-york-city_1",
					"10003": "new-york-city_1",
					"10004": "new-york-city_1",
					"10005": "new-york-city_1",
					"10006": "new-york-city_1",
					"10007": "new-york-city_1",
					"10008": "new-york-city_1",
					"10009": "new-york-city_1",
					"10010": "new-york-city_1",
				},
				regions: {
					"new-york-city_1": ["new-york", "new-york-city", "new-york-city"],
					appleton_2: ["new-york", "niagara", "appleton"],
					barker_1: ["new-york", "niagara", "barker"],
					burt_3: ["new-york", "niagara", "burt"],
					gasport_1: ["new-york", "niagara", "gasport"],
				},
			});
			const utils = new PostalCodeUtils(defaultConfig);
			const result = await utils.validatePostalCode("10000");
			expect(result).toBe(false);
		});
	});

	describe("getRegionHierarchy", () => {
		it("should return the full hierarchy path", async () => {
			const mockData = {
				"south-dakota": {
					tennessee: {
						anderson: {
							andersonville: ["37705"],
							briceville: ["37710"],
							clinton: ["37716", "37717"],
							"lake-city": ["37769"],
							norris: ["37828"],
							"oak-ridge": ["37830", "37831"],
						},
					},
				},
			};
			mockGetFileContents.mockResolvedValue(mockData);
			const utils = new PostalCodeUtils(defaultConfig);
			const result = await utils.getRegionHierarchy("lake-city");
			expect(result).toEqual(["south-dakota", "tennessee", "anderson", "lake-city"]);
		});
	});

	describe("searchRegions", () => {
		it("should find regions by substring case-insensitively", async () => {
			const mockData = {
				"south-dakota": {
					tennessee: {
						anderson: {
							andersonville: ["37705"],
							briceville: ["37710"],
							clinton: ["37716", "37717"],
							"lake-city": ["37769"],
							norris: ["37828"],
							"oak-ridge": ["37830", "37831"],
						},
					},
				},
			};
			mockGetFileContents.mockResolvedValue(mockData);
			const utils = new PostalCodeUtils(defaultConfig);
			const result = await utils.searchRegions("ri");
			expect(result).toEqual(["briceville", "norris", "oak-ridge"]);
		});
	});

	describe("getAllPostalCodes", () => {
		it("should return all postal codes from lookup data", async () => {
			const mockData = {
				postalCodeMap: {
					"10001": "new-york-city_1",
					"10002": "new-york-city_1",
					"10003": "new-york-city_1",
					"10004": "new-york-city_1",
				},
				regions: {
					"new-york-city_1": ["new-york", "new-york-city", "new-york-city"],
					appleton_2: ["new-york", "niagara", "appleton"],
					barker_1: ["new-york", "niagara", "barker"],
					burt_3: ["new-york", "niagara", "burt"],
				},
			};
			mockGetFileContents.mockResolvedValue(mockData);
			const utils = new PostalCodeUtils(defaultConfig);
			const result = await utils.getAllPostalCodes();
			expect(result).toEqual(["10001", "10002", "10003", "10004"]);
		});
	});
});
