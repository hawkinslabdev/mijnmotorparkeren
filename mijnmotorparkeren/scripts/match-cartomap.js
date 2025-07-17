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
import fs from 'fs';
import path from 'path';
function fetchCartomapData() {
    return __awaiter(this, void 0, void 0, function () {
        var response;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetch('https://cartomap.github.io/nl/wgs84/gemeente_2025.geojson')];
                case 1:
                    response = _a.sent();
                    return [2 /*return*/, response.json()];
            }
        });
    });
}
function normalizeGemeenteName(name) {
    return name
        .replace(/^gemeente\s+/i, '')
        .toLowerCase()
        .trim();
}
function matchGemeenteToCartomap(gemeenteData, cartomapFeatures) {
    var normalizedGemeenteName = normalizeGemeenteName(gemeenteData.name);
    return cartomapFeatures.find(function (feature) {
        var normalizedCartomapName = normalizeGemeenteName(feature.properties.statnaam);
        return normalizedCartomapName === normalizedGemeenteName;
    }) || null;
}
function updateGemeenteData() {
    return __awaiter(this, void 0, void 0, function () {
        var cartomapData, gemeentesDir, files, matchResults, _i, files_1, file, filePath, gemeenteData, match, matched, total;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetchCartomapData()];
                case 1:
                    cartomapData = _a.sent();
                    gemeentesDir = path.join(__dirname, '../data/gemeentes');
                    files = fs.readdirSync(gemeentesDir);
                    matchResults = [];
                    for (_i = 0, files_1 = files; _i < files_1.length; _i++) {
                        file = files_1[_i];
                        if (!file.endsWith('.json'))
                            continue;
                        filePath = path.join(gemeentesDir, file);
                        gemeenteData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                        match = matchGemeenteToCartomap(gemeenteData, cartomapData.features);
                        if (match) {
                            gemeenteData.statcode = match.properties.statcode;
                            if (!gemeenteData.parkingStatus) {
                                gemeenteData.parkingStatus = 'grey';
                            }
                            fs.writeFileSync(filePath, JSON.stringify(gemeenteData, null, 2));
                            matchResults.push({
                                file: file,
                                matched: true,
                                statcode: match.properties.statcode,
                                cartomapName: match.properties.statnaam
                            });
                        }
                        else {
                            matchResults.push({
                                file: file,
                                matched: false
                            });
                        }
                    }
                    console.log('Matching results:');
                    matchResults.forEach(function (result) {
                        if (result.matched) {
                            console.log("\u2713 ".concat(result.file, " \u2192 ").concat(result.statcode, " (").concat(result.cartomapName, ")"));
                        }
                        else {
                            console.log("\u2717 ".concat(result.file, " \u2192 No match found"));
                        }
                    });
                    matched = matchResults.filter(function (r) { return r.matched; }).length;
                    total = matchResults.length;
                    console.log("\nMatched ".concat(matched, "/").concat(total, " gemeentes"));
                    return [2 /*return*/];
            }
        });
    });
}
if (require.main === module) {
    updateGemeenteData().catch(console.error);
}
export { updateGemeenteData, matchGemeenteToCartomap };
