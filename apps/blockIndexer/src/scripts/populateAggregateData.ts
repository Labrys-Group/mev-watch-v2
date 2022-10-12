import { DATE_OF_MERGE } from "consts";
import { connect } from "database/dist";

import { recursivelyPopulateAggregateData } from "../helpers/aggregation/recursivelyPopulateAggregateData";

const main = async () => {
  await connect();

  await recursivelyPopulateAggregateData(DATE_OF_MERGE);

  process.exit(0);
};

main();
