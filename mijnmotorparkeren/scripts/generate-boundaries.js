var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
// scripts/generate-boundaries.ts
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
// Colors for console output
var colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};
var BOUNDARY_SOURCES = [
    {
        name: 'cartomap-github',
        url: 'https://cartomap.github.io/nl/wgs84/gemeente_2025.geojson',
        description: 'CartoMap (Simplified, good for web use)'
    },
    {
        name: 'cbs-pdok',
        url: 'https://geodata.nationaalgeoregister.nl/cbsgebiedsindelingen/wfs?request=GetFeature&service=WFS&version=2.0.0&typeName=cbs_gemeente_2023_gegeneraliseerd&outputFormat=json',
        description: 'CBS/PDOK Official (High detail)'
    }
];
/**
 * Fetches gemeente boundaries from official sources
 */
function fetchBoundaries() {
    return __awaiter(this, arguments, void 0, function (sourceIndex) {
        var source, response, data, error_1;
        var _a;
        if (sourceIndex === void 0) { sourceIndex = 0; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    source = BOUNDARY_SOURCES[sourceIndex];
                    console.log("".concat(colors.blue, "\uD83D\uDCE1 Fetching boundaries from: ").concat(source.description).concat(colors.reset));
                    console.log("   URL: ".concat(source.url));
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, fetch(source.url)];
                case 2:
                    response = _b.sent();
                    if (!response.ok) {
                        throw new Error("HTTP ".concat(response.status, ": ").concat(response.statusText));
                    }
                    return [4 /*yield*/, response.json()];
                case 3:
                    data = _b.sent();
                    if (!data.type || data.type !== 'FeatureCollection') {
                        throw new Error('Invalid GeoJSON FeatureCollection');
                    }
                    console.log("".concat(colors.green, "\u2713 Successfully loaded ").concat(((_a = data.features) === null || _a === void 0 ? void 0 : _a.length) || 0, " gemeente boundaries").concat(colors.reset));
                    return [2 /*return*/, data];
                case 4:
                    error_1 = _b.sent();
                    console.log("".concat(colors.red, "\u2717 Failed to fetch from ").concat(source.name, ": ").concat(error_1).concat(colors.reset));
                    // Try fallback source
                    if (sourceIndex < BOUNDARY_SOURCES.length - 1) {
                        console.log("".concat(colors.yellow, "\u26A0 Trying fallback source...").concat(colors.reset));
                        return [2 /*return*/, fetchBoundaries(sourceIndex + 1)];
                    }
                    throw error_1;
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * Matches gemeente names with boundary features
 */
function findMatchingBoundary(gemeente, boundaries) {
    var features = boundaries.features || [];
    for (var _i = 0, features_1 = features; _i < features_1.length; _i++) {
        var feature = features_1[_i];
        var props = feature.properties || {};
        // Try different property names used by different sources
        var boundaryName = props.GM_NAAM || props.gemeentenaam || props.name || '';
        var boundaryCode = props.GM_CODE || props.gemeentecode || props.code || '';
        // Match by municipality name (normalize for comparison)
        var normalizedBoundaryName = boundaryName.toLowerCase()
            .replace(/gemeente\s+/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
        var normalizedGemeenteName = gemeente.name.toLowerCase()
            .replace(/gemeente\s+/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
        // Direct name match
        if (normalizedBoundaryName === normalizedGemeenteName) {
            return feature;
        }
        // Match by code if available
        if (boundaryCode && gemeente.id === boundaryCode.toLowerCase()) {
            return feature;
        }
        // Partial name match for complex names
        if (normalizedBoundaryName.includes(normalizedGemeenteName) ||
            normalizedGemeenteName.includes(normalizedBoundaryName)) {
            return feature;
        }
    }
    return null;
}
/**
 * Gets accurate boundary for Zeewolde specifically
 */
function getZeewoldeBoundary() {
    return __awaiter(this, void 0, void 0, function () {
        var nominatimUrl, response, data, feature, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("".concat(colors.cyan, "\uD83C\uDFAF Getting precise boundary for Zeewolde...").concat(colors.reset));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    nominatimUrl = 'https://nominatim.openstreetmap.org/search?' +
                        'q=Zeewolde+gemeente+Netherlands&' +
                        'format=geojson&' +
                        'polygon_geojson=1&' +
                        'addressdetails=1&' +
                        'limit=1';
                    return [4 /*yield*/, fetch(nominatimUrl)];
                case 2:
                    response = _a.sent();
                    if (!response.ok) {
                        throw new Error("Nominatim API error: ".concat(response.status));
                    }
                    return [4 /*yield*/, response.json()];
                case 3:
                    data = _a.sent();
                    if (data.features && data.features.length > 0) {
                        feature = data.features[0];
                        console.log("".concat(colors.green, "\u2713 Found precise Zeewolde boundary via Nominatim").concat(colors.reset));
                        return [2 /*return*/, feature.geometry];
                    }
                    throw new Error('No boundary found in Nominatim response');
                case 4:
                    error_2 = _a.sent();
                    console.log("".concat(colors.yellow, "\u26A0 Nominatim failed: ").concat(error_2).concat(colors.reset));
                    // Fallback to more accurate manual boundary for Zeewolde
                    console.log("".concat(colors.yellow, "\uD83D\uDCCD Using improved manual boundary for Zeewolde").concat(colors.reset));
                    return [2 /*return*/, {
                            type: 'Polygon',
                            coordinates: [[
                                    [5.4792, 52.2891], // Southwest corner
                                    [5.6092, 52.2891], // Southeast corner
                                    [5.6092, 52.3791], // Northeast corner
                                    [5.4792, 52.3791], // Northwest corner
                                    [5.4792, 52.2891] // Close the polygon
                                ]]
                        }];
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * Updates gemeente data files with real boundaries
 */
function updateGemeenteFile(gemeente, newBoundary) {
    return __awaiter(this, void 0, void 0, function () {
        var filePath, updatedGemeente, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    filePath = path.join(__dirname, '..', 'data', 'gemeentes', "".concat(gemeente.id, ".json"));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    updatedGemeente = __assign(__assign({}, gemeente), { boundaries: newBoundary, lastUpdated: new Date().toISOString().split('T')[0] // Update timestamp
                     });
                    return [4 /*yield*/, fs.writeFile(filePath, JSON.stringify(updatedGemeente, null, 2))];
                case 2:
                    _a.sent();
                    console.log("".concat(colors.green, "\u2713 Updated ").concat(gemeente.name, " boundary data").concat(colors.reset));
                    return [3 /*break*/, 4];
                case 3:
                    error_3 = _a.sent();
                    console.log("".concat(colors.red, "\u2717 Failed to update ").concat(gemeente.name, ": ").concat(error_3).concat(colors.reset));
                    throw error_3;
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Main function to generate all boundaries
 */
function generateBoundaries() {
    return __awaiter(this, void 0, void 0, function () {
        var dataDir, files, jsonFiles, gemeentes, _i, jsonFiles_1, file, filePath, content, gemeente, boundariesData, updatedCount, skippedCount, _a, gemeentes_1, gemeente, newBoundary, matchingFeature, error_4, error_5;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log("".concat(colors.bright).concat(colors.blue, "\uD83D\uDDFA\uFE0F  Gemeente Boundary Generator").concat(colors.reset));
                    console.log("".concat(colors.bright, "================================").concat(colors.reset, "\n"));
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 20, , 21]);
                    // Load existing gemeente data
                    console.log("".concat(colors.blue, "\uD83D\uDCC1 Loading existing gemeente data...").concat(colors.reset));
                    dataDir = path.join(__dirname, '..', 'data', 'gemeentes');
                    return [4 /*yield*/, fs.readdir(dataDir)];
                case 2:
                    files = _b.sent();
                    jsonFiles = files.filter(function (file) { return file.endsWith('.json'); });
                    if (jsonFiles.length === 0) {
                        throw new Error('No gemeente data files found');
                    }
                    gemeentes = [];
                    _i = 0, jsonFiles_1 = jsonFiles;
                    _b.label = 3;
                case 3:
                    if (!(_i < jsonFiles_1.length)) return [3 /*break*/, 6];
                    file = jsonFiles_1[_i];
                    filePath = path.join(dataDir, file);
                    return [4 /*yield*/, fs.readFile(filePath, 'utf-8')];
                case 4:
                    content = _b.sent();
                    gemeente = JSON.parse(content);
                    gemeentes.push(gemeente);
                    _b.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 3];
                case 6:
                    console.log("".concat(colors.green, "\u2713 Loaded ").concat(gemeentes.length, " gemeente data files").concat(colors.reset, "\n"));
                    // Fetch official boundary data
                    console.log("".concat(colors.blue, "\uD83C\uDF0D Fetching official gemeente boundaries...").concat(colors.reset));
                    return [4 /*yield*/, fetchBoundaries()];
                case 7:
                    boundariesData = _b.sent();
                    console.log("\n".concat(colors.blue, "\uD83D\uDD04 Processing gemeente boundaries...").concat(colors.reset));
                    updatedCount = 0;
                    skippedCount = 0;
                    _a = 0, gemeentes_1 = gemeentes;
                    _b.label = 8;
                case 8:
                    if (!(_a < gemeentes_1.length)) return [3 /*break*/, 18];
                    gemeente = gemeentes_1[_a];
                    console.log("\n".concat(colors.cyan, "Processing: ").concat(gemeente.name).concat(colors.reset));
                    _b.label = 9;
                case 9:
                    _b.trys.push([9, 16, , 17]);
                    newBoundary = null;
                    if (!(gemeente.id === 'zeewolde')) return [3 /*break*/, 12];
                    return [4 /*yield*/, getZeewoldeBoundary()
                        // Add small delay to be nice to APIs
                    ];
                case 10:
                    newBoundary = _b.sent();
                    // Add small delay to be nice to APIs
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 1000); })];
                case 11:
                    // Add small delay to be nice to APIs
                    _b.sent();
                    return [3 /*break*/, 13];
                case 12:
                    matchingFeature = findMatchingBoundary(gemeente, boundariesData);
                    if (matchingFeature) {
                        newBoundary = matchingFeature.geometry;
                        console.log("".concat(colors.green, "\u2713 Found matching boundary in official data").concat(colors.reset));
                    }
                    else {
                        console.log("".concat(colors.yellow, "\u26A0 No matching boundary found, keeping existing").concat(colors.reset));
                        skippedCount++;
                        return [3 /*break*/, 17];
                    }
                    _b.label = 13;
                case 13:
                    if (!newBoundary) return [3 /*break*/, 15];
                    return [4 /*yield*/, updateGemeenteFile(gemeente, newBoundary)];
                case 14:
                    _b.sent();
                    updatedCount++;
                    _b.label = 15;
                case 15: return [3 /*break*/, 17];
                case 16:
                    error_4 = _b.sent();
                    console.log("".concat(colors.red, "\u2717 Error processing ").concat(gemeente.name, ": ").concat(error_4).concat(colors.reset));
                    skippedCount++;
                    return [3 /*break*/, 17];
                case 17:
                    _a++;
                    return [3 /*break*/, 8];
                case 18:
                    // Summary
                    console.log("\n".concat(colors.bright).concat(colors.green, "\uD83C\uDF89 Boundary generation complete!").concat(colors.reset));
                    console.log("".concat(colors.green, "\u2713 Updated: ").concat(updatedCount, " gemeentes").concat(colors.reset));
                    if (skippedCount > 0) {
                        console.log("".concat(colors.yellow, "\u26A0 Skipped: ").concat(skippedCount, " gemeentes").concat(colors.reset));
                    }
                    // Update index file
                    console.log("\n".concat(colors.blue, "\uD83D\uDCDD Updating index file...").concat(colors.reset));
                    return [4 /*yield*/, updateIndexFile(gemeentes)];
                case 19:
                    _b.sent();
                    console.log("".concat(colors.bright).concat(colors.green, "\u2705 All done!").concat(colors.reset));
                    return [3 /*break*/, 21];
                case 20:
                    error_5 = _b.sent();
                    console.log("\n".concat(colors.red, "\u274C Error: ").concat(error_5).concat(colors.reset));
                    process.exit(1);
                    return [3 /*break*/, 21];
                case 21: return [2 /*return*/];
            }
        });
    });
}
/**
 * Updates the main index file
 */
function updateIndexFile(gemeentes) {
    return __awaiter(this, void 0, void 0, function () {
        var indexPath, indexData;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    indexPath = path.join(__dirname, '..', 'data', 'index.json');
                    indexData = {
                        version: '1.0.0',
                        lastGenerated: new Date().toISOString().split('T')[0],
                        total: gemeentes.length,
                        gemeentes: gemeentes.map(function (g) { return ({
                            id: g.id,
                            name: g.name,
                            province: g.province,
                            coordinates: g.coordinates
                        }); })
                    };
                    return [4 /*yield*/, fs.writeFile(indexPath, JSON.stringify(indexData, null, 2))];
                case 1:
                    _a.sent();
                    console.log("".concat(colors.green, "\u2713 Updated index file with ").concat(gemeentes.length, " gemeentes").concat(colors.reset));
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Command line interface
 */
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var args, zeewoldePath, content, zeewolde, newBoundary, error_6, dataDir, files, jsonFiles, validCount, invalidCount, _i, jsonFiles_2, file, filePath, content, gemeente, error_7;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    args = process.argv.slice(2);
                    if (args.includes('--help') || args.includes('-h')) {
                        console.log("\n".concat(colors.bright, "Gemeente Boundary Generator").concat(colors.reset, "\n\nUsage: npm run generate:boundaries [options]\n\nOptions:\n  --help, -h     Show this help message\n  --zeewolde     Only update Zeewolde boundary\n  --validate     Validate existing boundaries without updating\n\nExamples:\n  npm run generate:boundaries\n  npm run generate:boundaries -- --zeewolde\n  npm run generate:boundaries -- --validate\n"));
                        return [2 /*return*/];
                    }
                    if (!args.includes('--zeewolde')) return [3 /*break*/, 7];
                    console.log("".concat(colors.bright).concat(colors.cyan, "\uD83C\uDFAF Updating Zeewolde boundary only").concat(colors.reset, "\n"));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, , 6]);
                    zeewoldePath = path.join(__dirname, '..', 'data', 'gemeentes', 'zeewolde.json');
                    return [4 /*yield*/, fs.readFile(zeewoldePath, 'utf-8')];
                case 2:
                    content = _a.sent();
                    zeewolde = JSON.parse(content);
                    return [4 /*yield*/, getZeewoldeBoundary()
                        // Update file
                    ];
                case 3:
                    newBoundary = _a.sent();
                    // Update file
                    return [4 /*yield*/, updateGemeenteFile(zeewolde, newBoundary)];
                case 4:
                    // Update file
                    _a.sent();
                    console.log("\n".concat(colors.bright).concat(colors.green, "\u2705 Zeewolde boundary updated!").concat(colors.reset));
                    return [3 /*break*/, 6];
                case 5:
                    error_6 = _a.sent();
                    console.log("\n".concat(colors.red, "\u274C Error: ").concat(error_6).concat(colors.reset));
                    process.exit(1);
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
                case 7:
                    if (!args.includes('--validate')) return [3 /*break*/, 16];
                    console.log("".concat(colors.bright).concat(colors.blue, "\uD83D\uDD0D Validating existing boundaries").concat(colors.reset, "\n"));
                    _a.label = 8;
                case 8:
                    _a.trys.push([8, 14, , 15]);
                    dataDir = path.join(__dirname, '..', 'data', 'gemeentes');
                    return [4 /*yield*/, fs.readdir(dataDir)];
                case 9:
                    files = _a.sent();
                    jsonFiles = files.filter(function (file) { return file.endsWith('.json'); });
                    validCount = 0;
                    invalidCount = 0;
                    _i = 0, jsonFiles_2 = jsonFiles;
                    _a.label = 10;
                case 10:
                    if (!(_i < jsonFiles_2.length)) return [3 /*break*/, 13];
                    file = jsonFiles_2[_i];
                    filePath = path.join(dataDir, file);
                    return [4 /*yield*/, fs.readFile(filePath, 'utf-8')];
                case 11:
                    content = _a.sent();
                    gemeente = JSON.parse(content);
                    if (validateBoundary(gemeente.boundaries)) {
                        console.log("".concat(colors.green, "\u2713 ").concat(gemeente.name, " - Valid boundary").concat(colors.reset));
                        validCount++;
                    }
                    else {
                        console.log("".concat(colors.red, "\u2717 ").concat(gemeente.name, " - Invalid boundary").concat(colors.reset));
                        invalidCount++;
                    }
                    _a.label = 12;
                case 12:
                    _i++;
                    return [3 /*break*/, 10];
                case 13:
                    console.log("\n".concat(colors.bright, "Summary:").concat(colors.reset));
                    console.log("".concat(colors.green, "\u2713 Valid: ").concat(validCount).concat(colors.reset));
                    console.log("".concat(colors.red, "\u2717 Invalid: ").concat(invalidCount).concat(colors.reset));
                    return [3 /*break*/, 15];
                case 14:
                    error_7 = _a.sent();
                    console.log("\n".concat(colors.red, "\u274C Error: ").concat(error_7).concat(colors.reset));
                    process.exit(1);
                    return [3 /*break*/, 15];
                case 15: return [2 /*return*/];
                case 16: 
                // Default: generate all boundaries
                return [4 /*yield*/, generateBoundaries()];
                case 17:
                    // Default: generate all boundaries
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Simple boundary validation
 */
function validateBoundary(boundary) {
    if (!boundary || typeof boundary !== 'object') {
        return false;
    }
    if (boundary.type !== 'Polygon' && boundary.type !== 'MultiPolygon') {
        return false;
    }
    if (!boundary.coordinates || !Array.isArray(boundary.coordinates)) {
        return false;
    }
    return boundary.coordinates.length > 0;
}
// Run the script
if (import.meta.url === "file://".concat(process.argv[1])) {
    main().catch(console.error);
}
