var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
// scripts/validate-data.ts
import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
// Define the schema for gemeente data validation
var CoordinatesSchema = z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
});
var ParkingSpotSchema = z.object({
    location: z.string(),
    spots: z.number().positive(),
    coordinates: CoordinatesSchema
});
var NoParkingSchema = z.object({
    location: z.string(),
    days: z.array(z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])).optional(),
    times: z.string().optional()
});
var SourceSchema = z.object({
    type: z.enum(['official', 'regulation', 'news', 'community']),
    name: z.string().optional(),
    url: z.string().url(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});
var GeoJSONSchema = z.object({
    type: z.literal('Polygon'),
    coordinates: z.array(z.array(z.tuple([z.number(), z.number()])))
});
var GemeenteSchema = z.object({
    id: z.string().regex(/^[a-z-]+$/),
    name: z.string().startsWith('Gemeente '),
    province: z.enum([
        'Drenthe', 'Flevoland', 'Friesland', 'Gelderland', 'Groningen',
        'Limburg', 'Noord-Brabant', 'Noord-Holland', 'Overijssel',
        'Utrecht', 'Zeeland', 'Zuid-Holland'
    ]),
    coordinates: CoordinatesSchema,
    boundaries: GeoJSONSchema,
    parkingRules: z.object({
        free: z.boolean(),
        paid: z.object({
            enabled: z.boolean(),
            areas: z.array(z.string()),
            rates: z.object({
                hourly: z.number(),
                daily: z.number().optional(),
                currency: z.literal('EUR')
            }).nullable()
        }),
        permits: z.object({
            required: z.boolean(),
            types: z.array(z.string())
        }),
        restrictions: z.object({
            timeLimit: z.number().nullable(),
            noParking: z.array(NoParkingSchema)
        }),
        motorcycleSpecific: z.object({
            dedicatedSpots: z.array(ParkingSpotSchema),
            allowedOnSidewalk: z.boolean(),
            freeInPaidZones: z.boolean(),
            notes: z.string()
        })
    }),
    contact: z.object({
        website: z.string().url(),
        email: z.string().email(),
        phone: z.string()
    }).optional(),
    lastUpdated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    sources: z.array(SourceSchema).min(1)
});
// --- City validation schemas ---
var CitySchema = z.object({
    id: z.string().regex(/^[a-z-]+$/),
    parent: z.string().regex(/^[a-z-]+$/),
    name: z.string().min(1),
    province: z.enum([
        'Drenthe', 'Flevoland', 'Friesland', 'Gelderland', 'Groningen',
        'Limburg', 'Noord-Brabant', 'Noord-Holland', 'Overijssel',
        'Utrecht', 'Zeeland', 'Zuid-Holland'
    ]),
    coordinates: z.object({
        lat: z.number().min(50.7).max(53.6),
        lng: z.number().min(3.3).max(7.3)
    }),
    parkingRules: z.object({
        free: z.boolean(),
        paid: z.object({
            enabled: z.boolean(),
            areas: z.array(z.string()),
            rates: z.object({
                hourly: z.number(),
                daily: z.number().optional(),
                currency: z.literal('EUR')
            }).nullable()
        }),
        permits: z.object({
            required: z.boolean(),
            types: z.array(z.string())
        }),
        restrictions: z.object({
            timeLimit: z.number().nullable(),
            noParking: z.array(z.object({
                location: z.string(),
                days: z.array(z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])).optional(),
                times: z.string().optional()
            }))
        }),
        motorcycleSpecific: z.object({
            dedicatedSpots: z.array(z.object({
                location: z.string(),
                spots: z.number().positive(),
                coordinates: z.object({
                    lat: z.number().min(50.7).max(53.6),
                    lng: z.number().min(3.3).max(7.3)
                })
            })),
            allowedOnSidewalk: z.boolean(),
            freeInPaidZones: z.boolean(),
            notes: z.string()
        })
    }),
    area: z.object({
        type: z.literal('FeatureCollection'),
        features: z.array(z.object({
            type: z.literal('Feature'),
            geometry: z.object({
                type: z.enum(['Polygon', 'MultiPolygon']),
                coordinates: z.any() // Simplified for Phase 1
            }),
            properties: z.object({}).optional()
        }))
    }),
    lastUpdated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    sources: z.array(z.object({
        type: z.enum(['official', 'regulation', 'news', 'community']),
        name: z.string().optional(),
        url: z.string().url(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
    })),
    population: z.number().optional(),
    postalCodes: z.array(z.string()).optional(),
    alternativeNames: z.array(z.string()).optional(),
    overrideReason: z.string().optional(),
    effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});
var CityIndexSchema = z.object({
    version: z.string(),
    lastUpdated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    totalCities: z.number().nonnegative(),
    cities: z.array(z.object({
        id: z.string().regex(/^[a-z-]+$/),
        name: z.string(),
        parent: z.string().regex(/^[a-z-]+$/),
        province: z.string(),
        coordinates: z.object({
            lat: z.number().min(50.7).max(53.6),
            lng: z.number().min(3.3).max(7.3)
        }),
        reference: z.string().startsWith('city/'),
        postalCodes: z.array(z.string()).optional(),
        alternativeNames: z.array(z.string()).optional()
    }))
});
// Color codes for console output
var colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};
function validateGemeenteFile(filePath) {
    return __awaiter(this, void 0, void 0, function () {
        var errors, content, data, result, lastUpdated, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    errors = [];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, fs.readFile(filePath, 'utf-8')];
                case 2:
                    content = _a.sent();
                    data = JSON.parse(content);
                    result = GemeenteSchema.safeParse(data);
                    if (!result.success) {
                        result.error.errors.forEach(function (error) {
                            errors.push("  ".concat(error.path.join('.'), ": ").concat(error.message));
                        });
                    }
                    // Additional business logic validations
                    if (result.success) {
                        // Check if paid parking has rates when enabled
                        if (data.parkingRules.paid.enabled && !data.parkingRules.paid.rates) {
                            errors.push('  Paid parking is enabled but no rates are specified');
                        }
                        // Check if coordinates are within Netherlands bounds
                        if (data.coordinates.lat < 50.7 || data.coordinates.lat > 53.6 ||
                            data.coordinates.lng < 3.3 || data.coordinates.lng > 7.3) {
                            errors.push('  Coordinates appear to be outside the Netherlands');
                        }
                        lastUpdated = new Date(data.lastUpdated);
                        if (lastUpdated > new Date()) {
                            errors.push('  lastUpdated date is in the future');
                        }
                    }
                    return [2 /*return*/, { valid: errors.length === 0, errors: errors }];
                case 3:
                    error_1 = _a.sent();
                    if (error_1 instanceof SyntaxError) {
                        errors.push('  Invalid JSON syntax');
                    }
                    else {
                        errors.push("  Error reading file: ".concat(error_1));
                    }
                    return [2 /*return*/, { valid: false, errors: errors }];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// --- City data validation function ---
function validateCityData() {
    return __awaiter(this, void 0, void 0, function () {
        var cityDir, indexPath, indexContent, indexData, indexResult, _i, _a, cityRef, cityPath, cityContent, cityData, cityResult, error_2, error_3;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log('🏙️ Validating city data...');
                    cityDir = path.join(process.cwd(), 'data', 'city');
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 14, , 15]);
                    indexPath = path.join(cityDir, 'index.json');
                    return [4 /*yield*/, fs.access(indexPath).then(function () { return true; }).catch(function () { return false; })];
                case 2:
                    if (!_b.sent()) return [3 /*break*/, 12];
                    return [4 /*yield*/, fs.readFile(indexPath, 'utf8')];
                case 3:
                    indexContent = _b.sent();
                    indexData = JSON.parse(indexContent);
                    indexResult = CityIndexSchema.safeParse(indexData);
                    if (!indexResult.success) return [3 /*break*/, 10];
                    console.log('✅ city/index.json');
                    _i = 0, _a = indexData.cities;
                    _b.label = 4;
                case 4:
                    if (!(_i < _a.length)) return [3 /*break*/, 9];
                    cityRef = _a[_i];
                    cityPath = path.join(process.cwd(), 'data', cityRef.reference);
                    _b.label = 5;
                case 5:
                    _b.trys.push([5, 7, , 8]);
                    return [4 /*yield*/, fs.readFile(cityPath, 'utf8')];
                case 6:
                    cityContent = _b.sent();
                    cityData = JSON.parse(cityContent);
                    cityResult = CitySchema.safeParse(cityData);
                    if (cityResult.success) {
                        console.log("\u2705 ".concat(cityRef.reference));
                    }
                    else {
                        console.log("\u274C ".concat(cityRef.reference));
                        cityResult.error.errors.forEach(function (error) {
                            console.log("   ".concat(error.path.join('.'), ": ").concat(error.message));
                        });
                    }
                    return [3 /*break*/, 8];
                case 7:
                    error_2 = _b.sent();
                    console.log("\u274C ".concat(cityRef.reference, " - File not found or invalid JSON"));
                    return [3 /*break*/, 8];
                case 8:
                    _i++;
                    return [3 /*break*/, 4];
                case 9: return [3 /*break*/, 11];
                case 10:
                    console.log('❌ city/index.json');
                    indexResult.error.errors.forEach(function (error) {
                        console.log("   ".concat(error.path.join('.'), ": ").concat(error.message));
                    });
                    _b.label = 11;
                case 11: return [3 /*break*/, 13];
                case 12:
                    console.log('ℹ️ No city data found (city/index.json missing)');
                    _b.label = 13;
                case 13: return [3 /*break*/, 15];
                case 14:
                    error_3 = _b.sent();
                    console.log('❌ Failed to validate city data:', error_3);
                    return [3 /*break*/, 15];
                case 15: return [2 /*return*/];
            }
        });
    });
}
function validateAllData() {
    return __awaiter(this, void 0, void 0, function () {
        var dataDir, files, jsonFiles, totalValid, totalInvalid, invalidFiles, _i, jsonFiles_1, file, filePath, _a, valid, errors, error_4;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log("".concat(colors.bright).concat(colors.blue, "\uD83D\uDD0D Validating gemeente data files...").concat(colors.reset, "\n"));
                    dataDir = path.join(process.cwd(), 'data', 'gemeentes');
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 8, , 9]);
                    // Create directory if it doesn't exist
                    return [4 /*yield*/, fs.mkdir(dataDir, { recursive: true })];
                case 2:
                    // Create directory if it doesn't exist
                    _b.sent();
                    return [4 /*yield*/, fs.readdir(dataDir)];
                case 3:
                    files = _b.sent();
                    jsonFiles = files.filter(function (file) { return file.endsWith('.json'); });
                    if (jsonFiles.length === 0) {
                        console.log("".concat(colors.yellow, "\u26A0\uFE0F  No JSON files found in ").concat(dataDir).concat(colors.reset));
                        console.log("".concat(colors.yellow, "   Create gemeente data files to validate").concat(colors.reset));
                        return [2 /*return*/];
                    }
                    totalValid = 0;
                    totalInvalid = 0;
                    invalidFiles = [];
                    _i = 0, jsonFiles_1 = jsonFiles;
                    _b.label = 4;
                case 4:
                    if (!(_i < jsonFiles_1.length)) return [3 /*break*/, 7];
                    file = jsonFiles_1[_i];
                    filePath = path.join(dataDir, file);
                    return [4 /*yield*/, validateGemeenteFile(filePath)];
                case 5:
                    _a = _b.sent(), valid = _a.valid, errors = _a.errors;
                    if (valid) {
                        console.log("".concat(colors.green, "\u2713 ").concat(file).concat(colors.reset));
                        totalValid++;
                    }
                    else {
                        console.log("".concat(colors.red, "\u2717 ").concat(file).concat(colors.reset));
                        errors.forEach(function (error) { return console.log("".concat(colors.red).concat(error).concat(colors.reset)); });
                        totalInvalid++;
                        invalidFiles.push(file);
                    }
                    _b.label = 6;
                case 6:
                    _i++;
                    return [3 /*break*/, 4];
                case 7:
                    // Summary
                    console.log("\n".concat(colors.bright, "Summary:").concat(colors.reset));
                    console.log("Total files: ".concat(jsonFiles.length));
                    console.log("".concat(colors.green, "Valid: ").concat(totalValid).concat(colors.reset));
                    console.log("".concat(colors.red, "Invalid: ").concat(totalInvalid).concat(colors.reset));
                    if (invalidFiles.length > 0) {
                        console.log("\n".concat(colors.red, "Invalid files:").concat(colors.reset));
                        invalidFiles.forEach(function (file) { return console.log("  - ".concat(file)); });
                        process.exit(1);
                    }
                    else {
                        console.log("\n".concat(colors.green).concat(colors.bright, "\u2728 All files are valid!").concat(colors.reset));
                    }
                    return [3 /*break*/, 9];
                case 8:
                    error_4 = _b.sent();
                    console.error("".concat(colors.red, "Error validating data: ").concat(error_4).concat(colors.reset));
                    process.exit(1);
                    return [3 /*break*/, 9];
                case 9: return [2 /*return*/];
            }
        });
    });
}
// Run validation
validateAllData().catch(console.error);
// Add this call to your main validateAllData function
export { validateCityData };
