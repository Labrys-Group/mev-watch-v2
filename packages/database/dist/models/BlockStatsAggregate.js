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
exports.StatsAggregateModel = exports.StatsAggregate = exports.RelayStat = void 0;
/* eslint-disable max-classes-per-file */
const typegoose_1 = require("@typegoose/typegoose");
const Relayer_1 = require("./Relayer");
class RelayStat {
}
__decorate([
    (0, typegoose_1.prop)({ required: true, ref: () => Relayer_1.Relayer }),
    __metadata("design:type", Object)
], RelayStat.prototype, "relayer", void 0);
__decorate([
    (0, typegoose_1.prop)({ required: true }),
    __metadata("design:type", String)
], RelayStat.prototype, "relayerName", void 0);
__decorate([
    (0, typegoose_1.prop)({ default: null }),
    __metadata("design:type", Boolean)
], RelayStat.prototype, "isOfacCensoring", void 0);
__decorate([
    (0, typegoose_1.prop)({ require: true }),
    __metadata("design:type", Number)
], RelayStat.prototype, "blocks", void 0);
exports.RelayStat = RelayStat;
class StatsAggregate {
}
__decorate([
    (0, typegoose_1.prop)({ required: true }),
    __metadata("design:type", Array)
], StatsAggregate.prototype, "stats", void 0);
__decorate([
    (0, typegoose_1.prop)({ required: true }),
    __metadata("design:type", Date)
], StatsAggregate.prototype, "startDate", void 0);
__decorate([
    (0, typegoose_1.prop)({ required: true, unique: true }),
    __metadata("design:type", Date)
], StatsAggregate.prototype, "ts", void 0);
exports.StatsAggregate = StatsAggregate;
exports.StatsAggregateModel = (0, typegoose_1.getModelForClass)(StatsAggregate);
//# sourceMappingURL=BlockStatsAggregate.js.map