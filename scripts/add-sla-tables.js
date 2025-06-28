"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
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
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
var db_1 = require("../server/db");
var drizzle_orm_1 = require("drizzle-orm");
function addSlaTables() {
    return __awaiter(this, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    console.log('Starting SLA tables migration...');
                    // Create sla_plans table
                    console.log('Creating sla_plans table...');
                    return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n      CREATE TABLE IF NOT EXISTS \"sla_plans\" (\n        \"id\" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,\n        \"name\" varchar(256) NOT NULL UNIQUE,\n        \"description\" text,\n        \"response_time_hours\" integer NOT NULL,\n        \"resolution_time_hours\" integer NOT NULL,\n        \"uptime_guarantee_percentage\" integer NOT NULL,\n        \"is_active\" boolean DEFAULT true NOT NULL,\n        \"created_at\" timestamp DEFAULT now() NOT NULL,\n        \"updated_at\" timestamp DEFAULT now() NOT NULL\n      );\n    "], ["\n      CREATE TABLE IF NOT EXISTS \"sla_plans\" (\n        \"id\" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,\n        \"name\" varchar(256) NOT NULL UNIQUE,\n        \"description\" text,\n        \"response_time_hours\" integer NOT NULL,\n        \"resolution_time_hours\" integer NOT NULL,\n        \"uptime_guarantee_percentage\" integer NOT NULL,\n        \"is_active\" boolean DEFAULT true NOT NULL,\n        \"created_at\" timestamp DEFAULT now() NOT NULL,\n        \"updated_at\" timestamp DEFAULT now() NOT NULL\n      );\n    "]))))];
                case 1:
                    _a.sent();
                    // Add sla_id to package_pricing
                    console.log('Adding sla_id to package_pricing table...');
                    return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_2 || (templateObject_2 = __makeTemplateObject(["\n      ALTER TABLE \"package_pricing\"\n      ADD COLUMN \"sla_id\" uuid REFERENCES \"sla_plans\"(\"id\") ON DELETE SET NULL;\n    "], ["\n      ALTER TABLE \"package_pricing\"\n      ADD COLUMN \"sla_id\" uuid REFERENCES \"sla_plans\"(\"id\") ON DELETE SET NULL;\n    "]))))];
                case 2:
                    _a.sent();
                    // Add sla_id to server_power_status
                    console.log('Adding sla_id to server_power_status table...');
                    return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_3 || (templateObject_3 = __makeTemplateObject(["\n      ALTER TABLE \"server_power_status\"\n      ADD COLUMN \"sla_id\" uuid REFERENCES \"sla_plans\"(\"id\") ON DELETE SET NULL;\n    "], ["\n      ALTER TABLE \"server_power_status\"\n      ADD COLUMN \"sla_id\" uuid REFERENCES \"sla_plans\"(\"id\") ON DELETE SET NULL;\n    "]))))];
                case 3:
                    _a.sent();
                    console.log('✅ SLA tables migration completed successfully!');
                    process.exit(0);
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _a.sent();
                    console.error('❌ Failed to migrate SLA tables:', error_1);
                    process.exit(1);
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    });
}
// Run the migration
addSlaTables();
var templateObject_1, templateObject_2, templateObject_3;
