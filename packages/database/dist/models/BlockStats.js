"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockStatsModel = exports.BlockStats = void 0;
const typegoose_1 = require("@typegoose/typegoose");
const Relayer_1 = require("./Relayer");
class BlockStats {
}
__decorate([
    (0, typegoose_1.prop)({ required: true, ref: () => Relayer_1.Relayer }),
    __metadata("design:type", Object)
], BlockStats.prototype, "relayer", void 0);
__decorate([
    (0, typegoose_1.prop)({ required: true, unique: true }),
    __metadata("design:type", Number)
], BlockStats.prototype, "slotNumber", void 0);
__decorate([
    (0, typegoose_1.prop)({ required: true }),
    __metadata("design:type", String)
], BlockStats.prototype, "feeRecipient", void 0);
__decorate([
    (0, typegoose_1.prop)({ required: true }),
    __metadata("design:type", String)
], BlockStats.prototype, "proposerPublicKey", void 0);
__decorate([
    (0, typegoose_1.prop)({ required: true }),
    __metadata("design:type", String)
], BlockStats.prototype, "builderPublicKey", void 0);
__decorate([
    (0, typegoose_1.prop)({ required: true }),
    __metadata("design:type", Number)
], BlockStats.prototype, "gasUsed", void 0);
__decorate([
    (0, typegoose_1.prop)({ required: true }),
    __metadata("design:type", String)
], BlockStats.prototype, "value", void 0);
__decorate([
    (0, typegoose_1.prop)({ required: true }),
    __metadata("design:type", Date)
], BlockStats.prototype, "ts", void 0);
exports.BlockStats = BlockStats;
exports.BlockStatsModel = (0, typegoose_1.getModelForClass)(BlockStats);
//# sourceMappingURL=BlockStats.js.map