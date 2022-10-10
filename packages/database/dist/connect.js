"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connect = void 0;
const path_1 = __importDefault(require("path"));
const dotenv_1 = require("dotenv");
const mongoose_1 = __importDefault(require("mongoose"));
(0, dotenv_1.config)({ path: path_1.default.resolve(__dirname, "../.env") });
const connect = () => __awaiter(void 0, void 0, void 0, function* () {
    if (!process.env.MONGO_URI)
        throw new Error("Missing Mongo DB Uri connection string");
    if (!mongoose_1.default.connections[0].readyState) {
        yield mongoose_1.default.connect(process.env.MONGO_URI);
    }
    console.log("MongoDB connected");
});
exports.connect = connect;
//# sourceMappingURL=connect.js.map